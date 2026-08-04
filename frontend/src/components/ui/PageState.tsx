import type { LucideIcon } from 'lucide-react';
import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';

import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="page-state">
      <div className="page-state__icon"><Icon size={25} aria-hidden /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Что-то пошло не так',
  description = 'Не удалось загрузить данные. Проверьте соединение и попробуйте снова.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="page-state page-state--error">
      <div className="page-state__icon"><CircleAlert size={25} aria-hidden /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <Button variant="secondary" icon={<RefreshCw size={17} />} onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
