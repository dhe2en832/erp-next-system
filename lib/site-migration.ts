/**
 * Site Migration Utility
 * 
 * Handles automatic migration from single-site to multi-site configuration.
 * Detects legacy environment variables and creates SiteConfig from them.
 */

import { 
  SiteConfig, 
  detectLegacyConfig, 
  migrateLegacyConfig as migrateLegacyToSiteConfig,
  MigrationResult 
} from './env-config';
import { getAllSites, addSite } from './site-config';

// localStorage key for migration status
const MIGRATION_STATUS_KEY = 'erpnext-migration-status';

export interface MigrationStatus {
  completed: boolean;
  timestamp: string;
  migratedSiteId?: string;
  error?: string;
}

/**
 * Checks if migration has already been completed
 */
export function hasMigrationCompleted(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const stored = localStorage.getItem(MIGRATION_STATUS_KEY);
    if (!stored) {
      return false;
    }
    
    const status: MigrationStatus = JSON.parse(stored);
    return status.completed === true;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}

/**
 * Marks migration as completed
 */
function markMigrationCompleted(migratedSiteId?: string, error?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const status: MigrationStatus = {
      completed: true,
      timestamp: new Date().toISOString(),
      migratedSiteId,
      error,
    };
    
    localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Failed to mark migration as completed:', error);
  }
}

/**
 * Performs migration from single-site to multi-site configuration
 * 
 * This function:
 * 1. Detects legacy environment variables
 * 2. Creates a SiteConfig from the legacy format
 * 3. Persists the migrated configuration to localStorage
 * 4. Marks migration as completed
 * 
 * @returns MigrationResult with success status and migrated site
 */
export function performMigration(): MigrationResult {
  console.log('[Migration] Starting migration check...');
  
  // Check if migration already completed
  if (hasMigrationCompleted()) {
    console.log('[Migration] Migration already completed, skipping');
    return {
      success: true,
      migratedSite: null,
      error: null,
      hadLegacyConfig: false,
    };
  }
  
  // Check if sites already configured
  const existingSites = getAllSites();
  if (existingSites.length > 0) {
    console.log('[Migration] Sites already configured, marking migration as complete');
    markMigrationCompleted();
    return {
      success: true,
      migratedSite: null,
      error: null,
      hadLegacyConfig: false,
    };
  }
  
  // Detect legacy configuration
  const hasLegacy = detectLegacyConfig();
  if (!hasLegacy) {
    console.log('[Migration] No legacy configuration found');
    markMigrationCompleted();
    return {
      success: false,
      migratedSite: null,
      error: 'No legacy configuration found',
      hadLegacyConfig: false,
    };
  }
  
  console.log('[Migration] Legacy configuration detected, migrating...');
  
  // Migrate legacy config to SiteConfig
  const migrationResult = migrateLegacyToSiteConfig();
  
  if (!migrationResult.success || !migrationResult.migratedSite) {
    console.error('[Migration] Migration failed:', migrationResult.error);
    markMigrationCompleted(undefined, migrationResult.error || undefined);
    return migrationResult;
  }
  
  // Persist migrated site to storage
  try {
    const addedSite = addSite(migrationResult.migratedSite);
    console.log('[Migration] Successfully migrated site:', addedSite.id);
    
    markMigrationCompleted(addedSite.id);
    
    return {
      success: true,
      migratedSite: addedSite,
      error: null,
      hadLegacyConfig: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Migration] Failed to persist migrated site:', errorMessage);
    
    markMigrationCompleted(undefined, errorMessage);
    
    return {
      success: false,
      migratedSite: null,
      error: `Failed to persist migrated site: ${errorMessage}`,
      hadLegacyConfig: true,
    };
  }
}

/**
 * Resets migration status (for testing purposes)
 */
export function resetMigrationStatus(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(MIGRATION_STATUS_KEY);
    console.log('[Migration] Migration status reset');
  } catch (error) {
    console.error('Failed to reset migration status:', error);
  }
}

/**
 * Gets the current migration status
 */
export function getMigrationStatus(): MigrationStatus | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(MIGRATION_STATUS_KEY);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return null;
  }
}
