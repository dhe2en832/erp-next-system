'use client';

/**
 * Site Guard Component
 * 
 * Ensures user has selected a site and is authenticated before accessing protected pages.
 * Redirects to /select-site if no active site is selected.
 * Redirects to /login if not authenticated.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/lib/site-context';

// Pages that don't require site selection or authentication
const PUBLIC_PATHS = [
  '/select-site', // Site selection page (before login)
  '/login', // Login page handles site check internally
  '/select-company', // Company selection after login
];

export function SiteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeSite, isLoading } = useSite();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status
  useEffect(() => {
    // Skip check for public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      setIsAuthenticated(true); // Allow access to public paths
      return;
    }

    // Check if user has login data
    const checkAuth = () => {
      const loginData = localStorage.getItem('loginData');
      if (!loginData) {
        console.log('[SiteGuard] No login data, redirecting to /login');
        setIsAuthenticated(false);
        router.replace('/login'); // Use replace to prevent back button
        return;
      }
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [pathname, router]);

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
      router.replace('/select-site'); // Use replace to prevent back button
    }
  }, [activeSite, isLoading, pathname, router]);

  // Show loading state while checking
  if ((isLoading || isAuthenticated === null) && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or no active site (except for public paths)
  if ((!isAuthenticated || !activeSite) && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }

  return <>{children}</>;
}
