'use client';

/**
 * Site Management UI
 * 
 * Admin interface for managing ERPNext site configurations.
 * Provides CRUD operations, connection testing, and site health monitoring.
 * 
 * Features:
 * - Site list table with display names, URLs, and status
 * - Add/Edit site modal with form validation
 * - Connection testing before saving
 * - Delete confirmation dialog
 * - Set default site
 * - Masked API secret input
 * - Responsive mobile-first design
 */

import React, { useState, useEffect } from 'react';
import { useSite } from '@/lib/site-context';
import {
  getAllSites,
  addSite,
  updateSite,
  removeSite,
  validateSiteConnection,
  type SiteConfig,
} from '@/lib/site-config';
import { getHealthMonitor, type HealthCheckResult } from '@/lib/site-health';

// Form data interface (without id for new sites)
interface SiteFormData {
  name: string;
  displayName: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  isDefault: boolean;
}

// Validation error interface
interface ValidationErrors {
  name?: string;
  displayName?: string;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
}

export default function SiteManagementPage(): React.ReactElement {
  const { refreshSites, activeSite } = useSite();
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<Map<string, HealthCheckResult>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null);
  const [deletingSite, setDeletingSite] = useState<SiteConfig | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    displayName: '',
    apiUrl: '',
    apiKey: '',
    apiSecret: '',
    isDefault: false,
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Load sites on mount
  useEffect(() => {
    loadSites();
  }, []);

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

  const loadSites = () => {
    const loadedSites = getAllSites();
    setSites(loadedSites);
  };

  const openAddModal = () => {
    setEditingSite(null);
    setFormData({
      name: '',
      displayName: '',
      apiUrl: '',
      apiKey: '',
      apiSecret: '',
      isDefault: false,
    });
    setValidationErrors({});
    setTestResult(null);
    setShowApiSecret(false);
    setIsModalOpen(true);
  };

  const openEditModal = (site: SiteConfig) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      displayName: site.displayName,
      apiUrl: site.apiUrl,
      apiKey: site.apiKey,
      apiSecret: site.apiSecret,
      isDefault: site.isDefault || false,
    });
    setValidationErrors({});
    setTestResult(null);
    setShowApiSecret(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
    setTestResult(null);
  };

  const openDeleteDialog = (site: SiteConfig) => {
    setDeletingSite(site);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingSite(null);
  };

  // Validate form using Zod-like validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Site name is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      errors.name = 'Site name must be lowercase alphanumeric with hyphens only';
    }
    
    // Display name validation
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    // API URL validation
    if (!formData.apiUrl.trim()) {
      errors.apiUrl = 'API URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.apiUrl)) {
      errors.apiUrl = 'API URL must start with http:// or https://';
    }
    
    // API Key validation
    if (!formData.apiKey.trim()) {
      errors.apiKey = 'API Key is required';
    }
    
    // API Secret validation
    if (!formData.apiSecret.trim()) {
      errors.apiSecret = 'API Secret is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!validateForm()) {
      setTestResult({ success: false, message: 'Please fix validation errors first' });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const testConfig: SiteConfig = {
        id: editingSite?.id || 'test',
        name: formData.name,
        displayName: formData.displayName,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret,
        isDefault: formData.isDefault,
      };
      
      const isValid = await validateSiteConnection(testConfig);
      
      if (isValid) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: 'Connection failed. Please check your credentials and URL.' });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save site
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (editingSite) {
        // Update existing site
        updateSite(editingSite.id, {
          name: formData.name,
          displayName: formData.displayName,
          apiUrl: formData.apiUrl,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          isDefault: formData.isDefault,
        });
      } else {
        // Add new site
        addSite({
          name: formData.name,
          displayName: formData.displayName,
          apiUrl: formData.apiUrl,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          isDefault: formData.isDefault,
        });
      }
      
      loadSites();
      refreshSites();
      closeModal();
    } catch (error) {
      alert(`Failed to save site: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete site
  const handleDelete = () => {
    if (!deletingSite) return;
    
    try {
      removeSite(deletingSite.id);
      loadSites();
      refreshSites();
      closeDeleteDialog();
    } catch (error) {
      alert(`Failed to delete site: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
          Unknown
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Site Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your ERPNext site configurations. Add, edit, or remove sites to connect to different ERPNext instances.
          </p>
        </div>

        {/* Add Site Button */}
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Site
          </button>
        </div>

        {/* Sites Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {sites.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sites configured</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new site.</p>
              <div className="mt-6">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Site
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      API URL
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Default
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sites.map((site) => (
                    <tr key={site.id} className={site.id === activeSite?.id ? 'bg-indigo-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {site.displayName}
                              {site.id === activeSite?.id && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{site.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{site.apiUrl}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(site.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {site.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(site)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteDialog(site)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Site Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                aria-hidden="true"
                onClick={closeModal}
              ></div>

              {/* Center modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                        {editingSite ? 'Edit Site' : 'Add New Site'}
                      </h3>
                      
                      <div className="mt-4 space-y-4">
                        {/* Display Name */}
                        <div>
                          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                            Display Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              validationErrors.displayName
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="e.g., Batasku Production"
                          />
                          {validationErrors.displayName && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.displayName}</p>
                          )}
                        </div>

                        {/* Site Name */}
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Site Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={!!editingSite}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              editingSite ? 'bg-gray-100 cursor-not-allowed' : ''
                            } ${
                              validationErrors.name
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="e.g., batasku-prod"
                          />
                          <p className="mt-1 text-xs text-gray-500">Lowercase alphanumeric with hyphens only</p>
                          {validationErrors.name && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                          )}
                        </div>

                        {/* API URL */}
                        <div>
                          <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700">
                            API URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="apiUrl"
                            value={formData.apiUrl}
                            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              validationErrors.apiUrl
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="https://example.erpnext.com"
                          />
                          {validationErrors.apiUrl && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.apiUrl}</p>
                          )}
                        </div>

                        {/* API Key */}
                        <div>
                          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                            API Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="apiKey"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              validationErrors.apiKey
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                            placeholder="Enter API key"
                          />
                          {validationErrors.apiKey && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.apiKey}</p>
                          )}
                        </div>

                        {/* API Secret */}
                        <div>
                          <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">
                            API Secret <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <input
                              type={showApiSecret ? 'text' : 'password'}
                              id="apiSecret"
                              value={formData.apiSecret}
                              onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                              className={`block w-full rounded-md shadow-sm sm:text-sm pr-10 ${
                                validationErrors.apiSecret
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                              placeholder="Enter API secret"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiSecret(!showApiSecret)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showApiSecret ? (
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {validationErrors.apiSecret && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.apiSecret}</p>
                          )}
                        </div>

                        {/* Is Default */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isDefault"
                            checked={formData.isDefault}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                            Set as default site
                          </label>
                        </div>

                        {/* Test Connection Button */}
                        <div>
                          <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isTesting ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Testing Connection...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test Connection
                              </>
                            )}
                          </button>
                        </div>

                        {/* Test Result */}
                        {testResult && (
                          <div className={`rounded-md p-4 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex">
                              <div className="flex-shrink-0">
                                {testResult.success ? (
                                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3">
                                <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                  {testResult.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Modal Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : (editingSite ? 'Update Site' : 'Add Site')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && deletingSite && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                aria-hidden="true"
                onClick={closeDeleteDialog}
              ></div>

              {/* Center modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Delete Site
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete <span className="font-semibold">{deletingSite.displayName}</span>? 
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
