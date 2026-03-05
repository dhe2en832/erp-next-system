'use client';

/**
 * Site Guard Component
 * 
 * Ensures user has selected a site before accessing protected pages.
 * Redirects to /select-site if no active site is selected.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/lib/site-context';

// Pages that don't require site selection or handle it themselves
const PUBLIC_PATHS = [
  '/select-site', // Site selection page (before login)
  '/login', // Login page handles site check internally
  '/select-company', // Company selection after login
];

export function SiteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeSite, isLoading } = useSite();

  useEffect(() => {
    // Skip check for public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      return;
    }

    // Wait for site context to load
    if (isLoading) {
      return;
    }

    // Redirect to site selection if no active site
    if (!activeSite) {
      console.log('[SiteGuard] No active site, redirecting to /select-site');
      router.push('/select-site');
    }
  }, [activeSite, isLoading, pathname, router]);

  // Show loading state while checking
  if (isLoading && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa konfigurasi site...</p>
        </div>
      </div>
    );
  }

  // Don't render children if no active site (except for public paths)
  if (!activeSite && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }

  return <>{children}</>;
}
