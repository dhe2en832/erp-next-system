/**
 * Unit Tests for Site Migration Utility
 * Task 15: Implement migration and initialization logic
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.5
 */

import {
  performMigration,
  hasMigrationCompleted,
  resetMigrationStatus,
  getMigrationStatus,
} from '../../lib/site-migration';
import { clearSites, getAllSites } from '../../lib/site-config';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<boolean | void> | boolean | void): void {
  const runTest = async () => {
    try {
      const result = await fn();
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
  };
  
  (test as any).promises = (test as any).promises || [];
  (test as any).promises.push(runTest());
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

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Setup global mocks
(global as any).window = { localStorage: localStorageMock };
(global as any).localStorage = localStorageMock;

// Mock fetch
(global as any).fetch = async () => ({
  ok: true,
  json: async () => ({ message: 'pong' }),
});

// Mock process.env
const originalEnv = process.env;

function setMockEnv(env: Record<string, string>) {
  process.env = { ...originalEnv, ...env };
}

function resetEnv() {
  process.env = originalEnv;
}

// Test Suite: Migration Detection
console.log('\n📋 Testing Migration Detection...\n');

test('detects when migration has not been completed', () => {
  localStorageMock.clear();
  resetMigrationStatus();
  
  const completed = hasMigrationCompleted();
  assert(!completed, 'Should detect migration not completed');
});

test('detects when migration has been completed', () => {
  localStorageMock.clear();
  resetMigrationStatus();
  
  // Manually mark as completed
  const status = {
    completed: true,
    timestamp: new Date().toISOString(),
  };
  localStorageMock.setItem('erpnext-migration-status', JSON.stringify(status));
  
  const completed = hasMigrationCompleted();
  assert(completed, 'Should detect migration completed');
});

// Test Suite: Migration Execution
console.log('📋 Testing Migration Execution...\n');

test('migrates legacy environment variables', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  // Set legacy environment variables
  setMockEnv({
    ERPNEXT_API_URL: 'https://legacy.example.com',
    ERP_API_KEY: 'legacy-key',
    ERP_API_SECRET: 'legacy-secret',
  });
  
  const result = performMigration();
  
  assert(result.success, 'Migration should succeed');
  assert(result.hadLegacyConfig, 'Should detect legacy config');
  assert(result.migratedSite !== null, 'Should create migrated site');
  
  // Verify site was persisted
  const sites = getAllSites();
  assertEqual(sites.length, 1, 'Should have 1 migrated site');
  assertEqual(sites[0].apiUrl, 'https://legacy.example.com', 'Should preserve API URL');
  assertEqual(sites[0].apiKey, 'legacy-key', 'Should preserve API key');
  assertEqual(sites[0].apiSecret, 'legacy-secret', 'Should preserve API secret');
  assert(sites[0].isDefault === true, 'Should mark as default');
  
  resetEnv();
});

test('skips migration when no legacy config exists', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  // Clear environment variables
  setMockEnv({});
  
  const result = performMigration();
  
  assert(!result.success, 'Migration should not succeed without legacy config');
  assert(!result.hadLegacyConfig, 'Should not detect legacy config');
  assert(result.migratedSite === null, 'Should not create site');
  
  resetEnv();
});

test('skips migration when sites already configured', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  // Add a site first
  const { addSite } = require('../../lib/site-config');
  addSite({
    name: 'existing-site',
    displayName: 'Existing Site',
    apiUrl: 'https://existing.example.com',
    apiKey: 'key',
    apiSecret: 'secret',
  });
  
  // Set legacy environment variables
  setMockEnv({
    ERPNEXT_API_URL: 'https://legacy.example.com',
    ERP_API_KEY: 'legacy-key',
    ERP_API_SECRET: 'legacy-secret',
  });
  
  const result = performMigration();
  
  assert(result.success, 'Should succeed but skip migration');
  assert(!result.hadLegacyConfig, 'Should not process legacy config');
  
  // Verify no new site was added
  const sites = getAllSites();
  assertEqual(sites.length, 1, 'Should still have only 1 site');
  assertEqual(sites[0].name, 'existing-site', 'Should preserve existing site');
  
  resetEnv();
});

test('skips migration when already completed', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  // Mark migration as completed
  const status = {
    completed: true,
    timestamp: new Date().toISOString(),
  };
  localStorageMock.setItem('erpnext-migration-status', JSON.stringify(status));
  
  // Set legacy environment variables
  setMockEnv({
    ERPNEXT_API_URL: 'https://legacy.example.com',
    ERP_API_KEY: 'legacy-key',
    ERP_API_SECRET: 'legacy-secret',
  });
  
  const result = performMigration();
  
  assert(result.success, 'Should succeed');
  assert(!result.hadLegacyConfig, 'Should skip already completed migration');
  
  // Verify no site was added
  const sites = getAllSites();
  assertEqual(sites.length, 0, 'Should have no sites');
  
  resetEnv();
});

// Test Suite: Migration Status
console.log('📋 Testing Migration Status...\n');

test('stores migration status after successful migration', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  setMockEnv({
    ERPNEXT_API_URL: 'https://legacy.example.com',
    ERP_API_KEY: 'legacy-key',
    ERP_API_SECRET: 'legacy-secret',
  });
  
  performMigration();
  
  const status = getMigrationStatus();
  assert(status !== null, 'Should have migration status');
  assert(status?.completed === true, 'Should mark as completed');
  assert(!!status?.timestamp, 'Should have timestamp');
  assert(!!status?.migratedSiteId, 'Should have migrated site ID');
  
  resetEnv();
});

test('resets migration status', () => {
  localStorageMock.clear();
  
  // Set migration status
  const status = {
    completed: true,
    timestamp: new Date().toISOString(),
  };
  localStorageMock.setItem('erpnext-migration-status', JSON.stringify(status));
  
  resetMigrationStatus();
  
  const newStatus = getMigrationStatus();
  assert(newStatus === null, 'Should clear migration status');
});

// Test Suite: Error Handling
console.log('📋 Testing Error Handling...\n');

test('handles invalid legacy configuration gracefully', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  // Set incomplete legacy config
  setMockEnv({
    ERPNEXT_API_URL: 'not-a-valid-url',
    ERP_API_KEY: 'key',
    ERP_API_SECRET: 'secret',
  });
  
  const result = performMigration();
  
  assert(!result.success, 'Should fail with invalid config');
  assert(result.hadLegacyConfig, 'Should detect legacy config');
  assert(result.error !== null, 'Should have error message');
  
  resetEnv();
});

test('preserves all configuration values during migration', () => {
  localStorageMock.clear();
  clearSites();
  resetMigrationStatus();
  
  const apiUrl = 'https://test.batasku.cloud';
  const apiKey = 'test-api-key-12345';
  const apiSecret = 'test-api-secret-67890';
  
  setMockEnv({
    ERPNEXT_API_URL: apiUrl,
    ERP_API_KEY: apiKey,
    ERP_API_SECRET: apiSecret,
  });
  
  const result = performMigration();
  
  assert(result.success, 'Migration should succeed');
  
  const sites = getAllSites();
  assertEqual(sites.length, 1, 'Should have 1 site');
  assertEqual(sites[0].apiUrl, apiUrl, 'Should preserve exact API URL');
  assertEqual(sites[0].apiKey, apiKey, 'Should preserve exact API key');
  assertEqual(sites[0].apiSecret, apiSecret, 'Should preserve exact API secret');
  
  resetEnv();
});

// Run all tests
async function runTests() {
  await Promise.all((test as any).promises || []);
  
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
}

runTests();
