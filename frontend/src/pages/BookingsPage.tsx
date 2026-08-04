import { CalendarDays, History, Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/PageState';
import { BookingCard } from '../features/bookings/BookingCard';
import { useBookings, useDeleteBooking } from '../features/bookings/bookings-api';
import { useRooms } from '../features/rooms/rooms-api';
import type { Booking } from '../types/api';

type Tab = 'upcoming' | 'past';

export function BookingsPage() {
  const bookingsQuery = useBookings();
  const roomsQuery = useRooms();
  const deleteMutation = useDeleteBooking();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const roomById = useMemo(() => new Map((roomsQuery.data ?? []).map((room) => [room.id, room])), [roomsQuery.data]);
  const [now] = useState(() => Date.now());
  const upcoming = (bookingsQuery.data ?? []).filter((booking) => new Date(booking.end_time).getTime() > now).sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
  const past = (bookingsQuery.data ?? []).filter((booking) => new Date(booking.end_time).getTime() <= now).sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  const visible = tab === 'upcoming' ? upcoming : past;

  const cancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      await deleteMutation.mutateAsync(bookingToCancel.id);
      toast.success('Бронирование отменено');
      setBookingToCancel(null);
    } catch {
      toast.error('Не удалось отменить бронирование', { description: 'Обновите страницу и попробуйте ещё раз.' });
    }
  };

  return (
    <div className="page bookings-page">
      <header className="page-header"><div><p className="eyebrow">Личное расписание</p><h1>Мои встречи</h1><p>Все бронирования — будущие и уже завершённые.</p></div><Link className="button button--primary button--md" to="/rooms"><Plus size={18} /><span>Новая встреча</span></Link></header>
      <div className="booking-overview"><div><span className="booking-overview__icon booking-overview__icon--primary"><CalendarDays size={21} /></span><div><strong>{upcoming.length}</strong><p>предстоящих</p></div></div><div><span className="booking-overview__icon booking-overview__icon--muted"><History size={21} /></span><div><strong>{past.length}</strong><p>в истории</p></div></div><div className="booking-overview__hint"><Sparkles size={17} /><span>Планируйте заранее — так легче найти идеальное время.</span></div></div>
      <div className="tabs" role="tablist" aria-label="Тип бронирований"><button role="tab" type="button" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'is-active' : ''} onClick={() => setTab('upcoming')}>Предстоящие <span>{upcoming.length}</span></button><button role="tab" type="button" aria-selected={tab === 'past'} className={tab === 'past' ? 'is-active' : ''} onClick={() => setTab('past')}>История <span>{past.length}</span></button></div>
      {bookingsQuery.isError ? <ErrorState onRetry={() => void bookingsQuery.refetch()} /> : bookingsQuery.isPending || roomsQuery.isPending ? <div className="booking-list booking-list--page"><Skeleton className="skeleton--booking-lg" /><Skeleton className="skeleton--booking-lg" /><Skeleton className="skeleton--booking-lg" /></div> : visible.length ? <div className="booking-list booking-list--page">{visible.map((booking) => <BookingCard key={booking.id} booking={booking} room={roomById.get(booking.room_id)} onCancel={tab === 'upcoming' ? setBookingToCancel : undefined} />)}</div> : <EmptyState icon={tab === 'upcoming' ? CalendarDays : History} title={tab === 'upcoming' ? 'В расписании пока свободно' : 'История пока пуста'} description={tab === 'upcoming' ? 'Выберите переговорную и запланируйте следующую встречу.' : 'Завершённые встречи появятся здесь автоматически.'} action={tab === 'upcoming' ? <Link className="button button--primary button--md" to="/rooms"><Plus size={17} /><span>Забронировать комнату</span></Link> : undefined} />}
      <ConfirmDialog open={Boolean(bookingToCancel)} onClose={() => setBookingToCancel(null)} onConfirm={() => void cancelBooking()} loading={deleteMutation.isPending} title="Отменить встречу?" description={`Бронирование «${bookingToCancel ? roomById.get(bookingToCancel.room_id)?.name ?? 'Переговорная' : ''}» будет удалено. Вернуть его автоматически не получится.`} confirmLabel="Да, отменить" />
    </div>
  );
}
