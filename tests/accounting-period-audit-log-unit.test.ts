/**
 * Unit Tests for Accounting Period Audit Log
 * 
 * This file contains unit tests for:
 * - Audit log creation for all actions
 * - Audit log filtering and pagination
 * - Snapshot storage (before/after)
 * 
 * **Validates: Requirements 10.1, 10.2, 10.4**
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const TEST_COMPANY = process.env.ERP_DEFAULT_COMPANY || 'Batasku';
const TEST_USER = 'Administrator';
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface PeriodClosingLog {
  name: string;
  accounting_period: string;
  action_type: 'Created' | 'Closed' | 'Reopened' | 'Permanently Closed' | 'Transaction Modified';
  action_by: string;
  action_date: string;
  reason?: string;
  before_snapshot?: string;
  after_snapshot?: string;
  affected_transaction?: string;
  transaction_doctype?: string;
}

// Helper to create audit log
async function createAuditLog(data: any): Promise<PeriodClosingLog> {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Period Closing Log`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Failed to create audit log: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper to delete audit log
async function deleteAuditLog(name: string): Promise<void> {
  try {
    await fetch(`${ERPNEXT_API_URL}/api/resource/Period Closing Log/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
      }
    });
  } catch (error) {
    console.error('Error deleting audit log:', error);
  }
}

/**
 * Test: Audit log creation for period closing
 * **Validates: Requirements 10.1, 10.2**
 */
async function testAuditLogCreationForClosing(): Promise<void> {
  console.log('\n=== Test: Audit Log Creation for Closing ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;
  const beforeSnapshot = JSON.stringify({ status: 'Open' });
  const afterSnapshot = JSON.stringify({ status: 'Closed', closed_by: TEST_USER });

  // Create audit log for closing
  const log = await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Closed',
    action_by: TEST_USER,
    action_date: new Date().toISOString(),
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot
  });

  try {
    // Verify audit log was created
    if (log.action_type !== 'Closed') {
      throw new Error(`Expected action_type 'Closed', got '${log.action_type}'`);
    }

    if (log.action_by !== TEST_USER) {
      throw new Error(`Expected action_by '${TEST_USER}', got '${log.action_by}'`);
    }

    if (!log.before_snapshot) {
      throw new Error('before_snapshot should be defined');
    }

    if (!log.after_snapshot) {
      throw new Error('after_snapshot should be defined');
    }

    // Verify snapshots
    const before = JSON.parse(log.before_snapshot);
    const after = JSON.parse(log.after_snapshot);

    if (before.status !== 'Open') {
      throw new Error(`Expected before status 'Open', got '${before.status}'`);
    }

    if (after.status !== 'Closed') {
      throw new Error(`Expected after status 'Closed', got '${after.status}'`);
    }

    console.log('✓ Audit log created for period closing');
    console.log(`  Log name: ${log.name}`);
    console.log(`  Action type: ${log.action_type}`);
    console.log(`  Action by: ${log.action_by}`);
  } finally {
    await deleteAuditLog(log.name);
  }
}

/**
 * Test: Audit log creation for reopening with reason
 * **Validates: Requirements 10.1, 10.2**
 */
async function testAuditLogCreationForReopening(): Promise<void> {
  console.log('\n=== Test: Audit Log Creation for Reopening ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;
  const reason = 'Need to correct an entry';
  const beforeSnapshot = JSON.stringify({ status: 'Closed' });
  const afterSnapshot = JSON.stringify({ status: 'Open' });

  // Create audit log for reopening
  const log = await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Reopened',
    action_by: TEST_USER,
    action_date: new Date().toISOString(),
    reason: reason,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot
  });

  try {
    // Verify audit log was created
    if (log.action_type !== 'Reopened') {
      throw new Error(`Expected action_type 'Reopened', got '${log.action_type}'`);
    }

    if (log.reason !== reason) {
      throw new Error(`Expected reason '${reason}', got '${log.reason}'`);
    }

    console.log('✓ Audit log created for period reopening with reason');
    console.log(`  Reason: ${log.reason}`);
  } finally {
    await deleteAuditLog(log.name);
  }
}

/**
 * Test: Audit log creation for transaction modification
 * **Validates: Requirements 10.1, 10.2**
 */
