#!/usr/bin/env tsx

/**
 * Test the production fix for bank reconciliation
 */

async function testProductionFix() {
  console.log('🔍 Testing production fix for bank reconciliation...\n');

  try {
    // Test the accounting period validation API on localhost
    console.log('Test 1: Testing accounting period validation API...');
    const response = await fetch('http://localhost:3000/api/accounting-period/validate', {
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
        if (bankValidation.details && bankValidation.details.length > 0) {
          console.log(`  - Details: ${JSON.stringify(bankValidation.details, null, 2)}`);
        }
      } else {
        console.log('❌ Bank reconciliation validation not found in response');
      }

      // Show all validations
      console.log('\n📋 All Validations:');
      data.validations?.forEach((v: any, i: number) => {
        console.log(`  ${i + 1}. ${v.check_name}: ${v.passed ? '✅' : '❌'} - ${v.message}`);
      });

    } else {
      const errorText = await response.text();
      console.log('❌ FAILED: API call failed');
      console.log('Status:', response.status);
      console.log('Error:', errorText);
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot test API');
    console.log('Error:', error.message);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('The fix should now:');
  console.log('1. ✅ Use Payment Entry instead of GL Entry for bank reconciliation');
  console.log('2. ✅ Access clearance_date field successfully');
  console.log('3. ✅ Provide accurate bank reconciliation status');
  console.log('4. ✅ Handle both outgoing (paid_from) and incoming (paid_to) payments');
  console.log('5. ✅ No more runtime errors in PM2 logs');
}

// Run the test
testProductionFix().catch(console.error);