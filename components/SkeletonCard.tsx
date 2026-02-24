import React from 'react';

export interface SkeletonCardProps {
  /** Jumlah baris untuk detail info (default: 2) */
  infoLines?: number;
  /** Menampilkan section aksi dengan tombol placeholder (default: true) */
  showActions?: boolean;
  /** Jumlah tombol aksi placeholder (default: 2) */
  actionCount?: number;
  /** Lebar title dalam persentase (default: '3/4') */
  titleWidth?: string;
  /** Lebar subtitle dalam persentase (default: '1/2') */
  subtitleWidth?: string;
  /** Class tambahan untuk custom styling */
  className?: string;
}

/**
 * Skeleton Card untuk loading state pada mobile card list
 * Dapat digunakan di semua modul: SalesOrder, PurchaseOrder, DeliveryNote, dll.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  infoLines = 2,
  showActions = true,
  actionCount = 2,
  titleWidth = '3/4',
  subtitleWidth = '1/2',
  className = '',
}) => {
  return (
    <li className={`px-4 py-4 border-b border-gray-100 ${className}`}>
      <div className="space-y-3 animate-pulse">
        {/* Header: Title + Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className={`h-4 bg-gray-200 rounded w-${titleWidth}`}></div>
            <div className={`h-3 bg-gray-200 rounded w-${subtitleWidth}`}></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>

        {/* Info Lines (Tanggal, No. Dokumen, dll) */}
        <div className="space-y-2">
          {Array.from({ length: infoLines }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded"></div>
          ))}
        </div>

        {/* Footer: Total + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          
          {showActions && (
            <div className="flex gap-2">
              {Array.from({ length: actionCount }).map((_, i) => (
                <div key={i} className="h-8 w-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default SkeletonCard;