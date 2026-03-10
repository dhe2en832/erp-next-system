'use client';

export function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  // Only show in development and staging
  // Hidden by user request even in development if desired, 
  // but specifically requested to be hidden because it shows 'Development' in production.
  return null;
  
  const colors = {
    development: 'bg-blue-500',
    staging: 'bg-yellow-500',
    production: 'bg-red-500',
  };
  
  return (
    <div className={`fixed bottom-4 right-4 ${colors[env as keyof typeof colors]} text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-50`}>
      {env.toUpperCase()}
    </div>
  );
}