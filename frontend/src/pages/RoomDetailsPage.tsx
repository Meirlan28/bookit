import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Info, Presentation, ShieldCheck, Users, View } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { toast } from 'sonner';

import { Button } from '../components/ui/Button';
import { FieldShell, Input } from '../components/ui/FormField';
import { ErrorState, Skeleton } from '../components/ui/PageState';
import { useCreateBooking } from '../features/bookings/bookings-api';
import { AmenityList, RoomArtwork } from '../features/rooms/RoomCard';
import { useRoom } from '../features/rooms/rooms-api';
import { ApiError } from '../lib/api-client';
import { formatDuration, getDefaultBookingRange, toDateTimeLocal } from '../lib/date';

export function RoomDetailsPage() {
  const params = useParams();
  const roomId = Number(params.roomId);
  const roomQuery = useRoom(roomId);
  const mutation = useCreateBooking(roomId);
  const [, navigate] = useLocation();
  const [defaults] = useState(() => getDefaultBookingRange());
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [formError, setFormError] = useState<string | null>(null);
  const minDate = toDateTimeLocal(new Date());

  const duration = start && end && new Date(end) > new Date(start) ? formatDuration(new Date(start), new Date(end)) : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!start || !end || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) { setFormError('Выберите дату и время начала и окончания.'); return; }
    if (startDate <= new Date()) { setFormError('Начало встречи должно быть в будущем.'); return; }
    if (endDate <= startDate) { setFormError('Время окончания должно быть позже начала.'); return; }
    try {
      await mutation.mutateAsync({ start_time: startDate.toISOString(), end_time: endDate.toISOString() });
      toast.success('Переговорная забронирована', { description: `${roomQuery.data?.name ?? 'Комната'} · ${duration ?? ''}` });
      void navigate('/bookings', { state: { created: true } });
    } catch (error) {
      setFormError(error instanceof ApiError && error.status === 409 ? 'Этот интервал уже занят. Выберите другое время — введённые данные сохранены.' : error instanceof ApiError ? error.message : 'Не удалось создать бронирование.');
    }
  };

  if (!Number.isInteger(roomId) || roomId < 1) return <div className="page"><ErrorState title="Комната не найдена" description="Проверьте адрес или вернитесь в каталог." /></div>;
  if (roomQuery.isPending) return <div className="page room-details-page"><Skeleton className="skeleton--room-hero" /><Skeleton className="skeleton--booking-panel" /></div>;
  if (roomQuery.isError || !roomQuery.data) return <div className="page"><ErrorState title="Комната не найдена" description="Возможно, она была удалена или ссылка устарела." onRetry={() => void roomQuery.refetch()} /><div className="center-link"><Link to="/rooms">Вернуться в каталог</Link></div></div>;

  const room = roomQuery.data;
  return (
    <div className="page room-details-page">
      <Link className="back-link" to="/rooms"><ArrowLeft size={17} /> Все переговорные</Link>
      <div className="room-details-grid">
        <div className="room-details-main">
          <RoomArtwork room={room} />
          <div className="room-details-title"><div><p className="eyebrow">Переговорная · #{String(room.id).padStart(2, '0')}</p><h1>{room.name}</h1><p>{room.description || 'Светлое и удобное пространство для совместной работы, встреч и презентаций.'}</p></div><span className="status-badge status-badge--available"><span className="status-dot" /> Открыта для брони</span></div>
          <AmenityList room={room} />
          <section className="room-details-section"><p className="eyebrow">Возможности</p><h2>Всё для продуктивной встречи</h2><div className="feature-grid"><article><span><Users size={20} /></span><div><strong>До {room.capacity} человек</strong><p>Комфортная рассадка для всей команды.</p></div></article><article><span><Presentation size={20} /></span><div><strong>{room.has_projector ? 'Проектор доступен' : 'Без проектора'}</strong><p>{room.has_projector ? 'Подключайте презентацию или видеозвонок.' : 'Подходит для камерных встреч без экрана.'}</p></div></article><article><span><View size={20} /></span><div><strong>{room.has_whiteboard ? 'Маркерная доска' : 'Чистое пространство'}</strong><p>{room.has_whiteboard ? 'Фиксируйте идеи прямо во время обсуждения.' : 'Ничего лишнего — только разговор и решения.'}</p></div></article></div></section>
        </div>

        <aside className="booking-panel">
          <div className="booking-panel__heading"><span className="booking-panel__icon"><CalendarDays size={21} /></span><div><p className="eyebrow">Новая встреча</p><h2>Выберите время</h2></div></div>
          <form onSubmit={(event) => void submit(event)}>
            <FieldShell label="Начало" htmlFor="start"><Input id="start" type="datetime-local" min={minDate} value={start} onChange={(event) => setStart(event.target.value)} /></FieldShell>
            <FieldShell label="Окончание" htmlFor="end"><Input id="end" type="datetime-local" min={start || minDate} value={end} onChange={(event) => setEnd(event.target.value)} /></FieldShell>
            {duration && <div className="duration-summary"><Clock3 size={17} /><span>Продолжительность</span><strong>{duration}</strong></div>}
            <div className="timezone-note"><Info size={16} /><span>Время указано в вашей локальной таймзоне: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong></span></div>
            {formError && <div className="form-alert form-alert--error" role="alert">{formError}</div>}
            <Button type="submit" size="lg" fullWidth loading={mutation.isPending} icon={<CheckCircle2 size={18} />}>Забронировать</Button>
          </form>
          <div className="booking-panel__trust"><ShieldCheck size={17} /><p><strong>Без мгновенного списания</strong><span>Слот подтвердится после проверки пересечений.</span></p></div>
        </aside>
      </div>
    </div>
  );
}
