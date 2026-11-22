'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  filterBar?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (newPage: number) => void;
  };
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick?: () => void;
      href?: string;
    };
  };
  onRowClick?: (item: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  onRetry,
  filterBar,
  pagination,
  emptyState = {
    title: 'No records found',
    description: 'There are no entries matching your current filters or search query.',
  },
  onRowClick,
  stickyHeader = true,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(column.key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (col.sortValue) {
        valA = col.sortValue(a);
        valB = col.sortValue(b);
      } else {
        valA = (a as any)[col.key];
        valB = (b as any)[col.key];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const compare =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB));

      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [data, sortKey, sortOrder, columns]);

  // Pagination calculation
  const totalItems = pagination?.totalItems ?? data.length;
  const pageSize = pagination?.pageSize ?? 20;
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Optional Top Filter Bar Slot */}
      {filterBar && (
        <div className="p-4 border-b border-gray-200 bg-white">
          {filterBar}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[240px] flex-1">
        <table className="min-w-full divide-y divide-gray-200 text-left border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-gray-50' : 'bg-gray-50'}>
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => handleSort(col)}
                    className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 ${alignClass} ${
                      col.sortable ? 'cursor-pointer select-none hover:text-gray-900 group' : ''
                    } ${col.className || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right'
                          ? 'justify-end w-full'
                          : col.align === 'center'
                          ? 'justify-center w-full'
                          : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )
                          ) : (
                            <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 8l5-5 5 5H5zM5 12l5 5 5-5H5z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              // Skeleton Rows
              Array.from({ length: 6 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-cell-${cIdx}`} className="py-3.5 px-4">
                      <div
                        className={`h-4 bg-gray-100 rounded ${
                          col.align === 'right' ? 'ml-auto w-16' : 'w-24'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              // Inline Error State
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Failed to load table records</p>
                    <p className="text-xs text-gray-500">{error}</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-white hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="py-16 px-4 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto border border-gray-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{emptyState.title}</p>
                    <p className="text-xs text-gray-500">{emptyState.description}</p>
                    {emptyState.action && (
                      <div className="pt-2">
                        {emptyState.action.href ? (
                          <a
                            href={emptyState.action.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            {emptyState.action.label}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={emptyState.action.onClick}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            {emptyState.action.label}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Rendered Table Rows
              sortedData.map((item, idx) => {
                const key = keyExtractor(item, idx);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right tabular-nums'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      const cellContent = col.render
                        ? col.render(item, idx)
                        : (item as any)[col.key] ?? '—';

                      return (
                        <td
                          key={`${key}-${col.key}`}
                          className={`py-3 px-4 text-sm text-gray-700 border-b border-gray-100 ${alignClass} ${col.className || ''}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          <div>
            Showing <span className="font-semibold text-gray-900 tabular-nums">{startItem}</span> to{' '}
            <span className="font-semibold text-gray-900 tabular-nums">{endItem}</span> of{' '}
            <span className="font-semibold text-gray-900 tabular-nums">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer font-medium"
            >
              Previous
            </button>
            <span className="text-gray-500 tabular-nums font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
