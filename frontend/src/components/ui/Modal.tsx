import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  size = 'md',
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal" role="presentation">
      <button
        className="modal__backdrop"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`modal__panel modal__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">
            <X size={19} aria-hidden />
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
