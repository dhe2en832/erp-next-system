#!/usr/bin/env tsx
/**
 * Complete Chart of Accounts Replacement Script
 * 
 * Main entry point for COA replacement process. This script:
 * - Loads environment variables for API authentication
 * - Initializes ERPNextClient and COAManager
 * - Executes COA replacement with error handling
 * - Displays processing summary
 * - Saves detailed change log to file
 * - Supports --dry-run flag for preview mode
 * 
 * Usage:
 *   pnpm tsx scripts/update-coa.ts           # Normal execution
 *   pnpm tsx scripts/update-coa.ts --dry-run # Preview mode (no changes)
 * 
 * Requirements: 1.1, 1.2, 8.4, 9.1, 12.1
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { ERPNextClient } from '@/lib/erpnext';
import { COAManager } from './lib/coa-manager';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  
  // Check for dry-run flag
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Complete Chart of Accounts Replacement                   ║');
  console.log('║  Berkat Abadi Cirebon                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied');
    console.log('');
  }
  
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
    
    if (isDryRun) {
      console.log('🔍 DRY RUN: Skipping actual COA replacement');
      console.log('');
      console.log('In normal mode, this script would:');
      console.log('  1. Load COA data from scripts/new-coa-data.json');
      console.log('  2. Validate and sort accounts by hierarchy');
      console.log('  3. Create or update 143 accounts');
      console.log('  4. Generate processing summary');
      console.log('  5. Save change log to scripts/coa-replacement-log.json');
      console.log('');
      console.log('To execute the replacement, run without --dry-run flag:');
      console.log('  pnpm tsx scripts/update-coa.ts');
      console.log('');
      return;
    }
    
    // Initialize COA Manager
    console.log('⚙️  Initializing COA Manager...');
    const manager = new COAManager(client);
    console.log('✅ Manager initialized');
    console.log('');
    
    // Define paths
    const dataFilePath = resolve(process.cwd(), 'scripts/new-coa-data.json');
    const logFilePath = resolve(process.cwd(), 'scripts/coa-replacement-log.json');
    
    // Execute COA replacement
    const summary = await manager.execute(dataFilePath);
    
    // Generate change log
    console.log('📝 Generating change log...');
    const changeLog = {
      timestamp: new Date().toISOString(),
      duration_ms: summary.duration_ms,
      summary: {
        total_accounts: summary.total_accounts,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed
      },
      errors: summary.errors,
      execution_time: new Date().toISOString(),
      data_file: dataFilePath,
      api_url: apiUrl
    };
    
    // Save change log to file
    await fs.writeFile(
      logFilePath,
      JSON.stringify(changeLog, null, 2),
      'utf-8'
    );
    
    console.log(`✅ Change log saved to: ${logFilePath}`);
    console.log('');
    
    // Final status
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Execution Complete                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⏱️  Total execution time: ${totalTime}s`);
    console.log('');
    
    if (summary.failed > 0) {
      console.log('⚠️  Some accounts failed to process. Review the change log for details.');
      console.log(`   Log file: ${logFilePath}`);
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ All accounts processed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Review the change log: scripts/coa-replacement-log.json');
      console.log('  2. Run verification: pnpm tsx scripts/verify-coa.ts');
      console.log('  3. Update company default accounts if needed');
      console.log('');
    }
    
  } catch (error: any) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ EXECUTION FAILED                                        ║');
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
