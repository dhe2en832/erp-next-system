#!/usr/bin/env tsx
/**
 * Chart of Accounts Verification Script
 * 
 * Verification script to validate COA replacement was successful. This script:
 * - Loads environment variables for API authentication
 * - Initializes ERPNextClient and VerificationReporter
 * - Loads expected account numbers from new-coa-data.json
 * - Runs comprehensive verification checks
 * - Displays formatted report output
 * - Exits with status code 0 if verification passes, 1 if fails
 * 
 * Verification checks include:
 * - All 143 expected accounts exist
 * - Hierarchy integrity (valid parent-child relationships)
 * - No orphaned accounts (invalid parent references)
 * - No ledger accounts with children
 * - All leaf accounts are ledgers
 * - Account counts by root_type, account_type, and currency
 * 
 * Usage:
 *   pnpm tsx scripts/verify-coa.ts
 *   pnpm verify-coa
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { ERPNextClient } from '@/lib/erpnext';
import { VerificationReporter } from './lib/verification-reporter';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Load expected account numbers from new-coa-data.json
 */
async function loadExpectedAccountNumbers(): Promise<string[]> {
  const dataFilePath = resolve(process.cwd(), 'scripts/new-coa-data.json');
  
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const coaData = JSON.parse(fileContent);
    
    if (!Array.isArray(coaData)) {
      throw new Error('COA data file must contain an array of accounts');
    }
    
    // Extract account numbers
    const accountNumbers = coaData.map((account: any) => {
      if (!account.account_number) {
        throw new Error('Account missing account_number field');
      }
      return String(account.account_number);
    });
    
    return accountNumbers;
  } catch (error: any) {
    throw new Error(`Failed to load COA data file: ${error.message}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Chart of Accounts Verification                           ║');
  console.log('║  Berkat Abadi Cirebon                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Validate environment variables
    console.log('🔐 Validating environment configuration...');
    
    const apiUrl = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiUrl) {
      throw new Error('ERPNEXT_API_URL or ERPNEXT_URL not configured in .env.local');
    }
    
    if (!apiKey || !apiSecret) {
      throw new Error('ERP_API_KEY and ERP_API_SECRET not configured in .env.local');
    }
    
    console.log(`✅ API URL: ${apiUrl}`);
    console.log(`✅ API credentials configured`);
    console.log('');
    
    // Initialize ERPNext client
    console.log('🔌 Initializing ERPNext client...');
    const client = new ERPNextClient(apiUrl);
    console.log('✅ Client initialized');
    console.log('');
    
    // Test connection
    console.log('🔗 Testing connection to ERPNext...');
    try {
      await client.getList('Company', { limit: 1 });
      console.log('✅ Connection successful');
    } catch (error: any) {
      throw new Error(`Failed to connect to ERPNext: ${error.message}`);
    }
    console.log('');
    
    // Load expected account numbers
    console.log('📂 Loading expected account numbers...');
    const expectedAccountNumbers = await loadExpectedAccountNumbers();
    console.log(`✅ Loaded ${expectedAccountNumbers.length} expected accounts`);
    console.log('');
    
    // Initialize Verification Reporter
    console.log('⚙️  Initializing Verification Reporter...');
    const reporter = new VerificationReporter(client, 'Berkat Abadi Cirebon');
    console.log('✅ Reporter initialized');
    console.log('');
    
    // Run verification
    console.log('🔍 Running verification checks...');
    console.log('   This may take a moment...');
    console.log('');
    
    const report = await reporter.generateReport(expectedAccountNumbers);
    
    // Display formatted report
    reporter.printReport(report);
    
    // Calculate execution time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Verification completed in ${totalTime}s`);
    console.log('');
    
    // Exit with appropriate status code
    if (report.verification_passed) {
      console.log('✅ All verification checks passed!');
      console.log('');
      console.log('The Chart of Accounts has been successfully verified.');
      console.log('All 143 expected accounts exist with correct hierarchy.');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ Verification failed!');
      console.log('');
      console.log('Please review the errors above and take corrective action:');
      console.log('  1. Check missing accounts and create them if needed');
      console.log('  2. Fix orphaned accounts by updating parent references');
      console.log('  3. Correct hierarchy errors');
      console.log('  4. Fix ledger accounts that have children');
      console.log('  5. Fix leaf accounts marked as groups');
      console.log('');
      console.log('After making corrections, run verification again:');
      console.log('  pnpm tsx scripts/verify-coa.ts');
      console.log('');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ VERIFICATION FAILED                                     ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
      console.error('');
    }
    
    console.error('Please check:');
    console.error('  1. Environment variables in .env.local');
    console.error('  2. ERPNext server is running and accessible');
    console.error('  3. API credentials are valid');
    console.error('  4. COA data file exists: scripts/new-coa-data.json');
    console.error('');
    
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
