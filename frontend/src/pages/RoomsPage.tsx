import { Building2, Plus, Presentation, Search, SlidersHorizontal, Users, View, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/PageState';
import { useAuth } from '../features/auth/use-auth';
import { CreateRoomModal } from '../features/rooms/CreateRoomModal';
import { RoomCard } from '../features/rooms/RoomCard';
import { useRooms } from '../features/rooms/rooms-api';

export function RoomsPage() {
  const { user } = useAuth();
  const roomsQuery = useRooms();
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState(0);
  const [projector, setProjector] = useState(false);
  const [whiteboard, setWhiteboard] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const rooms = useMemo(() => (roomsQuery.data ?? []).filter((room) => {
    const query = search.trim().toLocaleLowerCase('ru');
    const matchesText = !query || room.name.toLocaleLowerCase('ru').includes(query) || room.description?.toLocaleLowerCase('ru').includes(query);
    return matchesText && room.capacity >= minCapacity && (!projector || room.has_projector) && (!whiteboard || room.has_whiteboard);
  }), [roomsQuery.data, search, minCapacity, projector, whiteboard]);

  const hasFilters = Boolean(search || minCapacity || projector || whiteboard);
  const resetFilters = () => { setSearch(''); setMinCapacity(0); setProjector(false); setWhiteboard(false); };

  return (
    <div className="page rooms-page">
      <header className="page-header">
        <div><p className="eyebrow">Пространства BookIt</p><h1>Переговорные</h1><p>Найдите комнату под формат и размер вашей встречи.</p></div>
        {user?.role === 'admin' && <Button icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Добавить комнату</Button>}
      </header>

      <section className="room-filters" aria-label="Фильтры комнат">
        <label className="search-field"><Search size={18} aria-hidden /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти по названию или описанию" aria-label="Поиск переговорной" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button>}</label>
        <div className="filter-divider" />
        <label className="capacity-filter"><Users size={17} /><span>Вместимость</span><select value={minCapacity} onChange={(event) => setMinCapacity(Number(event.target.value))}><option value={0}>Любая</option><option value={4}>от 4</option><option value={6}>от 6</option><option value={8}>от 8</option><option value={12}>от 12</option></select></label>
        <button type="button" className={`filter-chip${projector ? ' is-active' : ''}`} onClick={() => setProjector((value) => !value)} aria-pressed={projector}><Presentation size={16} /> Проектор</button>
        <button type="button" className={`filter-chip${whiteboard ? ' is-active' : ''}`} onClick={() => setWhiteboard((value) => !value)} aria-pressed={whiteboard}><View size={16} /> Доска</button>
        {hasFilters && <button className="filter-reset" type="button" onClick={resetFilters}>Сбросить</button>}
      </section>

      <div className="results-heading"><span><SlidersHorizontal size={16} /> {roomsQuery.isPending ? 'Загружаем комнаты…' : `${rooms.length} ${rooms.length === 1 ? 'переговорная' : rooms.length >= 2 && rooms.length <= 4 ? 'переговорные' : 'переговорных'}`}</span><small>Свободный слот подтверждается при бронировании</small></div>

      {roomsQuery.isError ? <ErrorState onRetry={() => void roomsQuery.refetch()} /> : roomsQuery.isPending ? (
        <div className="room-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="skeleton--room" />)}</div>
      ) : rooms.length ? (
        <div className="room-grid">{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
      ) : roomsQuery.data?.length ? (
        <EmptyState title="По этим фильтрам ничего нет" description="Попробуйте уменьшить вместимость или сбросить часть параметров." icon={Search} action={<Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button>} />
      ) : (
        <EmptyState title="Комнаты ещё не добавлены" description={user?.role === 'admin' ? 'Создайте первую переговорную — она сразу появится в каталоге.' : 'Администратор скоро добавит пространства для бронирования.'} icon={Building2} action={user?.role === 'admin' ? <Button icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>Создать комнату</Button> : undefined} />
      )}

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
