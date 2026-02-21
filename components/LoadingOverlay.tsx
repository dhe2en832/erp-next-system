'use client';

/**
 * Loading Overlay Component
 * 
 * A full-screen or container overlay that shows loading state
 * and prevents user interaction during async operations.
 */

import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  fullScreen = false,
  className = '',
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-10';

  return (
    <div
      className={`
        ${containerClasses}
        bg-white/80 backdrop-blur-sm
        flex items-center justify-center
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size="lg" variant="primary" />
        {message && (
          <p className="text-sm font-medium text-gray-700">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
