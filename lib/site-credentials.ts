/**
 * Site Credentials Loader
 * 
 * Loads API credentials from environment variables for sites added via UI.
 * Format: SITE_<SITE_ID>_API_KEY and SITE_<SITE_ID>_API_SECRET
 * 
 * Security: Credentials are NEVER stored in localStorage/browser.
 * They must be configured in environment variables (.env files).
 */

import { SiteConfig } from './env-config';

/**
 * Generates environment variable key from site ID
 * Example: bac-batasku-cloud -> SITE_BAC_BATASKU_CLOUD
 */
function generateEnvKey(siteId: string): string {
  return `SITE_${siteId.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Loads API credentials from environment variables for a site
 * Returns the credentials if found, otherwise returns the original values
 */
export function loadSiteCredentials(site: SiteConfig): { apiKey: string; apiSecret: string } {
  // If credentials are not 'env' marker, return as-is
  // (This handles legacy sites or sites with hardcoded credentials)
  if (site.apiKey !== 'env' && site.apiSecret !== 'env') {
    return {
      apiKey: site.apiKey,
      apiSecret: site.apiSecret,
    };
  }

  // Generate environment variable keys
  const envKeyPrefix = generateEnvKey(site.id);
  const apiKeyEnv = `${envKeyPrefix}_API_KEY`;
  const apiSecretEnv = `${envKeyPrefix}_API_SECRET`;

  // Load from environment
  const apiKey = process.env[apiKeyEnv];
  const apiSecret = process.env[apiSecretEnv];

  // If not found in environment, return placeholder
  if (!apiKey || !apiSecret) {
    console.warn(
      `[Site Credentials] Missing environment variables for site ${site.id}:`,
      `${apiKeyEnv} and ${apiSecretEnv}`
    );
    return {
      apiKey: site.apiKey, // Return original (likely 'env')
      apiSecret: site.apiSecret,
    };
  }

  return {
    apiKey,
    apiSecret,
  };
}

/**
 * Resolves a site configuration with credentials loaded from environment
 */
export function resolveSiteConfig(site: SiteConfig): SiteConfig {
  const credentials = loadSiteCredentials(site);
  
  return {
    ...site,
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
  };
}

/**
 * Checks if environment variables are configured for a site
 */
export function hasEnvironmentCredentials(siteId: string): boolean {
  const envKeyPrefix = generateEnvKey(siteId);
  const apiKeyEnv = `${envKeyPrefix}_API_KEY`;
  const apiSecretEnv = `${envKeyPrefix}_API_SECRET`;

  return !!(process.env[apiKeyEnv] && process.env[apiSecretEnv]);
}

/**
 * Gets the expected environment variable names for a site
 */
export function getExpectedEnvVars(siteId: string): { apiKey: string; apiSecret: string } {
  const envKeyPrefix = generateEnvKey(siteId);
  
  return {
    apiKey: `${envKeyPrefix}_API_KEY`,
    apiSecret: `${envKeyPrefix}_API_SECRET`,
  };
}
