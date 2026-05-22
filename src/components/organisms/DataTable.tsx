import type React from 'react';
import { useMemo, useState } from 'react';
import Spinner from '../atoms/Spinner';
import EmptyState from '../molecules/EmptyState';
import Pagination from '../molecules/Pagination';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  pagination?: boolean;
  pageSize?: number;
  mobileCard?: (row: T) => React.ReactNode;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  title?: string;
  actions?: React.ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Tidak ada data ditemukan.',
  emptyIcon,
  pagination = false,
  pageSize = 10,
  mobileCard,
  defaultSortKey,
  defaultSortDirection = 'desc',
  onSort,
  title,
  actions,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const handleSort = (key: string) => {
    let newDirection: 'asc' | 'desc' = 'desc';
    if (sortKey === key) {
      newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    }

    setSortKey(key);
    setSortDirection(newDirection);

    if (onSort) {
      onSort(key, newDirection);
    }
  };

  // Sorting Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (valA === undefined || valA === null) return sortDirection === 'asc' ? 1 : -1;
      if (valB === undefined || valB === null) return sortDirection === 'asc' ? -1 : 1;

      // Handle numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // Handle strings (e.g. dates, category names, descriptions)
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  // Pagination Logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;

  const currentItems = useMemo(() => {
    if (!pagination) return sortedData;
    return sortedData.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedData, pagination, indexOfFirstItem, indexOfLastItem]);

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <Spinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={emptyIcon} description={emptyMessage} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className={`w-full text-[13px] text-left ${mobileCard ? 'hidden md:table' : 'table'}`}>
              <thead>
                <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`pb-3 pt-1 ${col.sortable ? 'cursor-pointer hover:text-textMain transition-colors' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                      )}
                      {col.sortable && sortKey !== col.key && (
                        <span className="ml-1 text-transparent group-hover:text-border">↕</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentItems.map((row) => (
                  <tr key={keyExtractor(row)} className="hover:bg-surface2/40 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            {mobileCard && (
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {currentItems.map((row) => (
                  <div
                    key={keyExtractor(row)}
                    className="bg-surface border border-border rounded-xl p-4 shadow-sm relative overflow-hidden"
                  >
                    {mobileCard(row)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
