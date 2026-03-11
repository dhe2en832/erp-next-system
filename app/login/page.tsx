'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/lib/site-context';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { activeSite, isLoading: siteLoading } = useSite();

  // Check if site is selected, redirect to site selection if not
  useEffect(() => {
    if (!siteLoading && !activeSite) {
      console.log('[LoginPage] No active site, redirecting to site selection');
      router.push('/select-site');
    }
  }, [activeSite, siteLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/setup/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usr: loginId,
          pwd: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsRedirecting(true);
        
        // Store login data in localStorage for company selection page
        localStorage.setItem('loginData', JSON.stringify({
          full_name: data.full_name,
          companies: data.companies,
          needs_company_selection: data.needs_company_selection,
          roles: data.roles || [],
        }));

        // Redirect to company selection
        if (data.needs_company_selection) {
          // Use window.location.href for immediate redirect
          window.location.href = '/select-company';
          return; // Stop execution here
        } else if (data.companies.length === 1) {
          // Auto-select single company (fallback)
          const companyResponse = await fetch('/api/setup/auth/set-company', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              company: data.companies[0].name,
            }),
          });

          if (companyResponse.ok) {
            localStorage.setItem('selected_company', data.companies[0].name);
            router.push('/dashboard');
          } else {
            setError('Gagal mengatur perusahaan');
          }
        } else {
          // Fallback to dashboard
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking site
  if (siteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa konfigurasi...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Masuk ke Sistem ERP
          </h2>
          {/* Active Site Indicator */}
          {activeSite && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <div className="text-center">
                  <p className="text-xs text-indigo-600 font-medium">Site Aktif</p>
                  <p className="text-sm font-semibold text-indigo-900">{activeSite.displayName}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="loginId" className="sr-only">
                Username or Email
              </label>
              <input
                id="loginId"
                name="loginId"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nama Pengguna atau Email"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Kata Sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>

          {/* Change Site Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/select-site')}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Ganti Site
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
