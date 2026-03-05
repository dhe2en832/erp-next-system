/**
 * Unit Tests for Environment Configuration Parser
 * Task 1: Set up environment configuration and migration utilities
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2
 */

import {
  isValidUrl,
  generateSiteId,
  generateSiteNameFromUrl,
  validateSiteConfig,
  detectLegacyConfig,
  migrateLegacyConfig,
  parseMultiSiteConfig,
  loadSitesFromEnvironment,
  getDefaultSite,
  validateEnvironmentConfig,
  type SiteConfig,
  type EnvironmentConfig,
} from '../../lib/env-config';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | void): void {
  try {
    const result = fn();
    if (result === false) {
      results.push({ name, passed: false, message: 'Assertion failed' });
    } else {
      results.push({ name, passed: true });
    }
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual: any, expected: any, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Test Suite: URL Validation
console.log('\n📋 Testing URL Validation...\n');

test('validates http URLs', () => {
  assert(isValidUrl('http://localhost:8000'), 'Should validate http://localhost:8000');
  assert(isValidUrl('http://batasku.local'), 'Should validate http://batasku.local');
});

test('validates https URLs', () => {
  assert(isValidUrl('https://bac.batasku.cloud'), 'Should validate https://bac.batasku.cloud');
  assert(isValidUrl('https://demo.batasku.cloud:8443'), 'Should validate https with port');
});

test('rejects invalid URL formats', () => {
  assert(!isValidUrl('not-a-url'), 'Should reject invalid URL');
  assert(!isValidUrl('ftp://invalid.com'), 'Should reject ftp protocol');
  assert(!isValidUrl(''), 'Should reject empty string');
});

// Test Suite: Site ID Generation
console.log('📋 Testing Site ID Generation...\n');

test('generates kebab-case IDs', () => {
  assertEqual(generateSiteId('Batasku Local'), 'batasku-local');
  assertEqual(generateSiteId('BAC Production'), 'bac-production');
});

test('removes special characters', () => {
  assertEqual(generateSiteId('Site@Name#123'), 'site-name-123');
  assertEqual(generateSiteId('Test_Site'), 'test-site');
});

test('handles already kebab-case names', () => {
  assertEqual(generateSiteId('batasku-local'), 'batasku-local');
});

// Test Suite: Site Name from URL
console.log('📋 Testing Site Name from URL...\n');

test('extracts name from local URLs', () => {
  assertEqual(generateSiteNameFromUrl('http://batasku.local:8000'), 'batasku');
  assertEqual(generateSiteNameFromUrl('http://demo.batasku.local'), 'demo-batasku');
});

test('extracts name from cloud URLs', () => {
  assertEqual(generateSiteNameFromUrl('https://bac.batasku.cloud'), 'bac-batasku');
  assertEqual(generateSiteNameFromUrl('https://cirebon.batasku.cloud'), 'cirebon-batasku');
});

test('handles invalid URLs gracefully', () => {
  assertEqual(generateSiteNameFromUrl('not-a-url'), 'default-site');
});

// Test Suite: Site Config Validation
console.log('📋 Testing Site Config Validation...\n');

const validConfig: SiteConfig = {
  id: 'test-site',
  name: 'test-site',
  displayName: 'Test Site',
  apiUrl: 'https://test.example.com',
  apiKey: 'test-key',
  apiSecret: 'test-secret',
};

test('accepts valid configuration', () => {
  const result = validateSiteConfig(validConfig);
  assert(result.valid, 'Should accept valid config');
  assert(!result.error, 'Should not have error');
});

test('rejects missing name', () => {
  const config = { ...validConfig, name: '' };
  const result = validateSiteConfig(config);
  assert(!result.valid, 'Should reject missing name');
  assert(!!result.error && result.error.includes('name is required'), 'Should have name error');
});

test('rejects missing display name', () => {
  const config = { ...validConfig, displayName: '' };
  const result = validateSiteConfig(config);
  assert(!result.valid, 'Should reject missing display name');
  assert(!!result.error && result.error.includes('Display name is required'), 'Should have display name error');
});

test('rejects invalid URL format', () => {
  const config = { ...validConfig, apiUrl: 'not-a-valid-url' };
  const result = validateSiteConfig(config);
  assert(!result.valid, 'Should reject invalid URL');
  assert(!!result.error && result.error.includes('Invalid URL format'), 'Should have URL format error');
});

// Test Suite: Legacy Detection
console.log('📋 Testing Legacy Configuration Detection...\n');

test('detects legacy configuration', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_API_URL: 'http://localhost:8000',
    ERP_API_KEY: 'test-key',
    ERP_API_SECRET: 'test-secret',
  };
  assert(detectLegacyConfig(env), 'Should detect complete legacy config');
});

