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
    if (!stored) {
      return [];
    }
    
    const data: SitesStorage = JSON.parse(stored);
    
    // Validate storage version
    if (data.version !== STORAGE_VERSION) {
      console.warn('Storage version mismatch, clearing storage');
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    return data.sites || [];
  } catch (error) {
    console.error('Failed to load sites from storage:', error);
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
    const data: SitesStorage = {
      version: STORAGE_VERSION,
      sites,
      lastModified: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sites to storage:', error);
  }
}

/**
 * Gets all sites from cache or storage
 */
export function getAllSites(): SiteConfig[] {
  if (sitesCache === null) {
    sitesCache = loadFromStorage();
  }
  return [...sitesCache];
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
  const sites = getAllSites();
  
  // Generate ID from name
  const id = generateSiteId(config.name);
  
  // Check for duplicate name
  if (sites.some(s => s.id === id)) {
    throw new Error(`Site with name "${config.name}" already exists`);
  }
  
  // Validate configuration
  const validation = validateSiteConfig({ ...config, id });
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid site configuration');
  }
  
  // Create new site with timestamps
  const newSite: SiteConfig = {
    ...config,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Add to cache and persist
  sites.push(newSite);
  sitesCache = sites;
  saveToStorage(sites);
  
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
