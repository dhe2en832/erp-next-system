import React from 'react';
import SkeletonCard from './SkeletonCard';
import SkeletonTableRow from './SkeletonTableRow';

export interface SkeletonListProps {
  /** Mode: 'card' | 'table' | 'auto' (default: 'auto') */
  mode?: 'card' | 'table' | 'auto';
  /** Apakah viewport mobile (untuk mode 'auto') */
  isMobile?: boolean;
  /** Jumlah skeleton yang dirender (default: 10) */
  count?: number;
  /** Alias untuk count (untuk konsistensi nama) */
  itemCount?: number;
  /** Props untuk SkeletonCard */
  cardProps?: React.ComponentProps<typeof SkeletonCard>;
  /** Props untuk SkeletonTableRow */
  tableProps?: React.ComponentProps<typeof SkeletonTableRow>;
  /** Class tambahan untuk container */
  className?: string;
  
  // ✅ Support sebagai wrapper
  asWrapper?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * Wrapper skeleton yang otomatis memilih Card/Table berdasarkan mode/device
 * ✅ FIXED: Table mode menggunakan <table> + <tbody> yang valid
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  mode = 'auto',
  isMobile = false,
  count = 10,
  itemCount,
  cardProps = {},
  tableProps = {},
  className = '',
  asWrapper = false,
  loading = false,
  children,
}) => {
  // ✅ Jika sebagai wrapper dan TIDAK loading, render children langsung
  if (asWrapper && !loading) {
    return <>{children}</>;
  }
  
  // ✅ Jika sebagai wrapper dan loading, tampilkan skeleton
  if (asWrapper && loading) {
    const renderCount = itemCount || count;
    const renderMode = mode === 'auto' ? (isMobile ? 'card' : 'table') : mode;
    
    if (renderMode === 'card') {
      return (
        <ul className={`divide-y divide-gray-100 ${className}`}>
          {Array.from({ length: renderCount }).map((_, i) => (
            <SkeletonCard key={i} {...cardProps} />
          ))}
        </ul>
      );
    }
    
    // ✅ Table mode - Gunakan struktur tabel yang valid
    return (
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        <tbody className="bg-white divide-y divide-gray-100">
          {Array.from({ length: renderCount }).map((_, i) => (
            <SkeletonTableRow key={i} {...tableProps} />
          ))}
        </tbody>
      </table>
    );
  }
  
  // ✅ Default behavior: render skeleton list (generator mode)
  const renderMode = mode === 'auto' ? (isMobile ? 'card' : 'table') : mode;
  const renderCount = itemCount || count;

  if (renderMode === 'card') {
    return (
      <ul className={`divide-y divide-gray-100 ${className}`}>
        {Array.from({ length: renderCount }).map((_, i) => (
          <SkeletonCard key={i} {...cardProps} />
        ))}
      </ul>
    );
  }

  // ✅ FIXED: Table mode harus menggunakan <table> + <tbody>
  return (
    <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
      <tbody className="bg-white divide-y divide-gray-100">
        {Array.from({ length: renderCount }).map((_, i) => (
          <SkeletonTableRow key={i} {...tableProps} />
        ))}
      </tbody>
    </table>
  );
};

export default SkeletonList;