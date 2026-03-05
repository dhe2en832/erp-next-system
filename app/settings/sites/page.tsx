'use client';

/**
 * Site Management Page
 * 
 * Allows users to add, edit, and remove ERPNext site configurations.
 * REQUIRES AUTHENTICATION - Only accessible after login.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/lib/site-context';
import { addSite, updateSite, removeSite, validateSiteConnection, fetchCompanyName } from '@/lib/site-config';
import type { SiteConfig } from '@/lib/env-config';

export default function SiteManagementPage() {
  const router = useRouter();
  const { sites, refreshSites, activeSite } = useSite();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    apiUrl: '',
    apiKey: '',
    apiSecret: '',
    isDefault: false,
  });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/setup/auth/me');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Not authenticated, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      apiUrl: '',
      apiKey: '',
      apiSecret: '',
      isDefault: false,
    });
    setEditingSite(null);
    setShowAddForm(false);
    setError('');
    setSuccess('');
  };

  const handleEdit = (site: SiteConfig) => {
    setFormData({
      name: site.name,
      displayName: site.displayName,
      apiUrl: site.apiUrl,
      apiKey: site.apiKey,
      apiSecret: site.apiSecret,
      isDefault: site.isDefault || false,
    });
    setEditingSite(site);
    setShowAddForm(true);
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus site ini?')) {
      return;
    }

    try {
      removeSite(siteId);
      refreshSites();
      setSuccess('Site berhasil dihapus');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus site');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidating(true);

    try {
      // Validate connection first
      const testConfig: SiteConfig = {
        id: formData.name,
        name: formData.name,
        displayName: formData.displayName,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret,
        isDefault: formData.isDefault,
      };

      const isValid = await validateSiteConnection(testConfig);
      if (!isValid) {
        setError('Koneksi ke site gagal. Periksa URL, API Key, dan API Secret.');
        setValidating(false);
        return;
      }

      // Fetch company name
      const companyName = await fetchCompanyName(testConfig);

      if (editingSite) {
        // Update existing site
        updateSite(editingSite.id, {
          ...formData,
          companyName: companyName || undefined,
        });
        setSuccess('Site berhasil diperbarui');
      } else {
        // Add new site
        addSite({
          ...formData,
          companyName: companyName || undefined,
        });
        setSuccess('Site berhasil ditambahkan');
      }

      refreshSites();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan site');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manajemen Sites</h1>
            <p className="text-gray-600 mt-2">Kelola konfigurasi ERPNext sites</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Add Site Button */}
      {!showAddForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            + Tambah Site Baru
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingSite ? 'Edit Site' : 'Tambah Site Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Site (ID)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="contoh: demo-batasku"
                  required
                  disabled={!!editingSite}
                />
                <p className="text-xs text-gray-500 mt-1">Format: huruf kecil, angka, dan tanda hubung</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Demo Batasku"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL API ERPNext
              </label>
              <input
                type="url"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://demo.batasku.cloud"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="API Key dari ERPNext"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="API Secret dari ERPNext"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                Jadikan site default
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={validating}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
              >
                {validating ? 'Memvalidasi...' : editingSite ? 'Perbarui Site' : 'Tambah Site'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sites List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sites Terdaftar</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {sites.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Belum ada site terdaftar. Tambahkan site pertama Anda.
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{site.displayName}</h3>
                      {site.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                          Default
                        </span>
                      )}
                      {activeSite?.id === site.id && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{site.apiUrl}</p>
                    {site.companyName && (
                      <p className="text-sm text-indigo-600 font-medium mt-1">{site.companyName}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">ID: {site.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(site)}
                      className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      disabled={activeSite?.id === site.id}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium mb-1">Cara mendapatkan API Key dan Secret:</p>
            <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
              <li>Login ke ERPNext sebagai Administrator</li>
              <li>Buka User → API Access → Generate Keys</li>
              <li>Salin API Key dan API Secret yang dihasilkan</li>
              <li>Paste ke form di atas</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
