/**
 * Environment Configuration Parser for Multi-Site Support
 * 
 * This module handles parsing and validation of environment variables for both:
 * 1. Legacy single-site format (ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET)
 * 2. New multi-site format (ERPNEXT_SITES as JSON string)
 * 
 * It also provides migration utilities to convert from legacy to multi-site format.
 */

export interface SiteConfig {
  id: string;
  name: string;
  displayName: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  companyName?: string; // Company name fetched from ERPNext
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnvironmentConfig {
  // Legacy single-site format
  ERPNEXT_API_URL?: string;
  ERP_API_KEY?: string;
  ERP_API_SECRET?: string;
  
  // Multi-site format (JSON string)
  ERPNEXT_SITES?: string;
  
  // Default site for multi-site setup
  ERPNEXT_DEFAULT_SITE?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedSite: SiteConfig | null;
  error: string | null;
  hadLegacyConfig: boolean;
}

/**
 * Validates a URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates a site ID from the site name (kebab-case)
 */
export function generateSiteId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Generates a site name from URL (for migration)
 */
export function generateSiteNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    // Remove common TLDs and convert to kebab-case
    const name = hostname
      .replace(/\.(com|cloud|local|net|org)$/, '')
      .replace(/\./g, '-');
    return name;
  } catch {
    return 'default-site';
  }
}

/**
 * Validates a site configuration
 */
export function validateSiteConfig(config: Partial<SiteConfig>): ValidationResult {
  // Check required fields
  if (!config.name || config.name.trim() === '') {
    return { valid: false, error: 'Site name is required' };
  }
  
  if (!config.displayName || config.displayName.trim() === '') {
    return { valid: false, error: 'Display name is required' };
  }
  
  if (!config.apiUrl || config.apiUrl.trim() === '') {
    return { valid: false, error: 'API URL is required' };
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }
  
  if (!config.apiSecret || config.apiSecret.trim() === '') {
    return { valid: false, error: 'API secret is required' };
  }
  
  // Validate URL format
  if (!isValidUrl(config.apiUrl)) {
    return { valid: false, error: 'Invalid URL format. Must be http:// or https://' };
  }
  
  // Allow 'env' as placeholder for environment-based credentials
  // These will be loaded from environment variables at runtime
  
  return { valid: true };
}

/**
 * Detects if legacy single-site environment variables are present
 */
export function detectLegacyConfig(env: EnvironmentConfig = process.env as EnvironmentConfig): boolean {
  return !!(
    env.ERPNEXT_API_URL &&
    env.ERP_API_KEY &&
    env.ERP_API_SECRET
  );
}

/**
 * Migrates legacy single-site configuration to multi-site format
 */
export function migrateLegacyConfig(env: EnvironmentConfig = process.env as EnvironmentConfig): MigrationResult {
  const hadLegacyConfig = detectLegacyConfig(env);
  
  if (!hadLegacyConfig) {
    return {
      success: false,
      migratedSite: null,
      error: 'No legacy configuration found',
      hadLegacyConfig: false,
    };
  }
  
  try {
    const apiUrl = env.ERPNEXT_API_URL!;
    const apiKey = env.ERP_API_KEY!;
    const apiSecret = env.ERP_API_SECRET!;
    
    const siteName = generateSiteNameFromUrl(apiUrl);
    const siteId = generateSiteId(siteName);
    
    const migratedSite: SiteConfig = {
      id: siteId,
      name: siteName,
      displayName: `${siteName.charAt(0).toUpperCase() + siteName.slice(1).replace(/-/g, ' ')}`,
      apiUrl,
      apiKey,
      apiSecret,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Validate the migrated config
    const validation = validateSiteConfig(migratedSite);
    if (!validation.valid) {
      return {
        success: false,
        migratedSite: null,
        error: `Migration validation failed: ${validation.error}`,
        hadLegacyConfig: true,
      };
    }
    
    return {
      success: true,
      migratedSite,
      error: null,
      hadLegacyConfig: true,
    };
  } catch (error) {
    return {
      success: false,
      migratedSite: null,
      error: error instanceof Error ? error.message : 'Unknown migration error',
      hadLegacyConfig: true,
    };
  }
}

/**
 * Parses multi-site configuration from ERPNEXT_SITES environment variable
 */
export function parseMultiSiteConfig(env: EnvironmentConfig = process.env as EnvironmentConfig): SiteConfig[] {
  if (!env.ERPNEXT_SITES) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(env.ERPNEXT_SITES);
    
    if (!Array.isArray(parsed)) {
      console.error('ERPNEXT_SITES must be a JSON array');
      return [];
    }
    
    const sites: SiteConfig[] = [];
    
    for (const site of parsed) {
      // Generate ID if not provided
      if (!site.id && site.name) {
        site.id = generateSiteId(site.name);
      }
      
      // Validate each site
      const validation = validateSiteConfig(site);
      if (!validation.valid) {
        console.error(`Invalid site configuration for ${site.name || 'unknown'}: ${validation.error}`);
        continue;
      }
      
      sites.push({
        ...site,
        createdAt: site.createdAt || new Date().toISOString(),
        updatedAt: site.updatedAt || new Date().toISOString(),
      });
    }
    
    return sites;
  } catch (error) {
    console.error('Failed to parse ERPNEXT_SITES:', error);
    return [];
  }
}

