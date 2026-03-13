'use client';

/**
 * Chart Loading Skeleton Component
 * 
 * Displays an animated loading skeleton for chart components
 * while data is being fetched.
 * 
 * Requirement: 11.6
 */

interface ChartLoadingSkeletonProps {
  /** Height of the skeleton in pixels (default: 300) */
  height?: number;
  /** Whether to show title skeleton (default: true) */
  showTitle?: boolean;
  /** Custom className for additional styling */
  className?: string;
}

export default function ChartLoadingSkeleton({
  height = 300,
  showTitle = true,
  className = '',
}: ChartLoadingSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Title skeleton */}
      {showTitle && (
        <div className="mb-4 space-y-2 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      )}
      
      {/* Chart skeleton */}
      <div 
        className="animate-pulse bg-gray-100 rounded-lg flex items-end justify-around p-4 gap-2"
        style={{ height: `${height}px` }}
      >
        {/* Simulated bar chart bars with varying heights */}
        {[60, 80, 45, 90, 70, 55, 85, 40, 75, 65].map((heightPercent, index) => (
          <div
            key={index}
            className="bg-gray-200 rounded-t w-full"
            style={{ height: `${heightPercent}%` }}
          ></div>
        ))}
      </div>
      
      {/* Legend skeleton */}
      <div className="mt-4 flex justify-center gap-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
