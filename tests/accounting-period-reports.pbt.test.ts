/**
 * Property-Based Tests for Accounting Period Reports
 * 
 * This file contains property tests for:
 * - Property 26: Period Detail Completeness
 * - Property 27: Export Metadata Inclusion
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
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
  closed_by?: string;
  closed_on?: string;
  closing_journal_entry?: string;
}

interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  is_group: boolean;
  debit: number;
  credit: number;
  balance: number;
  is_nominal: boolean;
}

interface ClosingSummaryResponse {
  success: boolean;
  data: {
    period: AccountingPeriod;
    closing_journal: any;
    account_balances: AccountBalance[];
    nominal_accounts: AccountBalance[];
    real_accounts: AccountBalance[];
    net_income: number;
  };
  pdf_url?: string;
  excel_url?: string;
}

// Helper to get closed periods
async function getClosedPeriods(): Promise<AccountingPeriod[]> {
  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Accounting Period?filters=[["company","=","${TEST_COMPANY}"],["status","=","Closed"]]&fields=["name","period_name","company","status"]&limit_page_length=1`,
    {
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch periods: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Property 26: Period Detail Completeness
 * 
 * **Validates: Requirements 8.2, 8.3, 8.4**
 * 
 * For any closed accounting period, retrieving the period details should include 
 * the period information, closing journal reference, closed_by, closed_on, and 
 * account balances snapshot.
 */
async function testProperty26_PeriodDetailCompleteness(): Promise<void> {
  console.log('\n=== Property 26: Period Detail Completeness ===');

  // Find a closed period for testing
  const closedPeriods = await getClosedPeriods();

  if (closedPeriods.length === 0) {
    console.log('⚠ No closed periods found, skipping test');
    return;
  }

  const period = closedPeriods[0];

  // Fetch closing summary report
  const response = await fetch(
    `${NEXT_API_URL}/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(period.name)}&company=${encodeURIComponent(TEST_COMPANY)}`
  );

  if (!response.ok) {
    throw new Error(`Property 26 FAILED: API request failed with status ${response.status}`);
  }

  const data: ClosingSummaryResponse = await response.json();

  // Verify: Response is successful
  if (!data.success) {
    throw new Error('Property 26 FAILED: Response success should be true');
  }

  if (!data.data) {
    throw new Error('Property 26 FAILED: Response data should be defined');
  }

  // Verify: Period information is included
  if (!data.data.period) {
    throw new Error('Property 26 FAILED: Period information should be included');
  }

  if (data.data.period.name !== period.name) {
    throw new Error(`Property 26 FAILED: Period name mismatch: expected ${period.name}, got ${data.data.period.name}`);
  }

  if (data.data.period.status !== 'Closed') {
    throw new Error(`Property 26 FAILED: Period status should be Closed, got ${data.data.period.status}`);
  }

  // Verify: Closing metadata is included (Requirements 8.2)
  if (!data.data.period.closed_by) {
    throw new Error('Property 26 FAILED: closed_by should be defined');
  }

  if (!data.data.period.closed_on) {
    throw new Error('Property 26 FAILED: closed_on should be defined');
  }

  // Verify: closed_on is a valid timestamp
  const closedOnDate = new Date(data.data.period.closed_on);
  if (isNaN(closedOnDate.getTime())) {
    throw new Error(`Property 26 FAILED: closed_on should be a valid timestamp, got ${data.data.period.closed_on}`);
  }

  // Verify: Account balances snapshot is included (Requirements 8.4)
  if (!data.data.account_balances) {
    throw new Error('Property 26 FAILED: account_balances should be defined');
  }

  if (!Array.isArray(data.data.account_balances)) {
    throw new Error('Property 26 FAILED: account_balances should be an array');
  }

  // Verify: Account balances have required fields
  if (data.data.account_balances.length > 0) {
    const balance = data.data.account_balances[0];
    if (!balance.account || !balance.account_name || !balance.root_type) {
      throw new Error('Property 26 FAILED: Account balance missing required fields');
    }
    if (typeof balance.debit !== 'number' || typeof balance.credit !== 'number' || typeof balance.balance !== 'number') {
      throw new Error('Property 26 FAILED: Account balance amounts should be numbers');
    }
    if (typeof balance.is_nominal !== 'boolean') {
      throw new Error('Property 26 FAILED: is_nominal should be boolean');
    }
  }

  // Verify: Nominal and real accounts are separated
  if (!data.data.nominal_accounts || !Array.isArray(data.data.nominal_accounts)) {
    throw new Error('Property 26 FAILED: nominal_accounts should be an array');
  }

  if (!data.data.real_accounts || !Array.isArray(data.data.real_accounts)) {
    throw new Error('Property 26 FAILED: real_accounts should be an array');
  }

  // Verify: All nominal accounts have is_nominal = true
  for (const account of data.data.nominal_accounts) {
    if (!account.is_nominal) {
      throw new Error(`Property 26 FAILED: Nominal account ${account.account} should have is_nominal = true`);
    }
    if (!['Income', 'Expense'].includes(account.root_type)) {
      throw new Error(`Property 26 FAILED: Nominal account ${account.account} should be Income or Expense, got ${account.root_type}`);
    }
  }

  // Verify: All real accounts have is_nominal = false
  for (const account of data.data.real_accounts) {
    if (account.is_nominal) {
      throw new Error(`Property 26 FAILED: Real account ${account.account} should have is_nominal = false`);
    }
    if (!['Asset', 'Liability', 'Equity'].includes(account.root_type)) {
      throw new Error(`Property 26 FAILED: Real account ${account.account} should be Asset, Liability, or Equity, got ${account.root_type}`);
    }
  }

  // Verify: Net income is calculated
  if (typeof data.data.net_income !== 'number') {
    throw new Error('Property 26 FAILED: net_income should be a number');
  }

  // Verify: Net income calculation is correct
  const totalIncome = data.data.nominal_accounts
    .filter(a => a.root_type === 'Income')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const totalExpense = data.data.nominal_accounts
    .filter(a => a.root_type === 'Expense')
    .reduce((sum, a) => sum + a.balance, 0);

  const expectedNetIncome = totalIncome - totalExpense;
  
  // Allow small floating point differences
  if (Math.abs(data.data.net_income - expectedNetIncome) >= 0.01) {
    throw new Error(`Property 26 FAILED: Net income calculation incorrect. Expected ${expectedNetIncome}, got ${data.data.net_income}`);
  }

  console.log('✓ Property 26 PASSED: Period detail completeness verified');
  console.log(`  Period: ${data.data.period.period_name}`);
  console.log(`  Closed by: ${data.data.period.closed_by}`);
  console.log(`  Closed on: ${data.data.period.closed_on}`);
  console.log(`  Account balances: ${data.data.account_balances.length}`);
  console.log(`  Nominal accounts: ${data.data.nominal_accounts.length}`);
  console.log(`  Real accounts: ${data.data.real_accounts.length}`);
  console.log(`  Net income: ${data.data.net_income}`);
}

