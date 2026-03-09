'use client';

/**
 * Site Selection Page
 * 
 * Allows users to select which ERPNext site to connect to before login.
 * Similar to company selection flow.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/lib/site-context';
import { getHealthMonitor, type HealthCheckResult } from '@/lib/site-health';

export default function SelectSitePage() {
  const router = useRouter();
  const { sites, setActiveSite, activeSite, isLoading, refreshSites } = useSite();
  const [healthStatuses, setHealthStatuses] = useState<Map<string, HealthCheckResult>>(new Map());
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [companyNames, setCompanyNames] = useState<Map<string, string>>(new Map());
  const [fetchingCompanies, setFetchingCompanies] = useState<Set<string>>(new Set());
  const [showAddSiteForm, setShowAddSiteForm] = useState(false);
  const [addSiteData, setAddSiteData] = useState({
    siteName: '',
    apiKey: '',
    apiSecret: '',
  });
  const [addingSite, setAddingSite] = useState(false);
  const [addSiteError, setAddSiteError] = useState('');

  // Fetch company name for a site
  const fetchCompanyForSite = async (site: any) => {
    if (companyNames.has(site.id) || fetchingCompanies.has(site.id)) {
      return; // Already fetched or fetching
    }

    // Use cached company name if available
    if (site.companyName) {
      setCompanyNames(prev => new Map(prev).set(site.id, site.companyName));
      return;
    }

    setFetchingCompanies(prev => new Set(prev).add(site.id));

    try {
      const url = `${site.apiUrl}/api/resource/Company?fields=["name","company_name"]&limit_page_length=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${site.apiKey}:${site.apiSecret}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const companyName = data.data[0].company_name || data.data[0].name;
          setCompanyNames(prev => new Map(prev).set(site.id, companyName));
        }
      }
    } catch (error) {
      // Silently fail - company name is optional
      console.log(`Could not fetch company name for site ${site.id}`);
    } finally {
      setFetchingCompanies(prev => {
        const next = new Set(prev);
        next.delete(site.id);
        return next;
      });
    }
  };

  // Fetch company names for all sites on mount
  useEffect(() => {
    sites.forEach(site => {
      fetchCompanyForSite(site);
    });
  }, [sites]);

  // Subscribe to health status updates
  useEffect(() => {
    const monitor = getHealthMonitor();
    
    // Set sites to monitor
    monitor.setSites(sites);
    
    // Get initial statuses
    const initialStatuses = monitor.getAllStatuses();
    const statusMap = new Map(initialStatuses.map(s => [s.siteId, s]));
    setHealthStatuses(statusMap);
    
    // Start monitoring with 60 second interval
    monitor.startMonitoring(60000);
    
    // Subscribe to updates
    const unsubscribe = monitor.subscribe((results) => {
      const statusMap = new Map(results.map(s => [s.siteId, s]));
      setHealthStatuses(statusMap);
    });
    
    return () => {
      unsubscribe();
      monitor.stopMonitoring();
    };
  }, [sites]);

  // Pre-select active site if exists
  useEffect(() => {
    if (activeSite && !selectedSiteId) {
      setSelectedSiteId(activeSite.id);
    }
  }, [activeSite, selectedSiteId]);

  const handleSiteSelect = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  const handleContinue = () => {
    if (selectedSiteId) {
      console.log('[SelectSite] Setting active site to:', selectedSiteId);
      setActiveSite(selectedSiteId);
      
      // Set active_site cookie for API routes
      document.cookie = `active_site=${selectedSiteId}; path=/; max-age=2592000`; // 30 days
      console.log('[SelectSite] Cookie set, active site:', selectedSiteId);
      
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        console.log('[SelectSite] Navigating to login...');
        router.push('/login');
      }, 100);
    } else {
      console.warn('[SelectSite] No site selected, cannot continue');
      alert('Silakan pilih site terlebih dahulu');
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    // Confirm deletion
    if (!confirm(`Apakah Anda yakin ingin menghapus site "${siteName}"?`)) {
      return;
    }

    try {
      // Import removeSite function
      const { removeSite } = await import('@/lib/site-config');

      // Remove site from storage
      removeSite(siteId);

      // If deleted site was selected, clear selection
      if (selectedSiteId === siteId) {
        setSelectedSiteId(null);
      }

      // Refresh sites list
      refreshSites();
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert(error instanceof Error ? error.message : 'Gagal menghapus site');
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSiteError('');
    setAddingSite(true);

    try {
      // Validate site name format
      const siteName = addSiteData.siteName.trim().toLowerCase();
      if (!siteName.endsWith('.batasku.cloud')) {
        setAddSiteError('Site name harus berakhiran .batasku.cloud (contoh: bac.batasku.cloud)');
        setAddingSite(false);
        return;
      }

      // Validate API Key and Secret
      const apiKey = addSiteData.apiKey.trim();
      const apiSecret = addSiteData.apiSecret.trim();
      
      if (!apiKey || !apiSecret) {
        setAddSiteError('API Key dan Secret harus diisi untuk validasi');
        setAddingSite(false);
        return;
      }

      // Build site config
      const apiUrl = `https://${siteName}`;
      const displayName = siteName.split('.')[0].toUpperCase();
      const siteId = siteName.replace(/\./g, '-');

      // Validate connection to ERPNext via backend API (no CORS issues!)
      try {
        const response = await fetch('/api/sites/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteUrl: apiUrl,
            apiKey: apiKey,
            apiSecret: apiSecret,
          }),
        });

        const result = await response.json();

        if (!result.valid) {
          setAddSiteError(result.message || 'Validasi gagal. Periksa URL, API Key, dan Secret.');
          setAddingSite(false);
          return;
        }

        // Validation successful!
        console.log('[Add Site] Validation successful for:', siteName);
      } catch (error) {
        console.error('[Add Site] Validation failed:', error);
        
        if (error instanceof Error) {
          setAddSiteError(`Error validasi: ${error.message}`);
        } else {
          setAddSiteError('Tidak dapat memvalidasi site. Coba lagi nanti.');
        }
        
        setAddingSite(false);
        return;
      }

      // Import addSite function
      const { addSite } = await import('@/lib/site-config');

      // Add site with 'env' marker (credentials will be loaded from environment)
      // We validated with user-provided credentials, but we don't store them in localStorage
      // Instead, admin should add them to environment variables
      addSite({
        name: siteName,
        displayName: displayName,
        apiUrl: apiUrl,
        apiKey: 'env', // Will be loaded from environment
        apiSecret: 'env', // Will be loaded from environment
      });

      // Refresh sites list
      refreshSites();

      // Reset form
      setAddSiteData({ siteName: '', apiKey: '', apiSecret: '' });
      setShowAddSiteForm(false);
      setAddingSite(false);
    } catch (error) {
      console.error('Failed to add site:', error);
      setAddSiteError(error instanceof Error ? error.message : 'Gagal menambahkan site');
      setAddingSite(false);
    }
  };

  // Removed handleManageSites - users should configure sites via environment variables or after login

  // Get health status for a site
  const getHealthStatus = (siteId: string): HealthCheckResult | undefined => {
    return healthStatuses.get(siteId);
  };

  // Render status badge
  const renderStatusBadge = (siteId: string) => {
    const status = getHealthStatus(siteId);
    
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
          Checking...
        </span>
      );
    }

    if (status.isOnline) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Online
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Offline
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sites...</p>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Memuat Konfigurasi...</h2>
          <p className="text-gray-600 mb-6">
            Mohon tunggu sebentar.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pilih Site ERPNext</h1>
          <p className="text-gray-600">Pilih site yang ingin Anda akses</p>
        </div>

        {/* Site List */}
        <div className="space-y-3 mb-6">
          {sites.map((site) => {
            const isSelected = selectedSiteId === site.id;
            const status = getHealthStatus(site.id);
            const companyName = companyNames.get(site.id);
            const isFetchingCompany = fetchingCompanies.has(site.id);
            const isActiveSite = activeSite?.id === site.id;
            
            return (
              <div
                key={site.id}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleSiteSelect(site.id)}
                    className="flex-1 text-left flex items-center"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{site.displayName}</h3>
                        {isActiveSite && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                            Aktif
                          </span>
                        )}
                      </div>
                      {/* URL hidden for security */}
                      {/* Company Name */}
                      {isFetchingCompany ? (
                        <p className="text-xs text-gray-400 mt-1">Memuat nama perusahaan...</p>
                      ) : companyName ? (
                        <p className="text-sm text-indigo-600 font-medium mt-1">{companyName}</p>
                      ) : site.companyName ? (
                        <p className="text-sm text-indigo-600 font-medium mt-1">{site.companyName}</p>
                      ) : null}
                    </div>
                  </button>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    {renderStatusBadge(site.id)}
                    {status?.isOnline && status.responseTime !== undefined && (
                      <span className="text-xs text-gray-500">
                        {status.responseTime}ms
                      </span>
                    )}
                    
                    {/* Delete Button - Only show if not active site */}
                    {!isActiveSite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSite(site.id, site.displayName);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus site"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Site Form */}
        {showAddSiteForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-indigo-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Site Baru</h3>
            <form onSubmit={handleAddSite} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Site
                </label>
                <input
                  type="text"
                  value={addSiteData.siteName}
                  onChange={(e) => setAddSiteData({ ...addSiteData, siteName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="mycompany.batasku.cloud"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Contoh: mycompany.batasku.cloud, branch1.batasku.cloud</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={addSiteData.apiKey}
                  onChange={(e) => setAddSiteData({ ...addSiteData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
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
                  value={addSiteData.apiSecret}
                  onChange={(e) => setAddSiteData({ ...addSiteData, apiSecret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="API Secret dari ERPNext"
                  required
                />
              </div>

              {addSiteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {addSiteError}
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Catatan:</strong> API Key dan Secret digunakan untuk validasi bahwa site dapat diakses. 
                  Setelah validasi berhasil, credentials TIDAK disimpan di browser. 
                  Admin harus menambahkan credentials ke environment variables dan restart server.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingSite}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {addingSite ? 'Memvalidasi...' : 'Tambah Site'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSiteForm(false);
                    setAddSiteError('');
                    setAddSiteData({ siteName: '', apiKey: '', apiSecret: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Site Button */}
        {!showAddSiteForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddSiteForm(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
            >
              + Tambah Site Baru
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleContinue}
            disabled={!selectedSiteId}
            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Lanjutkan ke Login
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                Pilih site ERPNext yang ingin Anda akses. Setelah login, Anda bisa mengganti site dari menu Pengaturan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
