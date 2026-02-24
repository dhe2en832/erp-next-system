'use client';

/**
 * Loading Spinner Component
 * 
 * A reusable loading spinner with different sizes and variants.
 * Used for indicating async operations in progress.
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  message?: string;  // ✅ TAMBAHAN: Optional prop untuk pesan loading
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary',
  className = '',
  message  // ✅ TAMBAHAN: Tidak wajib diisi
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const variantClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-full animate-spin
        `}
      >
        <span className="sr-only">Loading...</span>
      </div>
      
      {/* ✅ TAMBAHAN: Render message hanya jika ada */}
      {message && (
        <p className="mt-3 text-sm text-gray-600 text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
}