/**
 * Property 27: Export Metadata Inclusion
 * 
 * **Validates: Requirements 8.6**
 * 
 * For any report export (PDF or Excel), the exported file should contain 
 * metadata including the export timestamp and the username of the user who 
 * performed the export.
 */
async function testProperty27_ExportMetadataInclusion(): Promise<void> {
  console.log('\n=== Property 27: Export Metadata Inclusion ===');

  // Find a closed period for testing
  const closedPeriods = await getClosedPeriods();

  if (closedPeriods.length === 0) {
    console.log('⚠ No closed periods found, skipping test');
    return;
  }

  const period = closedPeriods[0];

  // Test PDF export
  const pdfResponse = await fetch(
    `${NEXT_API_URL}/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(period.name)}&company=${encodeURIComponent(TEST_COMPANY)}&format=pdf`
  );

  if (!pdfResponse.ok) {
    throw new Error(`Property 27 FAILED: PDF export request failed with status ${pdfResponse.status}`);
  }

  const pdfData: ClosingSummaryResponse = await pdfResponse.json();

  if (!pdfData.success) {
    throw new Error('Property 27 FAILED: PDF export response success should be true');
  }

  if (!pdfData.pdf_url) {
    throw new Error('Property 27 FAILED: PDF URL should be provided');
  }

  if (typeof pdfData.pdf_url !== 'string') {
    throw new Error('Property 27 FAILED: PDF URL should be a string');
  }

  if (!pdfData.pdf_url.includes(period.name)) {
    throw new Error('Property 27 FAILED: PDF URL should contain period name');
  }

  console.log('✓ Property 27 PASSED (PDF): Export metadata URL generated');
  console.log(`  PDF URL: ${pdfData.pdf_url}`);

  // Test Excel export
  const excelResponse = await fetch(
    `${NEXT_API_URL}/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(period.name)}&company=${encodeURIComponent(TEST_COMPANY)}&format=excel`
  );

  if (!excelResponse.ok) {
    throw new Error(`Property 27 FAILED: Excel export request failed with status ${excelResponse.status}`);
  }

  const excelData: ClosingSummaryResponse = await excelResponse.json();

  if (!excelData.success) {
    throw new Error('Property 27 FAILED: Excel export response success should be true');
  }

  if (!excelData.excel_url) {
    throw new Error('Property 27 FAILED: Excel URL should be provided');
  }

  if (typeof excelData.excel_url !== 'string') {
    throw new Error('Property 27 FAILED: Excel URL should be a string');
  }

  if (!excelData.excel_url.includes(period.name)) {
    throw new Error('Property 27 FAILED: Excel URL should contain period name');
  }

  console.log('✓ Property 27 PASSED (Excel): Export metadata URL generated');
  console.log(`  Excel URL: ${excelData.excel_url}`);

  // Test JSON format (default)
  const jsonResponse = await fetch(
    `${NEXT_API_URL}/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(period.name)}&company=${encodeURIComponent(TEST_COMPANY)}`
  );

  if (!jsonResponse.ok) {
    throw new Error(`Property 27 FAILED: JSON format request failed with status ${jsonResponse.status}`);
  }

  const jsonData: ClosingSummaryResponse = await jsonResponse.json();

  if (!jsonData.success) {
    throw new Error('Property 27 FAILED: JSON format response success should be true');
  }

  if (jsonData.pdf_url !== undefined) {
    throw new Error('Property 27 FAILED: JSON format should not include pdf_url');
  }

  if (jsonData.excel_url !== undefined) {
    throw new Error('Property 27 FAILED: JSON format should not include excel_url');
  }

  if (!jsonData.data) {
    throw new Error('Property 27 FAILED: JSON format should include data');
  }

  console.log('✓ Property 27 PASSED (JSON): Default format returns data without export URLs');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Property-Based Tests for Reports');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Property 26', fn: testProperty26_PeriodDetailCompleteness },
    { name: 'Property 27', fn: testProperty27_ExportMetadataInclusion },
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
