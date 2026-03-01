#!/usr/bin/env tsx

/**
 * Check Account Types in ERPNext
 * 
 * This script queries ERPNext to see what account types are actually being used
 * for existing accounts, to help us understand the validation rules.
 */

import { ERPNextClient } from '@/lib/erpnext';

async function main() {
  const client = new ERPNextClient(
    process.env.ERPNEXT_API_URL || 'http://localhost:8000'
  );

  // console.log('Fetching accounts from ERPNext...\n');

  try {
    // Get all accounts for the company
    const accounts = await client.getList<any>('Account', {
      filters: [['company', '=', 'Berkat Abadi Cirebon']],
      fields: ['name', 'account_number', 'account_name', 'account_type', 'is_group', 'root_type'],
      limit: 500
    });

    // console.log(`Found ${accounts.length} accounts\n`);

    // Group by account_type
    const byType: Record<string, any[]> = {};
    for (const account of accounts) {
      const type = account.account_type || '(empty)';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(account);
    }

    // Display summary
    // console.log('Account Types in use:');
    // console.log('='.repeat(80));
    for (const [type, accts] of Object.entries(byType)) {
      const leafCount = accts.filter(a => a.is_group === 0).length;
      const groupCount = accts.filter(a => a.is_group === 1).length;
      // console.log(`\n${type}:`);
      // console.log(`  Total: ${accts.length} (${leafCount} leaf, ${groupCount} group)`);
      
      // Show a few examples
      // const examples = accts.slice(0, 3);
      // for (const ex of examples) {
      //   console.log(`    - ${ex.account_number || '?'} ${ex.account_name} (is_group=${ex.is_group}, root_type=${ex.root_type})`);
      // }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
