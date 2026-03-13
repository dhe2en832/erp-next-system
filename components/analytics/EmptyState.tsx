'use client';

/**
 * Empty State Component
 * 
 * Displays a friendly empty state when no data is available
 * for analytics components.
 * 
 * Requirements: 1.4, 4.5, 14.2
 */

import { BarChart3, TrendingUp, Package, Users } from 'lucide-react';

interface EmptyStateProps {
  /** Title message to display */
  title?: string;
  /** Description message to display */
  message: string;
  /** Icon type to display (default: 'chart') */
  icon?: 'chart' | 'trending' | 'package' | 'users';
  /** Custom className for additional styling */
  className?: string;
}

export default function EmptyState({
  title = 'Tidak Ada Data',
  message,
  icon = 'chart',
  className = '',
}: EmptyStateProps) {
  // Icon mapping
  const icons = {
    chart: BarChart3,
    trending: TrendingUp,
    package: Package,
    users: Users,
  };
  
  const IconComponent = icons[icon];
  
  return (
    <div className={`bg-white rounded-lg shadow p-8 ${className}`}>
      <div className="flex flex-col items-center justify-center text-center py-8">
        {/* Icon */}
        <div className="mb-4 p-4 bg-gray-100 rounded-full">
          <IconComponent className="w-12 h-12 text-gray-400" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        {/* Message */}
        <p className="text-sm text-gray-600 max-w-md">
          {message}
        </p>
      </div>
    </div>
  );
}
