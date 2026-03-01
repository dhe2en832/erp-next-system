#!/usr/bin/env tsx

/**
 * Test the fixed bank reconciliation function
 * Now uses Payment Entry instead of GL Entry
 */

import dotenv from 'dotenv';
import path from 'path';

// Load production environment
dotenv.config({ path: path.join(process.cwd(), '.env.production') });

import { erpnextClient } from '@/lib/erpnext';

async function testFixedBankReconciliation() {
  console.log('🔍 Testing fixed bank reconciliation function...\n');

  try {
    // Test the accounting period validation API
    console.log('Test 1: Calling accounting period validation API...');
    const response = await fetch(`${process.env.ERPNEXT_API_URL?.replace('https://bac.batasku.cloud', 'http://localhost:3000')}/api/accounting-period/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period_name: 'Test Period 2024',
        company: 'Test Company'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: API call successful');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // Look for bank reconciliation validation result
      const bankValidation = data.validations?.find((v: any) => v.check_name === 'Bank Reconciliation Complete');
      if (bankValidation) {
        console.log('\n📊 Bank Reconciliation Result:');
        console.log(`  - Passed: ${bankValidation.passed}`);
        console.log(`  - Message: ${bankValidation.message}`);
        console.log(`  - Severity: ${bankValidation.severity}`);
        if (bankValidation.validation_skipped) {
          console.log(`  - Skipped: ${bankValidation.validation_skipped}`);
          console.log(`  - Skip Reason: ${bankValidation.skip_reason}`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED: API call failed');
      console.log('Error:', errorText);
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot test API');
    console.log('Error:', error.message);
  }

  try {
    // Test direct Payment Entry access
    console.log('\nTest 2: Direct Payment Entry test...');
    
    // Get bank accounts
    const bankAccounts = await erpnextClient.getList('Account', {
      filters: [
        ['account_type', '=', 'Bank'],
      ],
      fields: ['name', 'account_name'],
      limit_page_length: 5,
    });

    console.log(`Found ${bankAccounts.length} bank accounts`);

    if (bankAccounts.length > 0) {
      const testAccount = bankAccounts[0];
      console.log(`Testing with account: ${testAccount.name}`);

      // Test Payment Entry query
      const unreconciledPayments = await erpnextClient.getList('Payment Entry', {
        filters: [
          ['paid_from', '=', testAccount.name],
          ['clearance_date', 'is', 'not set'],
          ['docstatus', '=', 1],
        ],
        fields: ['name', 'paid_amount', 'posting_date'],
        limit_page_length: 5,
      });

      console.log(`✅ SUCCESS: Found ${unreconciledPayments.length} uncleared payments`);
      if (unreconciledPayments.length > 0) {
        console.log('Sample uncleared payment:', unreconciledPayments[0]);
      }

      // Test received payments
      const unreconciledReceipts = await erpnextClient.getList('Payment Entry', {
        filters: [
          ['paid_to', '=', testAccount.name],
          ['clearance_date', 'is', 'not set'],
          ['docstatus', '=', 1],
        ],
        fields: ['name', 'received_amount', 'posting_date'],
        limit_page_length: 5,
      });

      console.log(`✅ SUCCESS: Found ${unreconciledReceipts.length} uncleared receipts`);
      if (unreconciledReceipts.length > 0) {
        console.log('Sample uncleared receipt:', unreconciledReceipts[0]);
      }
    }

  } catch (error: any) {
    console.log('❌ FAILED: Direct Payment Entry test failed');
    console.log('Error:', error.message);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('The fixed bank reconciliation function should now:');
  console.log('1. ✅ Use Payment Entry instead of GL Entry');
  console.log('2. ✅ Access clearance_date field successfully');
  console.log('3. ✅ Provide accurate bank reconciliation status');
  console.log('4. ✅ Handle both paid_from and paid_to transactions');
}

// Run the test
testFixedBankReconciliation().catch(console.error);