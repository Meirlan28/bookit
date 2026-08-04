import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  DoorOpen,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';

import { ErrorState, Skeleton } from '../components/ui/PageState';
import { BookingCard } from '../features/bookings/BookingCard';
import { useBookings } from '../features/bookings/bookings-api';
import { RoomArtwork } from '../features/rooms/RoomCard';
import { useRooms } from '../features/rooms/rooms-api';
import { useAuth } from '../features/auth/use-auth';
import { formatBookingDate, formatDuration } from '../lib/date';

export function DashboardPage() {
  const { user } = useAuth();
  const roomsQuery = useRooms();
  const bookingsQuery = useBookings();
  const [now] = useState(() => Date.now());
  const upcoming = (bookingsQuery.data ?? [])
    .filter((booking) => new Date(booking.end_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const nextBooking = upcoming[0];
  const roomById = new Map((roomsQuery.data ?? []).map((room) => [room.id, room]));
  const nextRoom = nextBooking ? roomById.get(nextBooking.room_id) : undefined;
  const displayName = user?.email.split('@')[0] ?? 'коллега';

  return (
    <div className="page dashboard-page">
      <header className="page-header page-header--welcome">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> Ваш рабочий день</p>
          <h1>Привет, <span>{displayName}</span></h1>
          <p>Организуйте встречи, а пространство мы возьмём на себя.</p>
        </div>
        <Link className="button button--primary button--md" to="/rooms"><DoorOpen size={18} /><span>Найти комнату</span></Link>
      </header>

      <section className="dashboard-grid">
        <div className="dashboard-grid__main">
          {bookingsQuery.isPending || roomsQuery.isPending ? (
            <Skeleton className="skeleton--hero" />
          ) : nextBooking ? (
            <article className="next-booking">
              <div className="next-booking__glow" />
              <div className="next-booking__content">
                <div className="next-booking__label"><span className="pulse-dot" /> Ближайшая встреча</div>
                <h2>{nextRoom?.name ?? `Переговорная #${nextBooking.room_id}`}</h2>
                <p>{nextRoom?.description || 'Всё готово для продуктивной встречи.'}</p>
                <div className="next-booking__details">
                  <span><CalendarDays size={17} /> {formatBookingDate(nextBooking.start_time, nextBooking.end_time)}</span>
                  <span><Clock3 size={17} /> {formatDuration(nextBooking.start_time, nextBooking.end_time)}</span>
                  {nextRoom && <span><Users size={17} /> до {nextRoom.capacity} человек</span>}
                </div>
                <Link to="/bookings">Все мои встречи <ArrowRight size={17} /></Link>
              </div>
              {nextRoom && <div className="next-booking__art"><RoomArtwork room={nextRoom} compact /></div>}
            </article>
          ) : (
            <article className="next-booking next-booking--empty">
              <div className="next-booking__content">
                <div className="next-booking__label"><CalendarCheck2 size={16} /> Расписание свободно</div>
                <h2>Есть время для новой идеи</h2>
                <p>Выберите подходящую переговорную и добавьте первую встречу в расписание.</p>
                <Link className="button button--light button--md" to="/rooms"><Building2 size={17} /><span>Посмотреть комнаты</span></Link>
              </div>
            </article>
          )}

          <section className="dashboard-section">
            <div className="section-heading"><div><p className="eyebrow">Ваше расписание</p><h2>Следующие встречи</h2></div><Link to="/bookings">Смотреть все <ArrowRight size={16} /></Link></div>
            {bookingsQuery.isError ? <ErrorState onRetry={() => void bookingsQuery.refetch()} /> : bookingsQuery.isPending ? (
              <div className="booking-list"><Skeleton className="skeleton--booking" /><Skeleton className="skeleton--booking" /></div>
            ) : upcoming.length ? (
              <div className="booking-list">{upcoming.slice(0, 3).map((booking) => <BookingCard key={booking.id} booking={booking} room={roomById.get(booking.room_id)} compact />)}</div>
            ) : (
              <div className="inline-empty"><CalendarDays size={21} /><div><strong>Предстоящих встреч нет</strong><span>Самое время выбрать комнату для следующей.</span></div></div>
            )}
          </section>
        </div>

        <aside className="dashboard-grid__side">
          <div className="stats-grid">
            <article className="stat-card"><span className="stat-card__icon stat-card__icon--lime"><CalendarCheck2 size={20} /></span><div><strong>{upcoming.length}</strong><span>предстоящих встреч</span></div></article>
            <article className="stat-card"><span className="stat-card__icon stat-card__icon--violet"><Building2 size={20} /></span><div><strong>{roomsQuery.data?.length ?? '—'}</strong><span>комнат в каталоге</span></div></article>
          </div>
          <section className="quick-rooms">
            <div className="section-heading"><div><p className="eyebrow">Быстрый выбор</p><h2>Переговорные</h2></div></div>
            {roomsQuery.isError ? <ErrorState onRetry={() => void roomsQuery.refetch()} /> : roomsQuery.isPending ? <><Skeleton className="skeleton--quick-room" /><Skeleton className="skeleton--quick-room" /></> : roomsQuery.data?.slice(0, 3).map((room) => (
              <Link className="quick-room" key={room.id} to={`/rooms/${room.id}`}>
                <RoomArtwork room={room} compact />
                <div><strong>{room.name}</strong><span><Users size={14} /> до {room.capacity} человек</span></div>
                <ArrowRight size={18} />
              </Link>
            ))}
            <Link className="quick-rooms__all" to="/rooms">Все переговорные <ArrowRight size={16} /></Link>
          </section>
        </aside>
      </section>
    </div>
  );
}
