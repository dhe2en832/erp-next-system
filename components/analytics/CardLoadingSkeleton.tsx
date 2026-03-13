'use client';

/**
 * Card Loading Skeleton Component
 * 
 * Displays an animated loading skeleton for card-based analytics components
 * (e.g., commission cards, stat cards).
 * 
 * Requirement: 11.6
 */

interface CardLoadingSkeletonProps {
  /** Whether to show multiple stat rows (default: true) */
  showStats?: boolean;
  /** Number of stat rows to display (default: 3) */
  statCount?: number;
  /** Whether to show action button skeleton (default: false) */
  showAction?: boolean;
  /** Custom className for additional styling */
  className?: string;
}

export default function CardLoadingSkeleton({
  showStats = true,
  statCount = 3,
  showAction = false,
  className = '',
}: CardLoadingSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Title skeleton */}
      <div className="mb-4 space-y-2 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-2/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* Stats skeleton */}
      {showStats && (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: statCount }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      )}
      
      {/* Action button skeleton */}
      {showAction && (
        <div className="mt-6 pt-4 border-t border-gray-200 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      )}
    </div>
  );
}
