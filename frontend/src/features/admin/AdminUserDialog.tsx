import { ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/Button';
import { FieldShell } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../lib/api-client';
import type { UserRole } from '../../types/api';
import { useUpdateAdminUser } from './admin-api';
import type { AdminUser, AdminUserPatch } from './admin-types';

interface AdminUserDialogProps {
  user: AdminUser;
  isCurrentUser: boolean;
  onClose: () => void;
}

export function AdminUserDialog({ user, isCurrentUser, onClose }: AdminUserDialogProps) {
  const mutation = useUpdateAdminUser();
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [serverError, setServerError] = useState<string | null>(null);
  const hasChanges = role !== user.role || isActive !== user.is_active;

  const save = async () => {
    const input: AdminUserPatch = {};
    if (role !== user.role) input.role = role;
    if (isActive !== user.is_active) input.is_active = isActive;
    if (!Object.keys(input).length) return;

    setServerError(null);
    try {
      await mutation.mutateAsync({ userId: user.id, input });
      toast.success('Доступ пользователя обновлён', {
        description: `${user.email}: новые настройки применены.`,
      });
      onClose();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Не удалось обновить пользователя.');
    }
  };

  return (
    <Modal open onClose={onClose} title="Настройки доступа" eyebrow="Пользователь" size="sm">
      <div className="admin-user-dialog">
        <div className="admin-user-dialog__identity">
          <span>{user.email.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.email}</strong><small>Пользователь #{user.id}</small></div>
        </div>

        <FieldShell label="Роль" htmlFor="admin-user-role">
          <div className="admin-select-wrap">
            <ShieldCheck size={17} />
            <select
              id="admin-user-role"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              disabled={isCurrentUser || mutation.isPending}
            >
              <option value="user">Участник</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
        </FieldShell>

        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={isCurrentUser || mutation.isPending}
          />
          <span className="admin-toggle__control" aria-hidden />
          <span><strong>Аккаунт активен</strong><small>Разрешить вход и работу с бронированиями</small></span>
        </label>

        {isCurrentUser && (
          <div className="admin-dialog-note">
            <UserRound size={17} />
            <span>Собственную роль и активность нельзя менять из текущей сессии.</span>
          </div>
        )}
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}

        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
          <Button onClick={() => void save()} loading={mutation.isPending} disabled={!hasChanges || isCurrentUser}>
            Сохранить доступ
          </Button>
        </div>
      </div>
    </Modal>
  );
}

