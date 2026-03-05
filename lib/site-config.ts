/**
 * Site Configuration Store
 * 
 * Manages site configurations with persistence to localStorage.
 * Provides CRUD operations, connection validation, and integration with environment config.
 */

import { SiteConfig, validateSiteConfig, generateSiteId, isValidUrl } from './env-config';

// Re-export SiteConfig for convenience
export type { SiteConfig } from './env-config';

// Storage schema for localStorage
export interface SitesStorage {
  version: number;
  sites: SiteConfig[];
  lastModified: string;
}

// localStorage keys
const STORAGE_KEY = 'erpnext-sites-config';
const STORAGE_VERSION = 1;

// In-memory cache
let sitesCache: SiteConfig[] | null = null;

/**
 * Loads sites from localStorage
 */
function loadFromStorage(): SiteConfig[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('[loadFromStorage] Storage key:', STORAGE_KEY);
    console.log('[loadFromStorage] Raw stored data:', stored ? 'exists' : 'null');
    
    if (!stored) {
      console.log('[loadFromStorage] No data in storage, returning empty array');
      return [];
    }
    
    const data: SitesStorage = JSON.parse(stored);
    console.log('[loadFromStorage] Parsed data version:', data.version);
    console.log('[loadFromStorage] Sites count:', data.sites?.length || 0);
    
    // Validate storage version
    if (data.version !== STORAGE_VERSION) {
      console.warn('[loadFromStorage] Storage version mismatch, clearing storage');
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    console.log('[loadFromStorage] Returning', data.sites?.length || 0, 'sites');
    return data.sites || [];
  } catch (error) {
    console.error('[loadFromStorage] Failed to load sites from storage:', error);
    return [];
  }
}

/**
 * Persists sites to localStorage
 */
function saveToStorage(sites: SiteConfig[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    console.log('[saveToStorage] Saving', sites.length, 'sites to storage');
    const data: SitesStorage = {
      version: STORAGE_VERSION,
      sites,
      lastModified: new Date().toISOString(),
    };
    
    const jsonString = JSON.stringify(data);
    console.log('[saveToStorage] JSON size:', jsonString.length, 'bytes');
    
    localStorage.setItem(STORAGE_KEY, jsonString);
    console.log('[saveToStorage] Successfully saved to key:', STORAGE_KEY);
    
    // Verify it was saved
    const verify = localStorage.getItem(STORAGE_KEY);
    console.log('[saveToStorage] Verification:', verify ? 'data exists' : 'FAILED - data not found!');
  } catch (error) {
    console.error('[saveToStorage] Failed to save sites to storage:', error);
  }
}

/**
 * Gets all sites from cache or storage
 */
export function getAllSites(): SiteConfig[] {
  if (sitesCache === null) {
    console.log('[getAllSites] Cache is null, loading from storage');
    sitesCache = loadFromStorage();
  } else {
    console.log('[getAllSites] Using cached sites:', sitesCache.length);
  }
  return [...sitesCache];
}

/**
 * Forces reload of sites from storage, bypassing cache
 */
export function reloadSites(): SiteConfig[] {
  console.log('[reloadSites] Forcing reload from storage, clearing cache');
  sitesCache = null; // Clear cache
  return getAllSites(); // This will reload from storage
}

/**
 * Gets a specific site by ID
 */
export function getSite(id: string): SiteConfig | undefined {
  const sites = getAllSites();
  return sites.find(s => s.id === id);
}

/**
 * Adds a new site configuration
 */
export function addSite(config: Omit<SiteConfig, 'id'>): SiteConfig {
  console.log('[addSite] Adding new site:', config.name);
  const sites = getAllSites();
  console.log('[addSite] Current sites count:', sites.length);
  
  // Generate ID from name
  const id = generateSiteId(config.name);
  console.log('[addSite] Generated ID:', id);
  
  // Check for duplicate name
  if (sites.some(s => s.id === id)) {
    console.error('[addSite] Duplicate site ID:', id);
    throw new Error(`Site with name "${config.name}" already exists`);
  }
  
  // Validate configuration
  const validation = validateSiteConfig({ ...config, id });
  if (!validation.valid) {
    console.error('[addSite] Validation failed:', validation.error);
    throw new Error(validation.error || 'Invalid site configuration');
  }
  
  // Create new site with timestamps
  const newSite: SiteConfig = {
    ...config,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  console.log('[addSite] New site created:', newSite.displayName, '(', newSite.id, ')');
  
  // Add to cache and persist
  sites.push(newSite);
  sitesCache = sites;
  saveToStorage(sites);
  
  console.log('[addSite] Site saved to storage. Total sites:', sites.length);
  console.log('[addSite] Verifying storage...');
  
  // Verify it was saved
  const verifyLoad = loadFromStorage();
  console.log('[addSite] Verification: sites in storage:', verifyLoad.length);
  
  return newSite;
}

/**
 * Updates an existing site configuration
 */
export function updateSite(id: string, updates: Partial<SiteConfig>): void {
  const sites = getAllSites();
  const index = sites.findIndex(s => s.id === id);
  
  if (index === -1) {
    throw new Error(`Site with ID "${id}" not found`);
  }
  
  // Merge updates with existing config
  const updatedSite: SiteConfig = {
    ...sites[index],
    ...updates,
    id, // Prevent ID changes
    updatedAt: new Date().toISOString(),
  };
  
  // Validate updated configuration
  const validation = validateSiteConfig(updatedSite);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid site configuration');
  }
  
  // Update cache and persist
  sites[index] = updatedSite;
  sitesCache = sites;
  saveToStorage(sites);
}

/**
 * Removes a site configuration
 */
export function removeSite(id: string): void {
  const sites = getAllSites();
  const filtered = sites.filter(s => s.id !== id);
  
  if (filtered.length === sites.length) {
    throw new Error(`Site with ID "${id}" not found`);
  }
  
  // Update cache and persist
  sitesCache = filtered;
  saveToStorage(filtered);
}

/**
 * Fetches company name from ERPNext site
 */
export async function fetchCompanyName(config: SiteConfig): Promise<string | null> {
  try {
    // Validate URL format first
    if (!isValidUrl(config.apiUrl)) {
      return null;
    }
    
    // Construct company list endpoint
    const url = `${config.apiUrl}/api/resource/Company?fields=["name","company_name"]&limit_page_length=1`;
    
    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].company_name || data.data[0].name;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch company name:', error);
    return null;
  }
}

/**
 * Validates a site connection by pinging the ERPNext API
 */
export async function validateSiteConnection(config: SiteConfig): Promise<boolean> {
  try {
    // Validate URL format first
    if (!isValidUrl(config.apiUrl)) {
      return false;
    }
    
    // Construct ping endpoint
    const url = `${config.apiUrl}/api/method/ping`;
    
    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.error('Site connection validation failed:', error);
    return false;
  }
}

/**
 * Persists current sites to localStorage
 */
export function persist(): void {
  const sites = getAllSites();
  saveToStorage(sites);
}

/**
 * Loads sites from environment variables if storage is empty
 */
export function loadFromEnvironment(): void {
  const sites = getAllSites();
  
  // Only load from environment if no sites configured
  if (sites.length > 0) {
    return;
  }
  
  // Import dynamically to avoid circular dependency
  import('./env-config').then(({ loadSitesFromEnvironment }) => {
    const envSites = loadSitesFromEnvironment();
    
    if (envSites.length > 0) {
      sitesCache = envSites;
      saveToStorage(envSites);
    }
  });
}

/**
 * Clears all sites from cache and storage (for testing)
 */
export function clearSites(): void {
  sitesCache = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
