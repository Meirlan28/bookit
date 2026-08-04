import {
  Building2,
  CalendarRange,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/Button';
import { adminKeys } from '../features/admin/admin-api';
import { AdminBookings } from '../features/admin/AdminBookings';
import { AdminOverview } from '../features/admin/AdminOverview';
import { AdminRooms } from '../features/admin/AdminRooms';
import type { AdminSection } from '../features/admin/admin-types';
import { AdminUsers } from '../features/admin/AdminUsers';
import { roomKeys } from '../features/rooms/rooms-api';

const tabs = [
  { id: 'overview', label: 'Обзор', Icon: LayoutDashboard },
  { id: 'rooms', label: 'Комнаты', Icon: Building2 },
  { id: 'bookings', label: 'Бронирования', Icon: CalendarRange },
  { id: 'users', label: 'Пользователи', Icon: Users },
] satisfies Array<{ id: AdminSection; label: string; Icon: typeof LayoutDashboard }>;

export function AdminPage() {
  const [section, setSection] = useState<AdminSection>('overview');
  const queryClient = useQueryClient();
  const adminFetching = useIsFetching({ queryKey: adminKeys.root });
  const roomsFetching = useIsFetching({ queryKey: roomKeys.all });
  const isRefreshing = adminFetching > 0 || (section === 'rooms' && roomsFetching > 0);

  const refresh = async () => {
    const requests = [queryClient.invalidateQueries({ queryKey: adminKeys.root })];
    if (section === 'rooms') requests.push(queryClient.invalidateQueries({ queryKey: roomKeys.all }));
    await Promise.all(requests);
  };

  return (
    <div className="page admin-page">
      <header className="admin-page__hero">
        <div className="admin-page__hero-copy">
          <span className="admin-page__shield"><ShieldCheck size={23} /></span>
          <div><p className="eyebrow">Центр управления</p><h1>Админ-панель</h1><p>Вся операционная картина BookIt — от загрузки переговорных до доступа команды.</p></div>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={17} />} loading={isRefreshing} onClick={() => void refresh()}>Обновить данные</Button>
      </header>

      <nav className="admin-tabs" role="tablist" aria-label="Разделы админ-панели">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`admin-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={section === id}
            aria-controls={`admin-panel-${id}`}
            className={section === id ? 'is-active' : ''}
            onClick={() => setSection(id)}
          >
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <div id={`admin-panel-${section}`} role="tabpanel" aria-labelledby={`admin-tab-${section}`} className="admin-page__content">
        {section === 'overview' && <AdminOverview onNavigate={setSection} />}
        {section === 'rooms' && <AdminRooms />}
        {section === 'bookings' && <AdminBookings />}
        {section === 'users' && <AdminUsers />}
      </div>
    </div>
  );
}

