import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';

import { ErrorState, Skeleton } from '../../components/ui/PageState';
import { useAdminStats } from './admin-api';
import type { AdminSection } from './admin-types';

interface Metric {
  label: string;
  value: number;
  hint: string;
  Icon: LucideIcon;
  tone: 'lime' | 'violet' | 'blue' | 'warm';
}

function percentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function AdminOverview({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const statsQuery = useAdminStats();

  if (statsQuery.isError) {
    return <ErrorState title="Статистика недоступна" description="Не удалось получить сводку. Попробуйте обновить данные." onRetry={() => void statsQuery.refetch()} />;
  }

  if (statsQuery.isPending) {
    return (
      <div className="admin-overview" aria-label="Загружаем статистику">
        <div className="admin-metrics-grid">
          {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="skeleton--admin-metric" />)}
        </div>
        <div className="admin-insights-grid"><Skeleton className="skeleton--admin-insight" /><Skeleton className="skeleton--admin-insight" /></div>
      </div>
    );
  }

  const stats = statsQuery.data;
  const metrics: Metric[] = [
    { label: 'Всего пользователей', value: stats.total_users, hint: 'зарегистрировано', Icon: Users, tone: 'violet' },
    { label: 'Активные аккаунты', value: stats.active_users, hint: `${percentage(stats.active_users, stats.total_users)}% от всех`, Icon: UserCheck, tone: 'lime' },
    { label: 'Email подтверждён', value: stats.verified_users, hint: `${percentage(stats.verified_users, stats.total_users)}% аудитории`, Icon: BadgeCheck, tone: 'blue' },
    { label: 'Переговорные', value: stats.total_rooms, hint: 'в каталоге', Icon: Building2, tone: 'warm' },
    { label: 'Все бронирования', value: stats.total_bookings, hint: 'за всё время', Icon: CalendarDays, tone: 'violet' },
    { label: 'Предстоят', value: stats.upcoming_bookings, hint: 'запланировано', Icon: Clock3, tone: 'lime' },
    { label: 'Сегодня', value: stats.bookings_today, hint: 'встреч в расписании', Icon: CalendarCheck2, tone: 'blue' },
  ];
  const activePercent = percentage(stats.active_users, stats.total_users);
  const verifiedPercent = percentage(stats.verified_users, stats.total_users);
  const upcomingPercent = percentage(stats.upcoming_bookings, stats.total_bookings);

  return (
    <div className="admin-overview">
      <section className="admin-metrics-grid" aria-label="Ключевые показатели">
        {metrics.map(({ label, value, hint, Icon, tone }) => (
          <article className={`admin-metric admin-metric--${tone}`} key={label}>
            <span className="admin-metric__icon"><Icon size={20} /></span>
            <div><strong>{value.toLocaleString('ru-RU')}</strong><span>{label}</span><small>{hint}</small></div>
          </article>
        ))}
      </section>

      <section className="admin-insights-grid">
        <article className="admin-insight-card">
          <div className="admin-insight-card__heading">
            <span><ShieldCheck size={19} /></span>
            <div><p className="eyebrow">Здоровье аудитории</p><h2>Доступ и верификация</h2></div>
          </div>
          <div className="admin-progress-list">
            <div>
              <div><span>Активные аккаунты</span><strong>{activePercent}%</strong></div>
              <span className="admin-progress"><i style={{ width: `${activePercent}%` }} /></span>
            </div>
            <div>
              <div><span>Подтверждённые email</span><strong>{verifiedPercent}%</strong></div>
              <span className="admin-progress admin-progress--violet"><i style={{ width: `${verifiedPercent}%` }} /></span>
            </div>
          </div>
          <button type="button" className="admin-text-action" onClick={() => onNavigate('users')}>Управлять пользователями <span>→</span></button>
        </article>

        <article className="admin-insight-card admin-insight-card--dark">
          <div className="admin-insight-card__heading">
            <span><Activity size={19} /></span>
            <div><p className="eyebrow">Пульс пространства</p><h2>Нагрузка на переговорные</h2></div>
          </div>
          <div className="admin-booking-pulse">
            <div><strong>{stats.upcoming_bookings}</strong><span>будущих встреч</span></div>
            <div><strong>{stats.bookings_today}</strong><span>встреч сегодня</span></div>
            <span className="admin-booking-pulse__ring" style={{ '--progress': `${upcomingPercent * 3.6}deg` } as React.CSSProperties}><i>{upcomingPercent}%</i></span>
          </div>
          <div className="admin-insight-actions">
            <button type="button" onClick={() => onNavigate('bookings')}>Открыть расписание</button>
            <button type="button" onClick={() => onNavigate('rooms')}>Управлять комнатами</button>
          </div>
        </article>
      </section>
    </div>
  );
}

