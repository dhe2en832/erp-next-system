'use client';

/**
 * Site Selector Component
 * 
 * Dropdown component for selecting and switching between ERPNext sites.
 * Displays all configured sites with health status indicators and active site highlighting.
 * 
 * Features:
 * - Dropdown menu with all configured sites
 * - Visual indicator for active site
 * - Online/offline status badges
 * - Keyboard navigation support (arrow keys, enter, escape)
 * - Mobile-responsive design
 * - Loading state during site switching
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSite } from '@/lib/site-context';
import { getHealthMonitor } from '@/lib/site-health';
import type { HealthCheckResult } from '@/lib/site-health';

export interface SiteSelectorProps {
  className?: string;
  showStatus?: boolean;
}

export default function SiteSelector({ 
  className = '', 
  showStatus = true 
}: SiteSelectorProps): React.ReactElement {
  const { activeSite, sites, setActiveSite, isLoading: contextLoading } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<Map<string, HealthCheckResult>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev < sites.length - 1 ? prev + 1 : prev));
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < sites.length) {
          handleSiteSelect(sites[focusedIndex].id);
        }
        break;
      
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      
      case 'End':
        event.preventDefault();
        setFocusedIndex(sites.length - 1);
        break;
    }
  };

  // Handle site selection
  const handleSiteSelect = async (siteId: string) => {
    if (siteId === activeSite?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    
    try {
      setActiveSite(siteId);
      setIsOpen(false);
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Failed to switch site:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Get health status for a site
  const getHealthStatus = (siteId: string): HealthCheckResult | undefined => {
    return healthStatuses.get(siteId);
  };

  // Render status badge
  const renderStatusBadge = (siteId: string) => {
    if (!showStatus) return null;

    const status = getHealthStatus(siteId);
    
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          Unknown
        </span>
      );
    }

    if (status.isOnline) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <span className="w-1.5 h-1.5 mr-1 bg-green-600 rounded-full"></span>
          Online
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <span className="w-1.5 h-1.5 mr-1 bg-red-600 rounded-full"></span>
          Offline
        </span>
      );
    }
  };

  // Render response time
  const renderResponseTime = (siteId: string) => {
    if (!showStatus) return null;

    const status = getHealthStatus(siteId);
    
    if (status?.isOnline && status.responseTime !== undefined) {
      return (
        <span className="text-xs text-gray-500 ml-2">
          {status.responseTime}ms
        </span>
      );
    }

    return null;
  };

  if (contextLoading) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-pulse bg-gray-200 h-10 w-48 rounded-md"></div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className="text-sm text-gray-500">No sites configured</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={isSwitching}
        className="inline-flex items-center justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          {isSwitching ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Switching...
            </>
          ) : (
            <>
              <span className="font-semibold text-indigo-600">
                {activeSite?.displayName || 'Select Site'}
              </span>
              {activeSite && showStatus && (
                <span className="ml-2">
                  {renderStatusBadge(activeSite.id)}
                </span>
              )}
            </>
          )}
        </span>
        <svg
          className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="listbox"
        >
          <div className="py-1 max-h-96 overflow-auto">
            {sites.map((site, index) => {
              const isActive = site.id === activeSite?.id;
              const isFocused = index === focusedIndex;
              
              return (
                <button
                  key={site.id}
                  onClick={() => handleSiteSelect(site.id)}
                  className={`
                    w-full text-left px-4 py-3 text-sm transition-colors
                    ${isActive ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700'}
                    ${isFocused ? 'bg-gray-100' : ''}
                    ${!isActive && !isFocused ? 'hover:bg-gray-50' : ''}
                  `}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className={`font-medium ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {site.displayName}
                        </span>
                        {isActive && (
                          <svg
                            className="ml-2 h-5 w-5 text-indigo-600"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {site.name}
                      </div>
                    </div>
                    <div className="flex items-center ml-3">
                      {renderStatusBadge(site.id)}
                      {renderResponseTime(site.id)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
