import { Edit3, Plus, Presentation, Trash2, Users, View } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/PageState';
import { RoomArtwork } from '../rooms/RoomCard';
import { useRooms } from '../rooms/rooms-api';
import type { Room } from '../../types/api';
import { useDeleteAdminRoom } from './admin-api';
import { AdminRoomDialog } from './AdminRoomDialog';

type RoomDialogState = { room: Room | null } | null;

export function AdminRooms() {
  const roomsQuery = useRooms();
  const deleteMutation = useDeleteAdminRoom();
  const [dialog, setDialog] = useState<RoomDialogState>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const deleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await deleteMutation.mutateAsync(roomToDelete.id);
      toast.success('Переговорная удалена', { description: `${roomToDelete.name} больше не отображается в каталоге.` });
      setRoomToDelete(null);
    } catch {
      toast.error('Не удалось удалить комнату', { description: 'Возможно, к ней привязаны бронирования.' });
    }
  };

  return (
    <section className="admin-section" aria-labelledby="admin-rooms-title">
      <div className="admin-section__heading">
        <div><p className="eyebrow">Каталог</p><h2 id="admin-rooms-title">Переговорные</h2><p>Создавайте пространства и поддерживайте оснащение в актуальном состоянии.</p></div>
        <Button icon={<Plus size={17} />} onClick={() => setDialog({ room: null })}>Добавить комнату</Button>
      </div>

      {roomsQuery.isError ? (
        <ErrorState title="Комнаты не загрузились" onRetry={() => void roomsQuery.refetch()} />
      ) : roomsQuery.isPending ? (
        <div className="admin-room-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="skeleton--admin-room" />)}</div>
      ) : roomsQuery.data.length ? (
        <div className="admin-room-grid">
          {roomsQuery.data.map((room) => (
            <article className="admin-room-card" key={room.id}>
              <RoomArtwork room={room} compact />
              <div className="admin-room-card__content">
                <div className="admin-room-card__title"><div><small>#{String(room.id).padStart(2, '0')}</small><h3>{room.name}</h3></div><span>{room.capacity} мест</span></div>
                <p>{room.description || 'Описание пока не добавлено.'}</p>
                <div className="admin-room-card__amenities">
                  <span><Users size={14} /> до {room.capacity}</span>
                  <span className={room.has_projector ? 'is-enabled' : ''}><Presentation size={14} /> Проектор</span>
                  <span className={room.has_whiteboard ? 'is-enabled' : ''}><View size={14} /> Доска</span>
                </div>
                <div className="admin-room-card__actions">
                  <Button variant="secondary" size="sm" icon={<Edit3 size={15} />} onClick={() => setDialog({ room })}>Изменить</Button>
                  <button type="button" className="icon-button admin-danger-action" onClick={() => setRoomToDelete(room)} aria-label={`Удалить ${room.name}`}><Trash2 size={17} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Переговорных пока нет" description="Добавьте первое пространство — оно сразу появится в общем каталоге." action={<Button icon={<Plus size={17} />} onClick={() => setDialog({ room: null })}>Создать комнату</Button>} />
      )}

      {dialog && <AdminRoomDialog key={dialog.room?.id ?? 'new-room'} room={dialog.room} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(roomToDelete)}
        onClose={() => setRoomToDelete(null)}
        onConfirm={() => void deleteRoom()}
        loading={deleteMutation.isPending}
        title="Удалить переговорную?"
        description={`«${roomToDelete?.name ?? ''}» исчезнет из каталога. Операцию нельзя отменить.`}
        confirmLabel="Удалить комнату"
      />
    </section>
  );
}

