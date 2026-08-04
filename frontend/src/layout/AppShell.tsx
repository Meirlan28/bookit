import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'wouter';

import { useAuth } from '../features/auth/use-auth';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';

const navigation = [
  { to: '/dashboard', label: 'Обзор', Icon: LayoutDashboard },
  { to: '/rooms', label: 'Переговорные', Icon: Building2 },
  { to: '/bookings', label: 'Мои встречи', Icon: CalendarDays },
  { to: '/security', label: 'Безопасность', Icon: ShieldCheck },
];

const adminNavigationItem = { to: '/admin', label: 'Админка', Icon: Settings2 };

function Navigation({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const items = isAdmin ? [...navigation, adminNavigationItem] : navigation;
  return (
    <nav className="app-nav" aria-label="Основная навигация">
      {items.map(({ to, label, Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={(isActive) => `app-nav__link${isActive ? ' is-active' : ''}`}
        >
          <Icon size={20} strokeWidth={1.8} aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const emailName = user?.email.split('@')[0] ?? 'Пользователь';
  const initial = emailName.slice(0, 1).toUpperCase();
  const isAdmin = user?.role === 'admin';
  const mobileNavigation = isAdmin ? [...navigation, adminNavigationItem] : navigation;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="sidebar__workspace">
          <span className="sidebar__workspace-icon"><BookOpenCheck size={17} /></span>
          <div><small>Рабочее пространство</small><strong>BookIt Office</strong></div>
        </div>
        <Navigation isAdmin={isAdmin} />
        <div className="sidebar__footer">
          <div className="sidebar__profile">
            <span className="avatar">{initial}</span>
            <div><strong>{emailName}</strong><small>{user?.role === 'admin' ? 'Администратор' : 'Участник команды'}</small></div>
          </div>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Выйти">
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <Logo />
        <button className="icon-button" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Открыть меню">
          <Menu size={21} />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <button className="mobile-drawer__backdrop" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Закрыть меню" />
          <div className="mobile-drawer__panel">
            <div className="mobile-drawer__header"><Logo /><button className="icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Закрыть"><X size={20} /></button></div>
            <Navigation isAdmin={isAdmin} onNavigate={() => setMobileMenuOpen(false)} />
            <Button variant="secondary" icon={<LogOut size={18} />} onClick={() => void logout()} fullWidth>Выйти из аккаунта</Button>
          </div>
        </div>
      )}

      <div className="app-shell__body">
        <div className="desktop-topbar">
          <p>{format(new Date(), 'EEEE, d MMMM', { locale: ru })}</p>
          <div className="desktop-topbar__identity">
            <span className="status-dot" />
            <span>{user?.email}</span>
          </div>
        </div>
        <main className="app-main">{children}</main>
      </div>

      <nav className={`mobile-nav${isAdmin ? ' mobile-nav--admin' : ''}`} aria-label="Мобильная навигация">
        {mobileNavigation.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className={(isActive) => isActive ? 'is-active' : ''}>
            <Icon size={20} /><span>{label === 'Переговорные' ? 'Комнаты' : label === 'Мои встречи' ? 'Встречи' : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