test('returns false when legacy config is incomplete', () => {
  const env1: EnvironmentConfig = {
    ERPNEXT_API_URL: 'http://localhost:8000',
    ERP_API_KEY: 'test-key',
  };
  assert(!detectLegacyConfig(env1), 'Should not detect incomplete config');

  const env2: EnvironmentConfig = {};
  assert(!detectLegacyConfig(env2), 'Should not detect empty config');
});

// Test Suite: Legacy Migration
console.log('📋 Testing Legacy Migration...\n');

test('successfully migrates legacy configuration', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_API_URL: 'https://bac.batasku.cloud',
    ERP_API_KEY: 'test-key-12345',
    ERP_API_SECRET: 'test-secret-67890',
  };

  const result = migrateLegacyConfig(env);
  
  assert(result.success, 'Migration should succeed');
  assert(result.hadLegacyConfig, 'Should detect legacy config');
  assert(result.error === null, 'Should not have error');
  assert(result.migratedSite !== null, 'Should have migrated site');
  assertEqual(result.migratedSite?.apiUrl, 'https://bac.batasku.cloud');
  assertEqual(result.migratedSite?.apiKey, 'test-key-12345');
  assertEqual(result.migratedSite?.apiSecret, 'test-secret-67890');
  assert(result.migratedSite?.isDefault === true, 'Should be default');
});

test('generates appropriate site name from URL', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_API_URL: 'http://batasku.local:8000',
    ERP_API_KEY: 'key',
    ERP_API_SECRET: 'secret',
  };

  const result = migrateLegacyConfig(env);
  
  assert(result.success, 'Migration should succeed');
  assertEqual(result.migratedSite?.name, 'batasku');
  assertEqual(result.migratedSite?.displayName, 'Batasku');
});

test('fails when no legacy config present', () => {
  const env: EnvironmentConfig = {};
  const result = migrateLegacyConfig(env);
  
  assert(!result.success, 'Should fail without config');
  assert(!result.hadLegacyConfig, 'Should not detect legacy config');
  assert(result.migratedSite === null, 'Should not have migrated site');
});

// Test Suite: Multi-Site Parsing
console.log('📋 Testing Multi-Site Configuration Parsing...\n');

test('parses valid multi-site JSON', () => {
  const sitesJson = JSON.stringify([
    {
      name: 'bac-production',
      displayName: 'BAC Production',
      apiUrl: 'https://bac.batasku.cloud',
      apiKey: 'key1',
      apiSecret: 'secret1',
      isDefault: true,
    },
    {
      name: 'demo-site',
      displayName: 'Demo Site',
      apiUrl: 'https://demo.batasku.cloud',
      apiKey: 'key2',
      apiSecret: 'secret2',
    },
  ]);

  const env: EnvironmentConfig = {
    ERPNEXT_SITES: sitesJson,
  };

  const sites = parseMultiSiteConfig(env);
  
  assertEqual(sites.length, 2, 'Should parse 2 sites');
  assertEqual(sites[0].name, 'bac-production');
  assert(sites[0].isDefault === true, 'First site should be default');
  assertEqual(sites[1].name, 'demo-site');
});

test('generates IDs if not provided', () => {
  const sitesJson = JSON.stringify([
    {
      name: 'test-site',
      displayName: 'Test Site',
      apiUrl: 'https://test.example.com',
      apiKey: 'key',
      apiSecret: 'secret',
    },
  ]);

  const env: EnvironmentConfig = {
    ERPNEXT_SITES: sitesJson,
  };

  const sites = parseMultiSiteConfig(env);
  
  assertEqual(sites.length, 1);
  assertEqual(sites[0].id, 'test-site');
});

test('skips invalid site configurations', () => {
  const sitesJson = JSON.stringify([
    {
      name: 'valid-site',
      displayName: 'Valid Site',
      apiUrl: 'https://valid.example.com',
      apiKey: 'key',
      apiSecret: 'secret',
    },
    {
      name: 'invalid-site',
      displayName: 'Invalid Site',
      apiUrl: 'not-a-url',
      apiKey: 'key',
      apiSecret: 'secret',
    },
  ]);

  const env: EnvironmentConfig = {
    ERPNEXT_SITES: sitesJson,
  };

  const sites = parseMultiSiteConfig(env);
  
  assertEqual(sites.length, 1, 'Should only parse valid site');
  assertEqual(sites[0].name, 'valid-site');
});

test('returns empty array for invalid JSON', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_SITES: 'not-valid-json',
  };

  const sites = parseMultiSiteConfig(env);
  assertEqual(sites.length, 0, 'Should return empty array');
});

// Test Suite: Load Sites from Environment
console.log('📋 Testing Load Sites from Environment...\n');