/**
 * Loads site configurations from environment variables
 * Priority: ERPNEXT_SITES > legacy single-site
 */
export function loadSitesFromEnvironment(env: EnvironmentConfig = process.env as EnvironmentConfig): SiteConfig[] {
  // Try multi-site format first
  const multiSites = parseMultiSiteConfig(env);
  if (multiSites.length > 0) {
    return multiSites;
  }
  
  // Fall back to legacy single-site migration
  const migration = migrateLegacyConfig(env);
  if (migration.success && migration.migratedSite) {
    return [migration.migratedSite];
  }
  
  // No configuration found
  return [];
}

/**
 * Gets the default site from environment or site list
 * If no sites configured, returns demo.batasku.cloud as default
 */
export function getDefaultSite(
  sites: SiteConfig[],
  env: EnvironmentConfig = process.env as EnvironmentConfig
): SiteConfig | null {
  if (sites.length === 0) {
    // Return demo.batasku.cloud as default if no sites configured
    return {
      id: 'demo-batasku-cloud',
      name: 'demo.batasku.cloud',
      displayName: 'Demo Batasku',
      apiUrl: 'https://demo.batasku.cloud',
      apiKey: '4618e5708dd3d06',
      apiSecret: '8984b4011e4a654',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Check if ERPNEXT_DEFAULT_SITE is specified
  if (env.ERPNEXT_DEFAULT_SITE) {
    const defaultSite = sites.find(
      s => s.id === env.ERPNEXT_DEFAULT_SITE || s.name === env.ERPNEXT_DEFAULT_SITE
    );
    if (defaultSite) {
      return defaultSite;
    }
  }
  
  // Find site marked as default
  const markedDefault = sites.find(s => s.isDefault);
  if (markedDefault) {
    return markedDefault;
  }
  
  // Return first site as fallback
  return sites[0];
}

/**
 * Validates environment configuration
 */
export function validateEnvironmentConfig(env: EnvironmentConfig = process.env as EnvironmentConfig): ValidationResult {
  const hasMultiSite = !!env.ERPNEXT_SITES;
  const hasLegacy = detectLegacyConfig(env);
  
  if (!hasMultiSite && !hasLegacy) {
    return {
      valid: false,
      error: 'No site configuration found. Set either ERPNEXT_SITES or legacy variables (ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET)',
    };
  }
  
  // Validate multi-site format if present
  if (hasMultiSite) {
    const sites = parseMultiSiteConfig(env);
    if (sites.length === 0) {
      return {
        valid: false,
        error: 'ERPNEXT_SITES is set but contains no valid site configurations',
      };
    }
  }
  
  // Validate legacy format if present
  if (hasLegacy && !hasMultiSite) {
    const migration = migrateLegacyConfig(env);
    if (!migration.success) {
      return {
        valid: false,
        error: `Legacy configuration is invalid: ${migration.error}`,
      };
    }
  }
  
  return { valid: true };
}