async function testAuditLogCreationForTransactionModification(): Promise<void> {
  console.log('\n=== Test: Audit Log Creation for Transaction Modification ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;

  // Create audit log for transaction modification
  const log = await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Transaction Modified',
    action_by: TEST_USER,
    action_date: new Date().toISOString(),
    affected_transaction: 'JV-2024-00001',
    transaction_doctype: 'Journal Entry',
    reason: 'Admin override to correct posting date'
  });

  try {
    // Verify audit log was created
    if (log.action_type !== 'Transaction Modified') {
      throw new Error(`Expected action_type 'Transaction Modified', got '${log.action_type}'`);
    }

    if (log.affected_transaction !== 'JV-2024-00001') {
      throw new Error(`Expected affected_transaction 'JV-2024-00001', got '${log.affected_transaction}'`);
    }

    if (log.transaction_doctype !== 'Journal Entry') {
      throw new Error(`Expected transaction_doctype 'Journal Entry', got '${log.transaction_doctype}'`);
    }

    console.log('✓ Audit log created for transaction modification');
    console.log(`  Affected transaction: ${log.affected_transaction}`);
    console.log(`  Transaction doctype: ${log.transaction_doctype}`);
  } finally {
    await deleteAuditLog(log.name);
  }
}

/**
 * Test: Audit log filtering by period
 * **Validates: Requirements 10.2, 10.4**
 */
async function testAuditLogFilteringByPeriod(): Promise<void> {
  console.log('\n=== Test: Audit Log Filtering by Period ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;

  // Create multiple audit logs
  const logs = [];
  for (let i = 0; i < 3; i++) {
    const log = await createAuditLog({
      accounting_period: testPeriod,
      action_type: i === 0 ? 'Created' : i === 1 ? 'Closed' : 'Reopened',
      action_by: TEST_USER,
      action_date: new Date(Date.now() + i * 1000).toISOString(),
      before_snapshot: JSON.stringify({ index: i }),
      after_snapshot: JSON.stringify({ index: i + 1 })
    });
    logs.push(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  try {
    // Query audit logs by period
    const response = await fetch(
      `${NEXT_API_URL}/api/accounting-period/audit-log?period_name=${encodeURIComponent(testPeriod)}`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Response success should be true');
    }

    if (!Array.isArray(data.data)) {
      throw new Error('Response data should be an array');
    }

    if (data.data.length < 3) {
      throw new Error(`Expected at least 3 logs, got ${data.data.length}`);
    }

    // All logs should be for the test period
    for (const log of data.data) {
      if (log.accounting_period !== testPeriod) {
        throw new Error(`Expected period '${testPeriod}', got '${log.accounting_period}'`);
      }
    }

    console.log(`✓ Filtered ${data.data.length} audit logs by period`);
  } finally {
    for (const log of logs) {
      await deleteAuditLog(log.name);
    }
  }
}

/**
 * Test: Audit log filtering by action type
 * **Validates: Requirements 10.2, 10.4**
 */
async function testAuditLogFilteringByActionType(): Promise<void> {
  console.log('\n=== Test: Audit Log Filtering by Action Type ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;

  // Create audit logs with different action types
  const logs = [];
  logs.push(await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Closed',
    action_by: TEST_USER,
    action_date: new Date().toISOString()
  }));

  logs.push(await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Closed',
    action_by: TEST_USER,
    action_date: new Date().toISOString()
  }));

  logs.push(await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Reopened',
    action_by: TEST_USER,
    action_date: new Date().toISOString()
  }));

  try {
    // Query audit logs by action type
    const response = await fetch(
      `${NEXT_API_URL}/api/accounting-period/audit-log?period_name=${encodeURIComponent(testPeriod)}&action_type=Closed`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Response success should be true');
    }

    if (!Array.isArray(data.data)) {
      throw new Error('Response data should be an array');
    }

    // All logs should have action_type = 'Closed'
    for (const log of data.data) {
      if (log.action_type !== 'Closed') {
        throw new Error(`Expected action_type 'Closed', got '${log.action_type}'`);
      }
    }

    console.log(`✓ Filtered ${data.data.length} audit logs by action type 'Closed'`);
  } finally {
    for (const log of logs) {
      await deleteAuditLog(log.name);
    }
  }
}

/**
 * Test: Audit log pagination
 * **Validates: Requirements 10.2, 10.4**
 */
