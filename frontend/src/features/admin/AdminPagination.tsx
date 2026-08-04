import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function pageWindow(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 4, 'ellipsis', total];
  if (current >= total - 2) return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export function AdminPagination({
  page,
  pageSize,
  total,
  pages,
  onPageChange,
  onPageSizeChange,
}: AdminPaginationProps) {
  const pageCount = Math.max(1, pages ?? Math.ceil(total / pageSize));
  const firstItem = total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(total, page * pageSize);

  return (
    <div className="admin-pagination" aria-label="Пагинация">
      <div className="admin-pagination__summary">
        <span>{firstItem}–{lastItem} из {total}</span>
        <label>
          <span>На странице</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Записей на странице"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="admin-pagination__pages">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={17} />
        </button>
        {pageWindow(page, pageCount).map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} aria-hidden>…</span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? 'is-active' : ''}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Страница ${item}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Следующая страница"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

