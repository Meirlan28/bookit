import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Presentation, Users, View } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { FieldShell, Input, Textarea } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../lib/api-client';
import { useCreateRoom } from './rooms-api';

const schema = z.object({
  name: z.string().trim().min(2, 'Введите название').max(100, 'Максимум 100 символов'),
  capacity: z.number().int().min(1, 'Минимум 1 человек').max(200, 'Максимум 200 человек'),
  description: z.string().trim().max(500, 'Максимум 500 символов'),
  has_projector: z.boolean(),
  has_whiteboard: z.boolean(),
});

type Values = z.infer<typeof schema>;

export function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateRoom();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', capacity: 6, description: '', has_projector: true, has_whiteboard: false },
  });

  const close = () => {
    if (mutation.isPending) return;
    setServerError(null);
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await mutation.mutateAsync({ ...values, description: values.description || null });
      toast.success('Переговорная добавлена', { description: `${values.name} уже появилась в каталоге.` });
      close();
    } catch (error) {
      setServerError(error instanceof ApiError && error.status === 400 ? 'Комната с таким названием уже существует.' : error instanceof ApiError ? error.message : 'Не удалось создать комнату.');
    }
  });

  return (
    <Modal open={open} onClose={close} title="Новая переговорная" eyebrow="Управление пространством" size="md">
      <form className="room-form" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div className="form-grid form-grid--two">
          <FieldShell label="Название" htmlFor="room-name" error={errors.name?.message}>
            <Input id="room-name" placeholder="Например, Алатау" leadingIcon={<Building2 size={18} />} invalid={Boolean(errors.name)} {...register('name')} />
          </FieldShell>
          <FieldShell label="Вместимость" htmlFor="room-capacity" error={errors.capacity?.message}>
            <Input id="room-capacity" type="number" min={1} max={200} leadingIcon={<Users size={18} />} invalid={Boolean(errors.capacity)} {...register('capacity', { valueAsNumber: true })} />
          </FieldShell>
        </div>
        <FieldShell label="Описание" htmlFor="room-description" error={errors.description?.message} hint="До 500 символов">
          <Textarea id="room-description" rows={4} placeholder="Расскажите, для каких встреч подходит эта комната…" invalid={Boolean(errors.description)} {...register('description')} />
        </FieldShell>
        <fieldset className="amenity-options">
          <legend>Оснащение</legend>
          <label className="check-card"><input type="checkbox" {...register('has_projector')} /><span className="check-card__control"><Presentation size={19} /></span><span><strong>Проектор</strong><small>Для презентаций и звонков</small></span></label>
          <label className="check-card"><input type="checkbox" {...register('has_whiteboard')} /><span className="check-card__control"><View size={19} /></span><span><strong>Маркерная доска</strong><small>Для схем и совместной работы</small></span></label>
        </fieldset>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <div className="modal-actions"><Button variant="ghost" onClick={close} disabled={mutation.isPending}>Отмена</Button><Button type="submit" loading={mutation.isPending}>Добавить комнату</Button></div>
      </form>
    </Modal>
  );
}