test('prioritizes multi-site over legacy', () => {
  const sitesJson = JSON.stringify([
    {
      name: 'multi-site',
      displayName: 'Multi Site',
      apiUrl: 'https://multi.example.com',
      apiKey: 'key',
      apiSecret: 'secret',
    },
  ]);

  const env: EnvironmentConfig = {
    ERPNEXT_SITES: sitesJson,
    ERPNEXT_API_URL: 'http://legacy.example.com',
    ERP_API_KEY: 'legacy-key',
    ERP_API_SECRET: 'legacy-secret',
  };

  const sites = loadSitesFromEnvironment(env);
  
  assertEqual(sites.length, 1);
  assertEqual(sites[0].name, 'multi-site');
  assertEqual(sites[0].apiUrl, 'https://multi.example.com');
});

test('falls back to legacy migration', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_API_URL: 'https://bac.batasku.cloud',
    ERP_API_KEY: 'key',
    ERP_API_SECRET: 'secret',
  };

  const sites = loadSitesFromEnvironment(env);
  
  assertEqual(sites.length, 1);
  assertEqual(sites[0].apiUrl, 'https://bac.batasku.cloud');
  assert(sites[0].isDefault === true);
});

test('returns empty array when no configuration present', () => {
  const env: EnvironmentConfig = {};
  const sites = loadSitesFromEnvironment(env);
  assertEqual(sites.length, 0);
});

// Test Suite: Get Default Site
console.log('📋 Testing Get Default Site...\n');

const sites: SiteConfig[] = [
  {
    id: 'site1',
    name: 'site1',
    displayName: 'Site 1',
    apiUrl: 'https://site1.example.com',
    apiKey: 'key1',
    apiSecret: 'secret1',
  },
  {
    id: 'site2',
    name: 'site2',
    displayName: 'Site 2',
    apiUrl: 'https://site2.example.com',
    apiKey: 'key2',
    apiSecret: 'secret2',
    isDefault: true,
  },
  {
    id: 'site3',
    name: 'site3',
    displayName: 'Site 3',
    apiUrl: 'https://site3.example.com',
    apiKey: 'key3',
    apiSecret: 'secret3',
  },
];

test('returns site specified by ERPNEXT_DEFAULT_SITE', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_DEFAULT_SITE: 'site3',
  };

  const defaultSite = getDefaultSite(sites, env);
  assertEqual(defaultSite?.id, 'site3');
});

test('returns site marked as default', () => {
  const env: EnvironmentConfig = {};
  const defaultSite = getDefaultSite(sites, env);
  assertEqual(defaultSite?.id, 'site2');
});

test('returns first site as fallback', () => {
  const sitesWithoutDefault = sites.map(s => ({ ...s, isDefault: false }));
  const env: EnvironmentConfig = {};
  
  const defaultSite = getDefaultSite(sitesWithoutDefault, env);
  assertEqual(defaultSite?.id, 'site1');
});

test('returns null for empty site list', () => {
  const env: EnvironmentConfig = {};
  const defaultSite = getDefaultSite([], env);
  assert(defaultSite === null, 'Should return null for empty list');
});

// Test Suite: Environment Validation
console.log('📋 Testing Environment Configuration Validation...\n');

test('validates multi-site configuration', () => {
  const sitesJson = JSON.stringify([
    {
      name: 'test-site',
      displayName: 'Test Site',
      apiUrl: 'https://test.example.com',
      apiKey: 'key',
      apiSecret: 'secret',
    },
  ]);

  const env: EnvironmentConfig = {
    ERPNEXT_SITES: sitesJson,
  };

  const result = validateEnvironmentConfig(env);
  assert(result.valid, 'Should validate multi-site config');
});

test('validates legacy configuration', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_API_URL: 'https://test.example.com',
    ERP_API_KEY: 'key',
    ERP_API_SECRET: 'secret',
  };

  const result = validateEnvironmentConfig(env);
  assert(result.valid, 'Should validate legacy config');
});

test('fails when no configuration present', () => {
  const env: EnvironmentConfig = {};
  const result = validateEnvironmentConfig(env);
  
  assert(!result.valid, 'Should fail without config');
  assert(!!result.error && result.error.includes('No site configuration found'), 'Should have appropriate error');
});

test('fails when multi-site JSON is invalid', () => {
  const env: EnvironmentConfig = {
    ERPNEXT_SITES: 'invalid-json',
  };

  const result = validateEnvironmentConfig(env);
  assert(!result.valid, 'Should fail with invalid JSON');
});

// Print Results
console.log('\n' + '='.repeat(60));
console.log('🧪 Test Results Summary');
console.log('='.repeat(60) + '\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

results.forEach(result => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (!result.passed && result.message) {
    console.log(`   ${result.message}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  process.exit(1);
}
