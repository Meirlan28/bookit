import { ArrowUpRight, Presentation, Users, View } from 'lucide-react';
import { Link } from 'wouter';

import type { Room } from '../../types/api';

export function RoomArtwork({ room, compact = false }: { room: Room; compact?: boolean }) {
  const variant = (room.id % 4) + 1;
  return (
    <div className={`room-art room-art--${variant}${compact ? ' room-art--compact' : ''}`} aria-hidden>
      <div className="room-art__sun" />
      <div className="room-art__wall" />
      <div className="room-art__table" />
      <span className="room-art__chair room-art__chair--one" />
      <span className="room-art__chair room-art__chair--two" />
      <span className="room-art__plant" />
      <span className="room-art__number">{String(room.id).padStart(2, '0')}</span>
    </div>
  );
}

export function AmenityList({ room, short = false }: { room: Room; short?: boolean }) {
  return (
    <div className="amenity-list">
      <span><Users size={15} /> до {room.capacity} {room.capacity === 1 ? 'человека' : 'человек'}</span>
      {room.has_projector && <span><Presentation size={15} /> {short ? 'Экран' : 'Проектор'}</span>}
      {room.has_whiteboard && <span><View size={15} /> {short ? 'Доска' : 'Маркерная доска'}</span>}
    </div>
  );
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <article className="room-card">
      <Link to={`/rooms/${room.id}`} className="room-card__art-link" aria-label={`Открыть ${room.name}`}>
        <RoomArtwork room={room} />
        <span className="room-card__badge">Можно бронировать</span>
      </Link>
      <div className="room-card__content">
        <div className="room-card__title-row">
          <div><h3><Link to={`/rooms/${room.id}`}>{room.name}</Link></h3><p>{room.description || 'Комфортное пространство для командных встреч.'}</p></div>
          <Link className="room-card__arrow" to={`/rooms/${room.id}`} aria-label={`Забронировать ${room.name}`}><ArrowUpRight size={19} /></Link>
        </div>
        <AmenityList room={room} short />
      </div>
    </article>
  );
}
