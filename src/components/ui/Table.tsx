import React from 'react';
import { cn } from './Button';

interface TableProps {
  columns: {
    header: string;
    accessor: string | ((row: any) => React.ReactNode);
    className?: string;
  }[];
  data: any[];
  onRowClick?: (row: any) => void;
  isLoading?: boolean;
}

export const Table = ({ columns, data, onRowClick, isLoading }: TableProps) => {
  return (
    <div className="w-full bg-luxury-input border border-luxury-border-dim rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto scrollbar-gold">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-surface border-b border-luxury-border-dim">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={cn(
                    'px-6 py-4 text-[10px] uppercase font-bold tracking-[0.2em] text-luxury-text-dim',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-luxury-border-dim">
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     {columns.map((_, idx) => (
                        <td key={idx} className="px-6 py-8"><div className="h-4 bg-luxury-surface rounded-full w-24"></div></td>
                     ))}
                  </tr>
               ))
            ) : data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr 
                  key={row.id || rowIdx} 
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'group transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-luxury-surface' : ''
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      className={cn(
                        'px-6 py-5 text-sm text-luxury-text font-medium',
                        col.className
                      )}
                    >
                      {typeof col.accessor === 'function' ? col.accessor(row) : (row as any)[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center text-luxury-text-dim uppercase text-xs font-bold tracking-[0.3em]">
                   No records found in gallery
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
