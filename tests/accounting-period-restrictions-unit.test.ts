/**
 * Unit Tests for Transaction Restrictions
 * Feature: accounting-period-closing
 * 
 * Tests specific scenarios for Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { 
  validateTransactionAgainstClosedPeriod,
  logAdministratorOverride,
  canCreateTransaction,
  canModifyTransaction,
  canDeleteTransaction,
  getTransactionRestrictionInfo,
  type TransactionValidationParams 
} from '../lib/accounting-period-restrictions';
import { erpnextClient } from '../lib/erpnext';
import type { AccountingPeriod } from '../types/accounting-period';

// Test configuration
const TEST_COMPANY = 'Batasku';

// Test periods (will be created in setup)
let testPeriodClosed: AccountingPeriod;
let testPeriodPermanent: AccountingPeriod;
let testPeriodOpen: AccountingPeriod;

// Setup test periods
async function setup() {
  console.log('Setting up test periods...\n');

  try {
    // Closed period
    testPeriodClosed = await erpnextClient.insert('Accounting Period', {
      period_name: `UNIT-TEST-CLOSED-${Date.now()}`,
      company: TEST_COMPANY,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      period_type: 'Monthly',
      status: 'Closed',
      closed_by: 'Administrator',
      closed_on: new Date().toISOString(),
    });

    // Permanently closed period
    testPeriodPermanent = await erpnextClient.insert('Accounting Period', {
      period_name: `UNIT-TEST-PERM-${Date.now()}`,
      company: TEST_COMPANY,
      start_date: '2024-02-01',
      end_date: '2024-02-29',
      period_type: 'Monthly',
      status: 'Permanently Closed',
      closed_by: 'Administrator',
      closed_on: new Date().toISOString(),
      permanently_closed_by: 'Administrator',
      permanently_closed_on: new Date().toISOString(),
    });

    // Open period
    testPeriodOpen = await erpnextClient.insert('Accounting Period', {
      period_name: `UNIT-TEST-OPEN-${Date.now()}`,
      company: TEST_COMPANY,
      start_date: '2024-03-01',
      end_date: '2024-03-31',
      period_type: 'Monthly',
      status: 'Open',
    });

    console.log('✅ Test periods created successfully\n');
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

// Cleanup test periods
async function cleanup() {
  console.log('\nCleaning up test periods...');

  try {
    if (testPeriodClosed) await erpnextClient.delete('Accounting Period', testPeriodClosed.name);
    if (testPeriodPermanent) await erpnextClient.delete('Accounting Period', testPeriodPermanent.name);
    if (testPeriodOpen) await erpnextClient.delete('Accounting Period', testPeriodOpen.name);
    console.log('✅ Cleanup completed\n');
  } catch (error: any) {
    console.error('❌ Cleanup error:', error.message);
  }
}

// Test runner
async function runTests() {
  console.log('Starting Unit Tests for Transaction Restrictions...\n');

  await setup();

  try {
    await testRequirement51_CreateTransactionRejected();
    await testRequirement52_UpdateTransactionRejected();
    await testRequirement53_DeleteTransactionRejected();
    await testRequirement54_AdminOverride();
    await testRequirement55_AdminLogging();
    await testPermanentlyClosedPeriods();
    await testOpenPeriods();
    await testRestrictionInfoAPI();
    await testEdgeCases();
    await testAPIEndpoint();

    console.log('\n✅ All unit tests completed successfully!');
  } finally {
    await cleanup();
  }
}

/**
 * Requirement 5.1: Create transaction in closed period (rejected)
 */
async function testRequirement51_CreateTransactionRejected() {
  console.log('Testing Requirement 5.1: Create transaction in closed period (rejected)');

  // Test 1: Journal Entry
  const result1 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'TEST-JE-001',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (!result1.allowed && result1.period?.status === 'Closed' && result1.reason?.includes('closed')) {
    console.log('  ✅ Journal Entry creation rejected');
  } else {
    throw new Error('Journal Entry creation should be rejected');
  }

  // Test 2: Sales Invoice
  const result2 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-20',
    doctype: 'Sales Invoice',
    docname: 'SINV-001',
    user: 'sales.user@example.com',
    userRoles: ['Sales User'],
  });

  if (!result2.allowed) {
    console.log('  ✅ Sales Invoice creation rejected');
  } else {
    throw new Error('Sales Invoice creation should be rejected');
  }

  // Test 3: Purchase Invoice using convenience function
  const canCreate = await canCreateTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-01-10',
    doctype: 'Purchase Invoice',
    docname: 'PINV-001',
    user: 'purchase.user@example.com',
    userRoles: ['Purchase User'],
  });

  if (!canCreate) {
    console.log('  ✅ Purchase Invoice creation rejected\n');
  } else {
    throw new Error('Purchase Invoice creation should be rejected');
  }
}

