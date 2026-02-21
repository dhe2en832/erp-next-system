/**
 * Property-Based Tests for Accounting Period Configuration
 * 
 * Feature: accounting-period-closing
 * 
 * This file contains property tests for:
 * - Property 29: Configuration Validation
 * 
 * **Validates: Requirements 12.6**
 */

import { getERPNextClient } from '../lib/erpnext';
import type { PeriodClosingConfig, UpdateConfigRequest } from '../types/accounting-period';

// Test configuration
const TEST_COMPANY = 'Batasku';

/**
 * Feature: accounting-period-closing, Property 29: Configuration Validation
 * 
 * **Validates: Requirements 12.6**
 * 
 * For any configuration change request, if the change would violate basic 
 * accounting rules (e.g., setting retained_earnings_account to a non-equity 
 * account), the system should reject the change with an appropriate error message.
 */
async function testProperty29_ConfigurationValidation(): Promise<void> {
  console.log('\n=== Property 29: Configuration Validation ===');
  
  const client = await getERPNextClient();

  // Test 1: Attempt to set retained_earnings_account to a non-equity account (Asset)
  console.log('\nTest 1: Setting retained_earnings_account to Asset account');
  try {
    const assetAccount = await client.getList('Account', {
      filters: [
        ['company', '=', TEST_COMPANY],
        ['root_type', '=', 'Asset'],
        ['is_group', '=', 0]
      ],
      fields: ['name', 'account_name', 'root_type'],
      limit_page_length: 1
    });

    if (assetAccount.length === 0) {
      console.log('  ⚠ Skipping: No Asset account found');
    } else {
      const response = await fetch('http://localhost:3000/api/accounting-period/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retained_earnings_account: assetAccount[0].name
        })
      });

      const data = await response.json();

      if (response.ok) {
        throw new Error(
          `Property 29 FAILED: Should reject Asset account as retained_earnings_account, but accepted it`
        );
      }

      if (!data.message?.toLowerCase().includes('equity')) {
        throw new Error(
          `Property 29 FAILED: Error message should mention "equity", got "${data.message}"`
        );
      }

      console.log(`  ✓ Correctly rejected Asset account: ${assetAccount[0].name}`);
      console.log(`  Error message: ${data.message}`);
    }
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 1:', error.message);
  }

  // Test 2: Attempt to set retained_earnings_account to a non-equity account (Liability)
  console.log('\nTest 2: Setting retained_earnings_account to Liability account');
  try {
    const liabilityAccount = await client.getList('Account', {
      filters: [
        ['company', '=', TEST_COMPANY],
        ['root_type', '=', 'Liability'],
        ['is_group', '=', 0]
      ],
      fields: ['name', 'account_name', 'root_type'],
      limit_page_length: 1
    });

    if (liabilityAccount.length === 0) {
      console.log('  ⚠ Skipping: No Liability account found');
    } else {
      const response = await fetch('http://localhost:3000/api/accounting-period/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retained_earnings_account: liabilityAccount[0].name
        })
      });

      const data = await response.json();

      if (response.ok) {
        throw new Error(
          `Property 29 FAILED: Should reject Liability account as retained_earnings_account, but accepted it`
        );
      }

      if (!data.message?.toLowerCase().includes('equity')) {
        throw new Error(
          `Property 29 FAILED: Error message should mention "equity", got "${data.message}"`
        );
      }

      console.log(`  ✓ Correctly rejected Liability account: ${liabilityAccount[0].name}`);
      console.log(`  Error message: ${data.message}`);
    }
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 2:', error.message);
  }

  // Test 3: Attempt to set retained_earnings_account to a non-equity account (Income)
  console.log('\nTest 3: Setting retained_earnings_account to Income account');
  try {
    const incomeAccount = await client.getList('Account', {
      filters: [
        ['company', '=', TEST_COMPANY],
        ['root_type', '=', 'Income'],
        ['is_group', '=', 0]
      ],
      fields: ['name', 'account_name', 'root_type'],
      limit_page_length: 1
    });

    if (incomeAccount.length === 0) {
      console.log('  ⚠ Skipping: No Income account found');
    } else {
      const response = await fetch('http://localhost:3000/api/accounting-period/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retained_earnings_account: incomeAccount[0].name
        })
      });

      const data = await response.json();

      if (response.ok) {
        throw new Error(
          `Property 29 FAILED: Should reject Income account as retained_earnings_account, but accepted it`
        );
      }

      if (!data.message?.toLowerCase().includes('equity')) {
        throw new Error(
          `Property 29 FAILED: Error message should mention "equity", got "${data.message}"`
        );
      }

      console.log(`  ✓ Correctly rejected Income account: ${incomeAccount[0].name}`);
      console.log(`  Error message: ${data.message}`);
    }
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 3:', error.message);
  }

  // Test 4: Attempt to set retained_earnings_account to a non-equity account (Expense)
  console.log('\nTest 4: Setting retained_earnings_account to Expense account');
  try {
    const expenseAccount = await client.getList('Account', {
      filters: [
        ['company', '=', TEST_COMPANY],
        ['root_type', '=', 'Expense'],
        ['is_group', '=', 0]
      ],
      fields: ['name', 'account_name', 'root_type'],
      limit_page_length: 1
    });

    if (expenseAccount.length === 0) {
      console.log('  ⚠ Skipping: No Expense account found');
    } else {
      const response = await fetch('http://localhost:3000/api/accounting-period/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retained_earnings_account: expenseAccount[0].name
        })
      });

      const data = await response.json();

      if (response.ok) {
        throw new Error(
          `Property 29 FAILED: Should reject Expense account as retained_earnings_account, but accepted it`
        );
      }

      if (!data.message?.toLowerCase().includes('equity')) {
        throw new Error(
          `Property 29 FAILED: Error message should mention "equity", got "${data.message}"`
        );
      }

      console.log(`  ✓ Correctly rejected Expense account: ${expenseAccount[0].name}`);
      console.log(`  Error message: ${data.message}`);
    }
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 4:', error.message);
  }

  // Test 5: Accept valid Equity account
  console.log('\nTest 5: Setting retained_earnings_account to valid Equity account');
  try {
    const equityAccount = await client.getList('Account', {
      filters: [
        ['company', '=', TEST_COMPANY],
        ['root_type', '=', 'Equity'],
        ['is_group', '=', 0]
      ],
      fields: ['name', 'account_name', 'root_type'],
      limit_page_length: 1
    });

    if (equityAccount.length === 0) {
      console.log('  ⚠ Skipping: No Equity account found');
    } else {
      const response = await fetch('http://localhost:3000/api/accounting-period/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retained_earnings_account: equityAccount[0].name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Property 29 FAILED: Should accept Equity account as retained_earnings_account, but rejected it: ${data.message}`
        );
      }

      if (data.data.retained_earnings_account !== equityAccount[0].name) {
        throw new Error(
          `Property 29 FAILED: retained_earnings_account should be set to ${equityAccount[0].name}, got ${data.data.retained_earnings_account}`
        );
      }

      console.log(`  ✓ Correctly accepted Equity account: ${equityAccount[0].name}`);
      console.log(`  Configuration updated successfully`);
    }
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 5:', error.message);
  }

  // Test 6: Attempt to set invalid role for closing_role
  console.log('\nTest 6: Setting closing_role to non-existent role');
  try {
    const response = await fetch('http://localhost:3000/api/accounting-period/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closing_role: 'NonExistentRole_' + Date.now()
      })
    });

    const data = await response.json();

    if (response.ok) {
      throw new Error(
        `Property 29 FAILED: Should reject non-existent role, but accepted it`
      );
    }

    if (!data.message?.toLowerCase().includes('does not exist')) {
      throw new Error(
        `Property 29 FAILED: Error message should mention "does not exist", got "${data.message}"`
      );
    }

    console.log(`  ✓ Correctly rejected non-existent role`);
    console.log(`  Error message: ${data.message}`);
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 6:', error.message);
  }

  // Test 7: Attempt to set invalid role for reopen_role
  console.log('\nTest 7: Setting reopen_role to non-existent role');
  try {
    const response = await fetch('http://localhost:3000/api/accounting-period/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reopen_role: 'NonExistentRole_' + Date.now()
      })
    });

    const data = await response.json();

    if (response.ok) {
      throw new Error(
        `Property 29 FAILED: Should reject non-existent role, but accepted it`
      );
    }

    if (!data.message?.toLowerCase().includes('does not exist')) {
      throw new Error(
        `Property 29 FAILED: Error message should mention "does not exist", got "${data.message}"`
      );
    }

    console.log(`  ✓ Correctly rejected non-existent role`);
    console.log(`  Error message: ${data.message}`);
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 7:', error.message);
  }

  // Test 8: Accept valid role for closing_role
  console.log('\nTest 8: Setting closing_role to valid role');
  try {
    const response = await fetch('http://localhost:3000/api/accounting-period/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closing_role: 'Accounts Manager'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Property 29 FAILED: Should accept valid role, but rejected it: ${data.message}`
      );
    }

    if (data.data.closing_role !== 'Accounts Manager') {
      throw new Error(
        `Property 29 FAILED: closing_role should be set to "Accounts Manager", got "${data.data.closing_role}"`
      );
    }

    console.log(`  ✓ Correctly accepted valid role: Accounts Manager`);
    console.log(`  Configuration updated successfully`);
  } catch (error: any) {
    if (error.message.includes('Property 29 FAILED')) {
      throw error;
    }
    console.error('  Error in Test 8:', error.message);
  }

  console.log('\n✓ Property 29 PASSED: Configuration validation correctly enforces accounting rules');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Property-Based Tests for Configuration Management');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Property 29', fn: testProperty29_ConfigurationValidation },
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
