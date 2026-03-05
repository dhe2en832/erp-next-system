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
  const { sites, setActiveSite, activeSite, isLoading } = useSite();
  const [healthStatuses, setHealthStatuses] = useState<Map<string, HealthCheckResult>>(new Map());
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Subscribe to health status updates
  useEffect(() => {
    const monitor = getHealthMonitor();
    
    // Get initial statuses
    const initialStatuses = monitor.getAllStatuses();
    const statusMap = new Map(initialStatuses.map(s => [s.siteId, s]));
    setHealthStatuses(statusMap);
    
    // Subscribe to updates
    const unsubscribe = monitor.subscribe((results) => {
      const statusMap = new Map(results.map(s => [s.siteId, s]));
      setHealthStatuses(statusMap);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

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
      setActiveSite(selectedSiteId);
      router.push('/login');
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
          <span className="w-1.5 h-1.5 mr-1 bg-green-600 rounded-full"></span>
          Online
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          <span className="w-1.5 h-1.5 mr-1 bg-red-600 rounded-full"></span>
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
            
            return (
              <button
                key={site.id}
                onClick={() => handleSiteSelect(site.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{site.displayName}</h3>
                        <p className="text-sm text-gray-500">{site.apiUrl}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {renderStatusBadge(site.id)}
                    {status?.isOnline && status.responseTime !== undefined && (
                      <span className="text-xs text-gray-500">
                        {status.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

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
              <p className="text-sm text-blue-800 mb-2">
                Pilih site ERPNext yang ingin Anda akses. Anda bisa mengganti site kapan saja setelah login dari menu Pengaturan.
              </p>
              <p className="text-xs text-blue-700">
                Untuk menambah atau mengelola site, login sebagai administrator dan buka Pengaturan → Manajemen Sites.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