/**
 * Requirement 5.2: Update transaction in closed period (rejected)
 */
async function testRequirement52_UpdateTransactionRejected() {
  console.log('Testing Requirement 5.2: Update transaction in closed period (rejected)');

  const result = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-EXISTING-001',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (!result.allowed && result.reason?.includes('closed')) {
    console.log('  ✅ Journal Entry update rejected');
  } else {
    throw new Error('Journal Entry update should be rejected');
  }

  const canModify = await canModifyTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-01-25',
    doctype: 'Payment Entry',
    docname: 'PAY-001',
    user: 'accounts.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (!canModify) {
    console.log('  ✅ Payment Entry modification rejected\n');
  } else {
    throw new Error('Payment Entry modification should be rejected');
  }
}

/**
 * Requirement 5.3: Delete transaction in closed period (rejected)
 */
async function testRequirement53_DeleteTransactionRejected() {
  console.log('Testing Requirement 5.3: Delete transaction in closed period (rejected)');

  const result = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-TO-DELETE-001',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (!result.allowed) {
    console.log('  ✅ Journal Entry deletion rejected');
  } else {
    throw new Error('Journal Entry deletion should be rejected');
  }

  const canDelete = await canDeleteTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-01-20',
    doctype: 'Sales Invoice',
    docname: 'SINV-TO-DELETE-001',
    user: 'sales.user@example.com',
    userRoles: ['Sales User'],
  });

  if (!canDelete) {
    console.log('  ✅ Sales Invoice deletion rejected\n');
  } else {
    throw new Error('Sales Invoice deletion should be rejected');
  }
}

/**
 * Requirement 5.4: Admin override with logging
 */
async function testRequirement54_AdminOverride() {
  console.log('Testing Requirement 5.4: Admin override with logging');

  // Test 1: System Manager
  const result1 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-ADMIN-001',
    user: 'Administrator',
    userRoles: ['System Manager'],
  });

  if (result1.allowed && result1.requiresLogging && result1.period?.status === 'Closed') {
    console.log('  ✅ System Manager allowed with logging required');
  } else {
    throw new Error('System Manager should be allowed with logging');
  }

  // Test 2: Accounts Manager
  const result2 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-01-20',
    doctype: 'Sales Invoice',
    docname: 'SINV-ADMIN-001',
    user: 'accounts.manager@example.com',
    userRoles: ['Accounts Manager'],
  });

  if (result2.allowed && result2.requiresLogging) {
    console.log('  ✅ Accounts Manager allowed with logging required');
  } else {
    throw new Error('Accounts Manager should be allowed with logging');
  }

  // Test 3: Administrator delete
  const canDelete = await canDeleteTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-01-10',
    doctype: 'Payment Entry',
    docname: 'PAY-ADMIN-001',
    user: 'Administrator',
    userRoles: ['System Manager'],
  });

  if (canDelete) {
    console.log('  ✅ Administrator delete allowed\n');
  } else {
    throw new Error('Administrator delete should be allowed');
  }
}

/**
 * Requirement 5.5: Administrator logging
 */
