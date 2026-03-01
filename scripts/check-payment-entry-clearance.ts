#!/usr/bin/env tsx

/**
 * Check Payment Entry for clearance_date field
 * ERPNext v15 uses Payment Entry for bank reconciliation
 */

import dotenv from 'dotenv';
import path from 'path';

// Load production environment
dotenv.config({ path: path.join(process.cwd(), '.env.production') });

async function checkPaymentEntryClearance() {
  console.log('🔍 Checking Payment Entry for clearance_date field...\n');

  try {
    // Check Payment Entry doctype fields
    console.log('Test 1: Checking Payment Entry doctype fields...');
    const response1 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/DocType/Payment Entry`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${await response1.text()}`);
    }
    
    const data1 = await response1.json();
    
    // Look for clearance_date field
    const clearanceField = data1.data.fields?.find((f: any) => f.fieldname === 'clearance_date');
    
    if (clearanceField) {
      console.log('✅ SUCCESS: clearance_date field found in Payment Entry');
      console.log('Field details:', {
        fieldname: clearanceField.fieldname,
        fieldtype: clearanceField.fieldtype,
        label: clearanceField.label,
        permlevel: clearanceField.permlevel,
        read_only: clearanceField.read_only,
      });
    } else {
      console.log('❌ clearance_date field not found in Payment Entry');
      
      // Look for bank reconciliation related fields
      const bankFields = data1.data.fields?.filter((f: any) => 
        f.fieldname.includes('bank') || 
        f.fieldname.includes('reconcil') || 
        f.fieldname.includes('clear') ||
        f.label?.toLowerCase().includes('bank') ||
        f.label?.toLowerCase().includes('reconcil') ||
        f.label?.toLowerCase().includes('clear')
      );
      
      console.log('Bank reconciliation related fields in Payment Entry:');
      if (bankFields && bankFields.length > 0) {
        bankFields.forEach((f: any) => {
          console.log(`  - ${f.fieldname} (${f.fieldtype}): ${f.label}`);
        });
      } else {
        console.log('  No bank reconciliation fields found');
      }
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot check Payment Entry fields');
    console.log('Error:', error.message);
  }

  try {
    // Test accessing Payment Entry with clearance_date field
    console.log('\nTest 2: Testing Payment Entry access with clearance_date...');
    const response2 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/Payment Entry?fields=["name","posting_date","clearance_date"]&limit_page_length=5`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ SUCCESS: Can access clearance_date field in Payment Entry');
      console.log(`Found ${data2.data.length} Payment entries`);
      if (data2.data.length > 0) {
        console.log('Sample entry:', data2.data[0]);
      }
    } else {
      const errorText = await response2.text();
      console.log('❌ FAILED: Cannot access clearance_date field in Payment Entry');
      console.log('Error:', errorText);
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot test Payment Entry access');
    console.log('Error:', error.message);
  }

  try {
    // Test filtering Payment Entry by clearance_date
    console.log('\nTest 3: Testing Payment Entry filter by clearance_date...');
    const filters = JSON.stringify([["clearance_date", "is", "not set"]]);
    const response3 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/Payment Entry?filters=${encodeURIComponent(filters)}&fields=["name","posting_date"]&limit_page_length=5`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ SUCCESS: Can filter Payment Entry by clearance_date');
      console.log(`Found ${data3.data.length} uncleared Payment entries`);
    } else {
      const errorText = await response3.text();
      console.log('❌ FAILED: Cannot filter Payment Entry by clearance_date');
      console.log('Error:', errorText);
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot test Payment Entry filtering');
    console.log('Error:', error.message);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('In ERPNext v15, bank reconciliation typically works with:');
  console.log('1. Payment Entry doctype (not GL Entry) for clearance_date');
  console.log('2. Bank Clearance Tool to update clearance dates');
  console.log('3. Bank Reconciliation Statement report to verify reconciliation');
  console.log('\nRecommendation: Update your validation logic to use Payment Entry instead of GL Entry');
}

// Run the test
checkPaymentEntryClearance().catch(console.error);