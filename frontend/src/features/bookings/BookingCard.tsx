import { CalendarDays, Clock3, MoreHorizontal, Users } from 'lucide-react';
import { Link } from 'wouter';

import { formatBookingDate, formatDuration, isUpcoming } from '../../lib/date';
import type { Booking, Room } from '../../types/api';

interface BookingCardProps {
  booking: Booking;
  room?: Room;
  onCancel?: (booking: Booking) => void;
  compact?: boolean;
}

export function BookingCard({ booking, room, onCancel, compact = false }: BookingCardProps) {
  const upcoming = isUpcoming(booking.end_time);

  return (
    <article className={`booking-card${compact ? ' booking-card--compact' : ''}`}>
      <div className="booking-card__date">
        <span>{new Date(booking.start_time).toLocaleDateString('ru-RU', { day: '2-digit' })}</span>
        <small>{new Date(booking.start_time).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</small>
      </div>
      <div className="booking-card__content">
        <div className="booking-card__topline">
          <span className={`status-badge ${upcoming ? 'status-badge--upcoming' : 'status-badge--past'}`}>{upcoming ? 'Предстоит' : 'Завершена'}</span>
          {!compact && upcoming && onCancel && (
            <button className="icon-button" type="button" onClick={() => onCancel(booking)} aria-label="Отменить бронирование"><MoreHorizontal size={19} /></button>
          )}
        </div>
        <h3>{room ? <Link to={`/rooms/${room.id}`}>{room.name}</Link> : `Переговорная #${booking.room_id}`}</h3>
        <p><CalendarDays size={15} /> {formatBookingDate(booking.start_time, booking.end_time)}</p>
        <div className="booking-card__meta">
          <span><Clock3 size={14} /> {formatDuration(booking.start_time, booking.end_time)}</span>
          {room && <span><Users size={14} /> до {room.capacity} человек</span>}
        </div>
      </div>
    </article>
  );
}
