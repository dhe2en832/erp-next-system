/**
 * Site Context Provider
 * 
 * React Context provider that maintains the active site state and provides
 * site switching functionality throughout the application.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteConfig, getAllSites, getSite, loadFromEnvironment } from './site-config';
import { getDefaultSite, loadSitesFromEnvironment } from './env-config';
import { performMigration } from './site-migration';

// localStorage key for active site persistence
const ACTIVE_SITE_KEY = 'erpnext-active-site';

/**
 * Site Context Value interface
 */
export interface SiteContextValue {
  // Currently active site configuration
  activeSite: SiteConfig | null;
  
  // All available site configurations
  sites: SiteConfig[];
  
  // Set the active site by ID
  setActiveSite: (siteId: string) => void;
  
  // Refresh sites list from storage
  refreshSites: () => void;
  
  // Loading state during initialization
  isLoading: boolean;
  
  // Error message if site loading fails
  error: string | null;
}

/**
 * Site Context
 */
const SiteContext = createContext<SiteContextValue | undefined>(undefined);

/**
 * Site Provider Props
 */
export interface SiteProviderProps {
  children: React.ReactNode;
}

/**
 * Site Provider Component
 * 
 * Provides site context to all child components.
 * Handles site initialization, persistence, and switching.
 */
export function SiteProvider({ children }: SiteProviderProps): React.ReactElement {
  const [activeSite, setActiveSiteState] = useState<SiteConfig | null>(null);
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the last selected site from localStorage
   */
  const loadLastSelectedSite = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const stored = localStorage.getItem(ACTIVE_SITE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.siteId || null;
      }
    } catch (error) {
      console.error('Failed to load last selected site:', error);
    }
    
    return null;
  }, []);

  /**
   * Persists the active site to localStorage
   */
  const persistActiveSite = useCallback((siteId: string | null): void => {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      if (siteId) {
        const data = {
          siteId,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(ACTIVE_SITE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(ACTIVE_SITE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist active site:', error);
    }
  }, []);

  /**
   * Clears cached data when switching sites
   */
  const clearCache = useCallback((): void => {
    // Clear any cached API data
    // This prevents data leakage between sites
    if (typeof window !== 'undefined') {
      // Clear session storage (if used for caching)
      sessionStorage.clear();
      
      // Note: We don't clear localStorage here as it contains site configs
      // Only clear site-specific cache keys if implemented
    }
  }, []);

  /**
   * Refreshes the sites list from storage
   */
  const refreshSites = useCallback((): void => {
    try {
      // console.log('[SiteContext] Refreshing sites from storage...');
      // Import reloadSites to force reload from localStorage
      import('./site-config').then(({ reloadSites }) => {
        const loadedSites = reloadSites(); // Force reload, bypass cache
        // console.log('[SiteContext] Reloaded sites:', loadedSites.length);
        setSites(loadedSites);
        
        // If active site no longer exists, clear it
        if (activeSite && !loadedSites.find(s => s.id === activeSite.id)) {
          // console.log('[SiteContext] Active site no longer exists, clearing');
          setActiveSiteState(null);
          persistActiveSite(null);
        }
      });
    } catch (error) {
      console.error('[SiteContext] Failed to refresh sites:', error);
      setError('Failed to load site configurations');
    }
  }, [activeSite, persistActiveSite]);

  /**
   * Sets the active site by ID
   */
  const setActiveSite = useCallback((siteId: string): void => {
    try {
      // console.log('[SiteContext] setActiveSite called with:', siteId);
      const site = getSite(siteId);
      
      if (!site) {
        console.error('[SiteContext] Site not found:', siteId);
        setError(`Site with ID "${siteId}" not found`);
        return;
      }
      
      // console.log('[SiteContext] Setting active site to:', site.displayName, '(', site.id, ')');
      
      // Clear cache when switching sites
      clearCache();
      
      // Update state and persist
      setActiveSiteState(site);
      persistActiveSite(siteId);
      
      // Set active_site cookie for API routes
      if (typeof document !== 'undefined') {
        document.cookie = `active_site=${siteId}; path=/; max-age=2592000`; // 30 days
        // console.log('[SiteContext] Cookie set for:', siteId);
      }
      
      // console.log('[SiteContext] Active site successfully set to:', site.displayName);
      setError(null);
    } catch (error) {
      console.error('[SiteContext] Failed to set active site:', error);
      setError('Failed to switch site');
    }
  }, [clearCache, persistActiveSite]);

  /**
   * Initialize sites on mount
   */
  useEffect(() => {
    const initializeSites = async () => {
      try {
        setIsLoading(true);
        
        // console.log('[SiteProvider] Initializing sites...');
        
        // Step 1: Run migration check on first load
        // This will detect legacy environment variables and migrate them
        const migrationResult = performMigration();
        if (migrationResult.success && migrationResult.migratedSite) {
          // console.log('[SiteProvider] Migration completed successfully:', migrationResult.migratedSite.id);
        } else if (migrationResult.hadLegacyConfig && !migrationResult.success) {
          console.error('[SiteProvider] Migration failed:', migrationResult.error);
          setError(`Migration failed: ${migrationResult.error}`);
        }
        
        // Step 2: Get all configured sites (force reload from storage)
        const { reloadSites } = await import('./site-config');
        let loadedSites = reloadSites(); // Force reload, bypass cache
        // console.log('[SiteProvider] Sites reloaded from storage:', loadedSites.length);
        
        // Step 3: If no sites configured, load from environment variables
        if (loadedSites.length === 0) {
          // console.log('[SiteProvider] No sites configured, loading from environment...');
          const envSites = loadSitesFromEnvironment();
          
          if (envSites.length > 0) {
            // console.log('[SiteProvider] Loaded sites from environment:', envSites.length);
            // Sites are automatically persisted by loadFromEnvironment
            loadFromEnvironment();
            loadedSites = getAllSites();
          }
        }
        
        // Step 3.5: Always ensure default demo site exists in storage
        const demoSiteId = 'demo-batasku-cloud';
        const oldDemoSiteId = 'demo-batasku'; // Old incorrect ID
        
        // Remove old demo site if exists
        const hasOldDemoSite = loadedSites.some(s => s.id === oldDemoSiteId);
        if (hasOldDemoSite) {
          // console.log('[SiteProvider] Removing old demo site with incorrect ID');
          const { removeSite } = await import('./site-config');
          try {
            removeSite(oldDemoSiteId);
            loadedSites = loadedSites.filter(s => s.id !== oldDemoSiteId);
          } catch (error) {
            console.warn('[SiteProvider] Could not remove old demo site:', error);
          }
        }
        
        const hasDemoSite = loadedSites.some(s => s.id === demoSiteId);
        
        if (!hasDemoSite) {
          // console.log('[SiteProvider] Adding default demo site to storage');
          const { addSite } = await import('./site-config');
          
          try {
            const demoSite = addSite({
              name: 'demo.batasku.cloud',
              displayName: 'Demo Batasku (Default)',
              apiUrl: 'https://demo.batasku.cloud',
              apiKey: '4618e5708dd3d06',
              apiSecret: '8984b4011e4a654',
              isDefault: loadedSites.length === 0, // Only set as default if no other sites
            });
            
            loadedSites = [...loadedSites, demoSite];
          } catch (error) {
            // If addSite fails (e.g., duplicate), just add to array
            console.warn('[SiteProvider] Could not add demo site to storage:', error);
            const demoSite = {
              id: demoSiteId,
              name: 'demo.batasku.cloud',
              displayName: 'Demo Batasku (Default)',
              apiUrl: 'https://demo.batasku.cloud',
              apiKey: '4618e5708dd3d06',
              apiSecret: '8984b4011e4a654',
              isDefault: loadedSites.length === 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            loadedSites = [...loadedSites, demoSite];
          }
        }
        
        setSites(loadedSites);
        // console.log('[SiteProvider] Sites loaded:', loadedSites.length);
        
        // Step 4: Try to restore last selected site
        const lastSiteId = loadLastSelectedSite();
        // console.log('[SiteProvider] Last selected site from localStorage:', lastSiteId);
        let siteToActivate: SiteConfig | null = null;
        
        if (lastSiteId) {
          siteToActivate = loadedSites.find(s => s.id === lastSiteId) || null;
          if (siteToActivate) {
            // console.log('[SiteProvider] Restored last selected site:', siteToActivate.displayName, '(', siteToActivate.id, ')');
          } else {
            console.warn('[SiteProvider] Last selected site not found in loaded sites:', lastSiteId);
          }
        }
        
        // Step 5: If no last site or it doesn't exist, use default site
        if (!siteToActivate) {
          siteToActivate = getDefaultSite(loadedSites);
          if (siteToActivate) {
            // console.log('[SiteProvider] Using default site:', siteToActivate.displayName, '(', siteToActivate.id, ')');
          }
        }
        
        // Step 6: Set the active site
        if (siteToActivate) {
          setActiveSiteState(siteToActivate);
          persistActiveSite(siteToActivate.id);
          // console.log('[SiteProvider] Active site set to:', siteToActivate.displayName, '(', siteToActivate.id, ')');
        } else {
          console.warn('[SiteProvider] No site could be activated');
        }
        
        setIsLoading(false);
        // console.log('[SiteProvider] Initialization complete');
      } catch (error) {
        console.error('[SiteProvider] Failed to initialize sites:', error);
        setError('Failed to initialize site configurations');
        setIsLoading(false);
      }
    };
    
    initializeSites();
  }, [loadLastSelectedSite, persistActiveSite]);

  const contextValue: SiteContextValue = {
    activeSite,
    sites,
    setActiveSite,
    refreshSites,
    isLoading,
    error,
  };

  return (
    <SiteContext.Provider value={contextValue}>
      {children}
    </SiteContext.Provider>
  );
}

/**
 * useSite Hook
 * 
 * Custom hook to access site context in components.
 * Throws an error if used outside of SiteProvider.
 */
export function useSite(): SiteContextValue {
  const context = useContext(SiteContext);
  
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  
  return context;
}
