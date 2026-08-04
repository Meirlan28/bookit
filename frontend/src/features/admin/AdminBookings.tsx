import { CalendarX2, Clock3, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/PageState';
import { formatBookingDate, formatDate, formatDuration, isUpcoming } from '../../lib/date';
import { useAdminBookings, useDeleteAdminBooking } from './admin-api';
import { AdminPagination } from './AdminPagination';
import type { AdminBooking, AdminBookingStatus } from './admin-types';
import { useDebouncedValue } from './use-debounced-value';

const statusOptions: Array<{ value: AdminBookingStatus; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'past', label: 'Завершённые' },
];

export function AdminBookings() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminBookingStatus>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bookingToDelete, setBookingToDelete] = useState<AdminBooking | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const bookingsQuery = useAdminBookings({ search: debouncedSearch, status, page, pageSize });
  const deleteMutation = useDeleteAdminBooking();

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeStatus = (nextStatus: AdminBookingStatus) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const deleteBooking = async () => {
    if (!bookingToDelete) return;
    const shouldReturnToPreviousPage = page > 1 && bookingsQuery.data?.items.length === 1;
    try {
      await deleteMutation.mutateAsync(bookingToDelete.id);
      toast.success('Бронирование удалено');
      if (shouldReturnToPreviousPage) setPage((currentPage) => Math.max(1, currentPage - 1));
      setBookingToDelete(null);
    } catch {
      toast.error('Не удалось удалить бронирование');
    }
  };

  return (
    <section className="admin-section" aria-labelledby="admin-bookings-title">
      <div className="admin-section__heading">
        <div><p className="eyebrow">Расписание</p><h2 id="admin-bookings-title">Все бронирования</h2><p>Ищите встречи по пользователю или комнате и удаляйте ошибочные записи.</p></div>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} aria-hidden />
          <input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Email пользователя или комната" aria-label="Поиск бронирований" />
          {search && <button type="button" onClick={() => changeSearch('')} aria-label="Очистить поиск"><X size={15} /></button>}
        </label>
        <div className="admin-segmented" role="group" aria-label="Статус бронирования">
          {statusOptions.map((option) => (
            <button key={option.value} type="button" className={status === option.value ? 'is-active' : ''} aria-pressed={status === option.value} onClick={() => changeStatus(option.value)}>{option.label}</button>
          ))}
        </div>
      </div>

      {bookingsQuery.isError ? (
        <ErrorState title="Бронирования не загрузились" onRetry={() => void bookingsQuery.refetch()} />
      ) : bookingsQuery.isPending ? (
        <Skeleton className="skeleton--admin-table" />
      ) : bookingsQuery.data.items.length ? (
        <>
          <div className={`admin-table-wrap${bookingsQuery.isFetching ? ' is-refreshing' : ''}`}>
            <table className="admin-table admin-table--bookings">
              <caption className="sr-only">Список бронирований</caption>
              <thead><tr><th>Встреча</th><th>Пользователь</th><th>Переговорная</th><th>Время</th><th>Создано</th><th><span className="sr-only">Действия</span></th></tr></thead>
              <tbody>
                {bookingsQuery.data.items.map((booking) => {
                  const upcoming = isUpcoming(booking.end_time);
                  return (
                    <tr key={booking.id}>
                      <td data-label="Встреча"><div className="admin-id-cell"><strong>#{booking.id}</strong><span className={`status-badge ${upcoming ? 'status-badge--upcoming' : 'status-badge--past'}`}>{upcoming ? 'Предстоит' : 'Завершена'}</span></div></td>
                      <td data-label="Пользователь"><div className="admin-person-cell"><span>{booking.user_email.slice(0, 1).toUpperCase()}</span><div><strong>{booking.user_email}</strong><small>ID {booking.user_id}</small></div></div></td>
                      <td data-label="Переговорная"><Link className="admin-table-link" to={`/rooms/${booking.room_id}`}>{booking.room_name}</Link></td>
                      <td data-label="Время"><div className="admin-date-cell"><strong>{formatBookingDate(booking.start_time, booking.end_time)}</strong><span><Clock3 size={13} /> {formatDuration(booking.start_time, booking.end_time)}</span></div></td>
                      <td data-label="Создано"><span className="admin-muted-cell">{formatDate(booking.created_at, 'd MMM yyyy, HH:mm')}</span></td>
                      <td className="admin-table__actions"><button type="button" className="icon-button admin-danger-action" onClick={() => setBookingToDelete(booking)} aria-label={`Удалить бронирование ${booking.id}`}><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={bookingsQuery.data.page}
            pageSize={bookingsQuery.data.page_size}
            total={bookingsQuery.data.total}
            pages={bookingsQuery.data.pages}
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
          />
        </>
      ) : (
        <EmptyState
          icon={CalendarX2}
          title={search ? 'Ничего не найдено' : status === 'all' ? 'Бронирований пока нет' : 'В этой категории пусто'}
          description={search ? 'Попробуйте другой email, название комнаты или очистите поиск.' : 'Новые встречи появятся здесь автоматически.'}
        />
      )}

      <ConfirmDialog
        open={Boolean(bookingToDelete)}
        onClose={() => setBookingToDelete(null)}
        onConfirm={() => void deleteBooking()}
        loading={deleteMutation.isPending}
        title="Удалить бронирование?"
        description={`Встреча #${bookingToDelete?.id ?? ''} в «${bookingToDelete?.room_name ?? ''}» будет удалена без возможности восстановления.`}
        confirmLabel="Удалить встречу"
      />
    </section>
  );
}