async function testRequirement55_AdminLogging() {
  console.log('Testing Requirement 5.5: Administrator logging');

  // Test 1: Create action logging
  const docname1 = `JE-LOG-TEST-${Date.now()}`;
  const logEntry1 = await logAdministratorOverride({
    period: testPeriodClosed,
    doctype: 'Journal Entry',
    docname: docname1,
    user: 'Administrator',
    action: 'create',
    reason: 'Unit test - admin override',
  });

  const retrievedLog1 = await erpnextClient.getDoc('Period Closing Log', logEntry1.name);
  
  if (retrievedLog1.accounting_period === testPeriodClosed.name &&
      retrievedLog1.action_type === 'Transaction Modified' &&
      retrievedLog1.action_by === 'Administrator' &&
      retrievedLog1.affected_transaction === docname1 &&
      retrievedLog1.transaction_doctype === 'Journal Entry' &&
      retrievedLog1.reason?.includes('admin override')) {
    console.log('  ✅ Create action logged correctly');
  } else {
    throw new Error('Create action log missing required fields');
  }

  await erpnextClient.delete('Period Closing Log', logEntry1.name);

  // Test 2: Update action logging
  const docname2 = `SINV-UPDATE-${Date.now()}`;
  const logEntry2 = await logAdministratorOverride({
    period: testPeriodClosed,
    doctype: 'Sales Invoice',
    docname: docname2,
    user: 'accounts.manager@example.com',
    action: 'update',
    reason: 'Correcting invoice amount',
  });

  const retrievedLog2 = await erpnextClient.getDoc('Period Closing Log', logEntry2.name);
  
  if (retrievedLog2.reason?.includes('update') && retrievedLog2.reason?.includes('Correcting invoice amount')) {
    console.log('  ✅ Update action logged correctly');
  } else {
    throw new Error('Update action log incorrect');
  }

  await erpnextClient.delete('Period Closing Log', logEntry2.name);

  // Test 3: Delete action logging
  const docname3 = `PAY-DELETE-${Date.now()}`;
  const logEntry3 = await logAdministratorOverride({
    period: testPeriodClosed,
    doctype: 'Payment Entry',
    docname: docname3,
    user: 'Administrator',
    action: 'delete',
    reason: 'Duplicate entry removal',
  });

  const retrievedLog3 = await erpnextClient.getDoc('Period Closing Log', logEntry3.name);
  
  if (retrievedLog3.reason?.includes('delete') && retrievedLog3.reason?.includes('Duplicate entry removal')) {
    console.log('  ✅ Delete action logged correctly\n');
  } else {
    throw new Error('Delete action log incorrect');
  }

  await erpnextClient.delete('Period Closing Log', logEntry3.name);
}

/**
 * Test permanently closed periods
 */
async function testPermanentlyClosedPeriods() {
  console.log('Testing Permanently Closed Period Restrictions');

  // Test 1: Admin rejected
  const result1 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-02-15',
    doctype: 'Journal Entry',
    docname: 'JE-PERM-001',
    user: 'Administrator',
    userRoles: ['System Manager'],
  });

  if (!result1.allowed && 
      result1.period?.status === 'Permanently Closed' && 
      result1.reason?.includes('permanently closed') &&
      !result1.requiresLogging) {
    console.log('  ✅ Administrator rejected for permanently closed period');
  } else {
    throw new Error('Administrator should be rejected for permanently closed period');
  }

  // Test 2: Accounts Manager rejected
  const canCreate = await canCreateTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-02-20',
    doctype: 'Sales Invoice',
    docname: 'SINV-PERM-001',
    user: 'accounts.manager@example.com',
    userRoles: ['Accounts Manager'],
  });

  if (!canCreate) {
    console.log('  ✅ Accounts Manager rejected for permanently closed period\n');
  } else {
    throw new Error('Accounts Manager should be rejected for permanently closed period');
  }
}

/**
 * Test open periods
 */
async function testOpenPeriods() {
  console.log('Testing Open Period Transactions');

  // Test 1: Regular user allowed
  const result = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2024-03-15',
    doctype: 'Journal Entry',
    docname: 'JE-OPEN-001',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (result.allowed && !result.requiresLogging) {
    console.log('  ✅ Regular user allowed in open period');
  } else {
    throw new Error('Regular user should be allowed in open period');
  }

  // Test 2: Any user can modify
  const canModify = await canModifyTransaction({
    company: TEST_COMPANY,
    posting_date: '2024-03-20',
    doctype: 'Sales Invoice',
    docname: 'SINV-OPEN-001',
    user: 'sales.user@example.com',
    userRoles: ['Sales User'],
  });

  if (canModify) {
    console.log('  ✅ Any user can modify in open period\n');
  } else {
    throw new Error('Users should be able to modify in open period');
  }
}

