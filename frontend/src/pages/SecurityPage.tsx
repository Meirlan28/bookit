import { KeyRound, Laptop, LogOut, MailCheck, MapPin, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';

import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/PageState';
import { useAuth } from '../features/auth/use-auth';
import { useSessions, useTerminateOtherSessions } from '../features/sessions/sessions-api';
import { formatDate } from '../lib/date';
import { parseUserAgent } from '../lib/user-agent';

export function SecurityPage() {
  const { user, logout } = useAuth();
  const sessionsQuery = useSessions();
  const terminateMutation = useTerminateOtherSessions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sessions = useMemo(() => [...(sessionsQuery.data ?? [])].sort((a, b) => +new Date(b.last_activity) - +new Date(a.last_activity)), [sessionsQuery.data]);

  const terminateOthers = async () => {
    try {
      await terminateMutation.mutateAsync();
      toast.success('Другие сессии завершены', { description: 'На остальных устройствах потребуется войти заново.' });
      setConfirmOpen(false);
    } catch {
      toast.error('Не удалось завершить сессии');
    }
  };

  return (
    <div className="page security-page">
      <header className="page-header"><div><p className="eyebrow">Аккаунт и доступ</p><h1>Безопасность</h1><p>Проверяйте устройства и управляйте активными входами.</p></div><Button variant="secondary" icon={<LogOut size={17} />} onClick={() => void logout()}>Выйти</Button></header>
      <div className="security-grid">
        <aside className="profile-card">
          <div className="profile-card__cover"><span className="profile-card__avatar">{user?.email.slice(0, 1).toUpperCase()}</span></div>
          <div className="profile-card__body"><span className="status-badge status-badge--verified"><MailCheck size={14} /> Email подтверждён</span><h2>{user?.email.split('@')[0]}</h2><p>{user?.email}</p><dl><div><dt><UserRound size={16} /> Роль</dt><dd>{user?.role === 'admin' ? 'Администратор' : 'Участник'}</dd></div><div><dt><ShieldCheck size={16} /> Статус</dt><dd>{user?.is_active ? 'Активен' : 'Отключён'}</dd></div></dl>{user?.role === 'admin' && <Link className="admin-link" to="/admin">Открыть админ-панель <Settings2 size={15} /></Link>}</div>
        </aside>
        <section className="sessions-card">
          <div className="sessions-card__heading"><div><p className="eyebrow">Контроль входов</p><h2>Активные сессии</h2><p>Устройства, на которых сейчас открыт ваш аккаунт.</p></div>{sessions.length > 1 && <Button variant="secondary" size="sm" icon={<KeyRound size={16} />} onClick={() => setConfirmOpen(true)}>Завершить остальные</Button>}</div>
          {sessionsQuery.isError ? <ErrorState onRetry={() => void sessionsQuery.refetch()} /> : sessionsQuery.isPending ? <div className="session-list"><Skeleton className="skeleton--session" /><Skeleton className="skeleton--session" /></div> : sessions.length ? <div className="session-list">{sessions.map((session, index) => { const device = parseUserAgent(session.user_agent); const Icon = device.Icon; return <article className="session-item" key={session.id}><span className="session-item__icon"><Icon size={22} /></span><div className="session-item__body"><div><strong>{device.browser} · {device.system}</strong>{index === 0 && <span className="status-badge status-badge--current">Недавно активна</span>}</div><p><MapPin size={14} /> {session.ip_address || 'IP не определён'} · Активность {formatDate(session.last_activity, 'd MMM, HH:mm')}</p><small>Доступ до {formatDate(session.expires_at, 'd MMMM, HH:mm')}</small></div></article>; })}</div> : <EmptyState icon={Laptop} title="Активных сессий нет" description="После следующего входа устройство появится в этом списке." />}
          <div className="security-note"><ShieldCheck size={18} /><div><strong>Не узнаёте устройство?</strong><p>Завершите другие сессии и сбросьте пароль. Текущий access-токен на другом устройстве может действовать ещё до 15 минут.</p></div></div>
        </section>
      </div>
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => void terminateOthers()} loading={terminateMutation.isPending} title="Завершить другие сессии?" description="Все устройства, кроме текущего, потеряют refresh-доступ. На них потребуется войти заново." confirmLabel="Завершить сессии" />
    </div>
  );
}
