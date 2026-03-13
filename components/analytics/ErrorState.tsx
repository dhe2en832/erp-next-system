'use client';

/**
 * Error State Component
 * 
 * Displays an error state with retry functionality when
 * data fetching fails for analytics components.
 * 
 * Requirements: 14.3, 14.5
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  /** Error message to display */
  message: string;
  /** Callback function to retry data fetching */
  onRetry?: () => void;
  /** Custom className for additional styling */
  className?: string;
}

export default function ErrorState({
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-8 ${className}`}>
      <div className="flex flex-col items-center justify-center text-center py-8">
        {/* Error Icon */}
        <div className="mb-4 p-4 bg-red-50 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Terjadi Kesalahan
        </h3>
        
        {/* Error Message */}
        <p className="text-sm text-gray-600 max-w-md mb-6">
          {message}
        </p>
        
        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
}
