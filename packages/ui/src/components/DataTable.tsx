import React, { useState } from 'react';
import { cn } from '../utils';

export interface Column<T> {
  key: Extract<keyof T, string>;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  className
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: Extract<keyof T, string>; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: Extract<keyof T, string>, sortable?: boolean) => {
    if (!sortable) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  return (
    <div className={cn("w-full overflow-auto border border-[#1a1d27] rounded-md", className)}>
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-[#1a1d27] text-slate-400 font-mono border-b border-[#2d3142]">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "px-4 py-3 font-medium tracking-wider",
                  col.sortable && "cursor-pointer hover:text-white transition-colors"
                )}
                onClick={() => handleSort(col.key, col.sortable)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortConfig?.key === col.key && (
                    <span className="text-indigo-400">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1d27] bg-[#0f1117]">
          {sortedData.length > 0 ? (
            sortedData.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "hover:bg-[#1a1d27]/50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-2.5 font-mono text-slate-300 whitespace-nowrap">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 font-mono">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
