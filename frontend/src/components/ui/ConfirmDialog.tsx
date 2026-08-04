import { AlertTriangle } from 'lucide-react';

import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
  tone = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="confirm-dialog">
        <div className="confirm-dialog__icon"><AlertTriangle size={24} /></div>
        <p>{description}</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Не сейчас</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
