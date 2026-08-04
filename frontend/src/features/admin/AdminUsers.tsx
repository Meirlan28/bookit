import { Edit3, Search, UserRoundSearch, X } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, ErrorState, Skeleton } from '../../components/ui/PageState';
import { useAuth } from '../auth/use-auth';
import { useAdminUsers } from './admin-api';
import { AdminPagination } from './AdminPagination';
import type { AdminUser } from './admin-types';
import { AdminUserDialog } from './AdminUserDialog';
import { useDebouncedValue } from './use-debounced-value';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const usersQuery = useAdminUsers({ search: debouncedSearch, page, pageSize });

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <section className="admin-section" aria-labelledby="admin-users-title">
      <div className="admin-section__heading">
        <div><p className="eyebrow">Команда</p><h2 id="admin-users-title">Пользователи</h2><p>Контролируйте роли, состояние аккаунтов и доступ к рабочему пространству.</p></div>
      </div>

      <div className="admin-toolbar admin-toolbar--users">
        <label className="admin-search">
          <Search size={17} aria-hidden />
          <input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Найти по email" aria-label="Поиск пользователей" />
          {search && <button type="button" onClick={() => changeSearch('')} aria-label="Очистить поиск"><X size={15} /></button>}
        </label>
        {usersQuery.data && <span className="admin-toolbar__count">{usersQuery.data.total.toLocaleString('ru-RU')} пользователей</span>}
      </div>

      {usersQuery.isError ? (
        <ErrorState title="Пользователи не загрузились" onRetry={() => void usersQuery.refetch()} />
      ) : usersQuery.isPending ? (
        <Skeleton className="skeleton--admin-table" />
      ) : usersQuery.data.items.length ? (
        <>
          <div className={`admin-table-wrap${usersQuery.isFetching ? ' is-refreshing' : ''}`}>
            <table className="admin-table admin-table--users">
              <caption className="sr-only">Список пользователей</caption>
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Верификация</th><th>Бронирования</th><th>Статус</th><th><span className="sr-only">Действия</span></th></tr></thead>
              <tbody>
                {usersQuery.data.items.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <tr key={user.id}>
                      <td data-label="Пользователь"><div className="admin-person-cell"><span>{user.email.slice(0, 1).toUpperCase()}</span><div><strong>{user.email}</strong><small>ID {user.id}{isCurrent ? ' · Вы' : ''}</small></div></div></td>
                      <td data-label="Роль"><span className={`admin-role-badge admin-role-badge--${user.role}`}>{user.role === 'admin' ? 'Администратор' : 'Участник'}</span></td>
                      <td data-label="Верификация"><span className={`status-badge ${user.is_verified ? 'status-badge--verified' : 'status-badge--past'}`}>{user.is_verified ? 'Подтверждён' : 'Ожидает email'}</span></td>
                      <td data-label="Бронирования"><span className="admin-booking-count">{user.booking_count}</span></td>
                      <td data-label="Статус"><span className={`admin-account-status ${user.is_active ? 'is-active' : 'is-disabled'}`}><i />{user.is_active ? 'Активен' : 'Отключён'}</span></td>
                      <td className="admin-table__actions"><button type="button" className="icon-button" onClick={() => setUserToEdit(user)} aria-label={`Изменить доступ ${user.email}`}><Edit3 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={usersQuery.data.page}
            pageSize={usersQuery.data.page_size}
            total={usersQuery.data.total}
            pages={usersQuery.data.pages}
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
          />
        </>
      ) : (
        <EmptyState
          icon={UserRoundSearch}
          title={search ? 'Пользователь не найден' : 'Пользователей пока нет'}
          description={search ? 'Проверьте email или очистите строку поиска.' : 'Новые аккаунты появятся здесь после регистрации.'}
        />
      )}

      {userToEdit && (
        <AdminUserDialog
          key={userToEdit.id}
          user={userToEdit}
          isCurrentUser={userToEdit.id === currentUser?.id}
          onClose={() => setUserToEdit(null)}
        />
      )}
    </section>
  );
}