async function testAuditLogPagination(): Promise<void> {
  console.log('\n=== Test: Audit Log Pagination ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;

  // Create multiple audit logs
  const logs = [];
  for (let i = 0; i < 5; i++) {
    const log = await createAuditLog({
      accounting_period: testPeriod,
      action_type: 'Created',
      action_by: TEST_USER,
      action_date: new Date(Date.now() + i * 1000).toISOString()
    });
    logs.push(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  try {
    // Get first page
    const response1 = await fetch(
      `${NEXT_API_URL}/api/accounting-period/audit-log?period_name=${encodeURIComponent(testPeriod)}&limit=2&start=0`
    );

    if (!response1.ok) {
      throw new Error(`First page request failed with status ${response1.status}`);
    }

    const data1 = await response1.json();

    if (!data1.success) {
      throw new Error('First page response success should be true');
    }

    if (data1.data.length > 2) {
      throw new Error(`Expected at most 2 items on first page, got ${data1.data.length}`);
    }

    // Get second page
    const response2 = await fetch(
      `${NEXT_API_URL}/api/accounting-period/audit-log?period_name=${encodeURIComponent(testPeriod)}&limit=2&start=2`
    );

    if (!response2.ok) {
      throw new Error(`Second page request failed with status ${response2.status}`);
    }

    const data2 = await response2.json();

    if (!data2.success) {
      throw new Error('Second page response success should be true');
    }

    if (data1.total_count !== data2.total_count) {
      throw new Error(`Total count mismatch: ${data1.total_count} vs ${data2.total_count}`);
    }

    // Verify different records
    if (data1.data.length > 0 && data2.data.length > 0) {
      if (data1.data[0].name === data2.data[0].name) {
        throw new Error('Pages should contain different records');
      }
    }

    console.log(`✓ Pagination working: Page 1 (${data1.data.length} items), Page 2 (${data2.data.length} items), Total: ${data1.total_count}`);
  } finally {
    for (const log of logs) {
      await deleteAuditLog(log.name);
    }
  }
}

/**
 * Test: Snapshot storage with complex data
 * **Validates: Requirements 10.4**
 */
async function testSnapshotStorageWithComplexData(): Promise<void> {
  console.log('\n=== Test: Snapshot Storage with Complex Data ===');

  const testPeriod = `TEST-PERIOD-${Date.now()}`;

  const complexBefore = {
    status: 'Open',
    metadata: {
      validations: ['check1', 'check2'],
      warnings: []
    },
    accounts: [
      { name: 'Account 1', balance: 1000 },
      { name: 'Account 2', balance: 2000 }
    ]
  };

  const complexAfter = {
    status: 'Closed',
    metadata: {
      validations: ['check1', 'check2'],
      warnings: ['warning1']
    },
    accounts: [
      { name: 'Account 1', balance: 0 },
      { name: 'Account 2', balance: 0 }
    ],
    closing_journal: 'JV-2024-00001'
  };

  // Create audit log with complex snapshots
  const log = await createAuditLog({
    accounting_period: testPeriod,
    action_type: 'Closed',
    action_by: TEST_USER,
    action_date: new Date().toISOString(),
    before_snapshot: JSON.stringify(complexBefore),
    after_snapshot: JSON.stringify(complexAfter)
  });

  try {
    // Parse and verify complex structures
    const before = JSON.parse(log.before_snapshot!);
    const after = JSON.parse(log.after_snapshot!);

    if (!Array.isArray(before.metadata.validations) || before.metadata.validations.length !== 2) {
      throw new Error('Before snapshot metadata.validations should be an array with 2 items');
    }

    if (before.accounts.length !== 2) {
      throw new Error('Before snapshot should have 2 accounts');
    }

    if (before.accounts[0].balance !== 1000) {
      throw new Error(`Expected account 1 balance 1000, got ${before.accounts[0].balance}`);
    }

    if (!Array.isArray(after.metadata.warnings) || after.metadata.warnings.length !== 1) {
      throw new Error('After snapshot metadata.warnings should be an array with 1 item');
    }

    if (after.accounts[0].balance !== 0) {
      throw new Error(`Expected account 1 balance 0 after closing, got ${after.accounts[0].balance}`);
    }

    if (after.closing_journal !== 'JV-2024-00001') {
      throw new Error(`Expected closing_journal 'JV-2024-00001', got '${after.closing_journal}'`);
    }

    console.log('✓ Complex snapshots stored and retrieved correctly');
  } finally {
    await deleteAuditLog(log.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Unit Tests for Audit Log');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Audit Log Creation for Closing', fn: testAuditLogCreationForClosing },
    { name: 'Audit Log Creation for Reopening', fn: testAuditLogCreationForReopening },
    { name: 'Audit Log Creation for Transaction Modification', fn: testAuditLogCreationForTransactionModification },
    { name: 'Audit Log Filtering by Period', fn: testAuditLogFilteringByPeriod },
    { name: 'Audit Log Filtering by Action Type', fn: testAuditLogFilteringByActionType },
    { name: 'Audit Log Pagination', fn: testAuditLogPagination },
    { name: 'Snapshot Storage with Complex Data', fn: testSnapshotStorageWithComplexData },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error: any) {
      console.error(`\n✗ ${test.name} FAILED:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