/**
 * Test restriction info API
 */
async function testRestrictionInfoAPI() {
  console.log('Testing Restriction Info API');

  // Test 1: Closed period for regular user
  const info1 = await getTransactionRestrictionInfo({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-INFO-001',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (info1.restricted && info1.period?.status === 'Closed' && !info1.canOverride) {
    console.log('  ✅ Restriction info correct for regular user');
  } else {
    throw new Error('Restriction info incorrect for regular user');
  }

  // Test 2: Closed period for admin
  const info2 = await getTransactionRestrictionInfo({
    company: TEST_COMPANY,
    posting_date: '2024-01-15',
    doctype: 'Journal Entry',
    docname: 'JE-INFO-002',
    user: 'Administrator',
    userRoles: ['System Manager'],
  });

  if (!info2.restricted && info2.canOverride) {
    console.log('  ✅ Restriction info indicates override possible for admin');
  } else {
    throw new Error('Restriction info should indicate override possible');
  }

  // Test 3: Open period
  const info3 = await getTransactionRestrictionInfo({
    company: TEST_COMPANY,
    posting_date: '2024-03-15',
    doctype: 'Journal Entry',
    docname: 'JE-INFO-003',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (!info3.restricted && !info3.canOverride) {
    console.log('  ✅ No restriction for open period\n');
  } else {
    throw new Error('Open period should not be restricted');
  }
}

/**
 * Test edge cases
 */
async function testEdgeCases() {
  console.log('Testing Edge Cases');

  // Test 1: No posting_date
  const result1 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '',
    doctype: 'Journal Entry',
    docname: 'JE-NO-DATE',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (result1.allowed && !result1.requiresLogging) {
    console.log('  ✅ Transaction allowed when no posting_date');
  } else {
    throw new Error('Transaction should be allowed when no posting_date');
  }

  // Test 2: Date outside any period
  const result2 = await validateTransactionAgainstClosedPeriod({
    company: TEST_COMPANY,
    posting_date: '2025-12-31',
    doctype: 'Journal Entry',
    docname: 'JE-FUTURE',
    user: 'test.user@example.com',
    userRoles: ['Accounts User'],
  });

  if (result2.allowed) {
    console.log('  ✅ Transaction allowed for date outside any period\n');
  } else {
    throw new Error('Transaction should be allowed for date outside any period');
  }
}

/**
 * Test API endpoint
 */
async function testAPIEndpoint() {
  console.log('Testing API Endpoint');

  // Test 1: Closed period
  const response1 = await fetch('http://localhost:3000/api/accounting-period/check-restriction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: TEST_COMPANY,
      posting_date: '2024-01-15',
      doctype: 'Journal Entry',
      docname: 'JE-API-001',
      user: 'test.user@example.com',
      userRoles: ['Accounts User'],
    }),
  });

  const result1 = await response1.json();

  if (result1.success && !result1.data.allowed && result1.data.restricted && result1.data.reason?.includes('closed')) {
    console.log('  ✅ API returns restriction for closed period');
  } else {
    throw new Error('API should return restriction for closed period');
  }

  // Test 2: Open period
  const response2 = await fetch('http://localhost:3000/api/accounting-period/check-restriction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: TEST_COMPANY,
      posting_date: '2024-03-15',
      doctype: 'Journal Entry',
      docname: 'JE-API-002',
      user: 'test.user@example.com',
      userRoles: ['Accounts User'],
    }),
  });

  const result2 = await response2.json();

  if (result2.success && result2.data.allowed && !result2.data.restricted) {
    console.log('  ✅ API returns no restriction for open period');
  } else {
    throw new Error('API should return no restriction for open period');
  }

  // Test 3: Invalid date format
  const response3 = await fetch('http://localhost:3000/api/accounting-period/check-restriction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: TEST_COMPANY,
      posting_date: 'invalid-date',
      doctype: 'Journal Entry',
    }),
  });

  const result3 = await response3.json();

  if (!result3.success && result3.error === 'VALIDATION_ERROR') {
    console.log('  ✅ API handles invalid date format\n');
  } else {
    throw new Error('API should handle invalid date format');
  }
}

// Run all tests
runTests()
  .then(() => {
    console.log('✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
  });
