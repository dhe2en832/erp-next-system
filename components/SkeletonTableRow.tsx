import React from 'react';

export interface SkeletonTableRowProps {
  /** Jumlah kolom (default: 6) */
  columns?: number;
  /** Lebar kolom pertama (default: 'w-3/4') */
  firstColWidth?: string;
  /** Menampilkan kolom aksi (default: true) */
  showActions?: boolean;
}

/**
 * Single skeleton row untuk tabel desktop
 * Gunakan di dalam <tbody> dengan map() untuk multiple rows
 */
export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({
  columns = 6,
  firstColWidth = 'w-3/4',
  showActions = true,
}) => {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => {
        const isLast = i === columns - 1;
        const isActionCol = showActions && isLast;
        
        return (
          <td key={i} className="px-4 py-4">
            {isActionCol ? (
              <div className="flex justify-end gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className={`h-3 bg-gray-200 rounded animate-pulse ${
                i === 0 ? firstColWidth : 'w-full'
              }`}></div>
            )}
          </td>
        );
      })}
    </tr>
  );
};

export default SkeletonTableRow;