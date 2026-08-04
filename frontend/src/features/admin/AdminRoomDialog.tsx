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
import type { Room } from '../../types/api';
import { useCreateAdminRoom, useUpdateAdminRoom } from './admin-api';

const roomSchema = z.object({
  name: z.string().trim().min(2, 'Введите название').max(100, 'Максимум 100 символов'),
  capacity: z.number().int().min(1, 'Минимум 1 человек').max(200, 'Максимум 200 человек'),
  description: z.string().trim().max(500, 'Максимум 500 символов'),
  has_projector: z.boolean(),
  has_whiteboard: z.boolean(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface AdminRoomDialogProps {
  room: Room | null;
  onClose: () => void;
}

export function AdminRoomDialog({ room, onClose }: AdminRoomDialogProps) {
  const createMutation = useCreateAdminRoom();
  const updateMutation = useUpdateAdminRoom();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(room);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { register, handleSubmit, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: room?.name ?? '',
      capacity: room?.capacity ?? 6,
      description: room?.description ?? '',
      has_projector: room?.has_projector ?? true,
      has_whiteboard: room?.has_whiteboard ?? false,
    },
  });

  const close = () => {
    if (!isPending) onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const input = { ...values, description: values.description || null };

    try {
      if (room) {
        await updateMutation.mutateAsync({ roomId: room.id, input });
        toast.success('Переговорная обновлена', {
          description: `${values.name}: изменения уже видны в каталоге.`,
        });
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Переговорная добавлена', {
          description: `${values.name} уже доступна команде.`,
        });
      }
      onClose();
    } catch (error) {
      setServerError(
        error instanceof ApiError && (error.status === 400 || error.status === 409)
          ? 'Проверьте данные: возможно, комната с таким названием уже существует.'
          : error instanceof ApiError
            ? error.message
            : 'Не удалось сохранить переговорную.',
      );
    }
  });

  return (
    <Modal
      open
      onClose={close}
      title={isEditing ? 'Редактировать комнату' : 'Новая переговорная'}
      eyebrow="Управление пространством"
      size="md"
    >
      <form className="room-form" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div className="form-grid form-grid--two">
          <FieldShell label="Название" htmlFor="admin-room-name" error={errors.name?.message}>
            <Input
              id="admin-room-name"
              placeholder="Например, Алатау"
              leadingIcon={<Building2 size={18} />}
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </FieldShell>
          <FieldShell label="Вместимость" htmlFor="admin-room-capacity" error={errors.capacity?.message}>
            <Input
              id="admin-room-capacity"
              type="number"
              min={1}
              max={200}
              leadingIcon={<Users size={18} />}
              invalid={Boolean(errors.capacity)}
              {...register('capacity', { valueAsNumber: true })}
            />
          </FieldShell>
        </div>
        <FieldShell
          label="Описание"
          htmlFor="admin-room-description"
          error={errors.description?.message}
          hint="До 500 символов"
        >
          <Textarea
            id="admin-room-description"
            rows={4}
            placeholder="Для каких встреч подходит эта комната?"
            invalid={Boolean(errors.description)}
            {...register('description')}
          />
        </FieldShell>
        <fieldset className="amenity-options">
          <legend>Оснащение</legend>
          <label className="check-card">
            <input type="checkbox" {...register('has_projector')} />
            <span className="check-card__control"><Presentation size={19} /></span>
            <span><strong>Проектор</strong><small>Для презентаций и звонков</small></span>
          </label>
          <label className="check-card">
            <input type="checkbox" {...register('has_whiteboard')} />
            <span className="check-card__control"><View size={19} /></span>
            <span><strong>Маркерная доска</strong><small>Для схем и совместной работы</small></span>
          </label>
        </fieldset>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={close} disabled={isPending}>Отмена</Button>
          <Button type="submit" loading={isPending}>{isEditing ? 'Сохранить' : 'Добавить комнату'}</Button>
        </div>
      </form>
    </Modal>
  );
}

