#!/usr/bin/env tsx

/**
 * Test script to check clearance_date field access
 * This will help diagnose permission issues
 */

import dotenv from 'dotenv';
import path from 'path';

// Load production environment
dotenv.config({ path: path.join(process.cwd(), '.env.production') });

async function testClearanceDateAccess() {
  console.log('🔍 Testing clearance_date field access...\n');
  console.log('Environment:', {
    ERPNEXT_API_URL: process.env.ERPNEXT_API_URL,
    ERP_API_KEY: process.env.ERP_API_KEY ? '***' + process.env.ERP_API_KEY.slice(-3) : 'NOT SET',
    ERP_API_SECRET: process.env.ERP_API_SECRET ? '***' + process.env.ERP_API_SECRET.slice(-3) : 'NOT SET',
  });

  try {
    // Test basic connection first
    console.log('\nTest 0: Basic API connection...');
    const response = await fetch(`${process.env.ERPNEXT_API_URL}/api/method/frappe.auth.get_logged_user`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ SUCCESS: Basic API connection works');
    console.log('Logged in as:', data.message);
    
  } catch (error: any) {
    console.log('❌ FAILED: Basic API connection failed');
    console.log('Error:', error.message);
    return; // Stop if basic connection fails
  }

  try {
    // Test 1: Check ERPNext version and system info
    console.log('\nTest 1: Checking ERPNext version...');
    const response1 = await fetch(`${process.env.ERPNEXT_API_URL}/api/method/frappe.utils.change_log.get_versions`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${await response1.text()}`);
    }
    
    const data1 = await response1.json();
    console.log('✅ SUCCESS: ERPNext version info');
    console.log('Versions:', data1.message);

  } catch (error: any) {
    console.log('❌ FAILED: Cannot get version info');
    console.log('Error:', error.message);
  }

  try {
    // Test 2: Check all GL Entry fields to find bank reconciliation related fields
    console.log('\nTest 2: Finding bank reconciliation fields in GL Entry...');
    const response2 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/DocType/GL Entry`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}: ${await response2.text()}`);
    }
    
    const data2 = await response2.json();
    
    // Look for bank reconciliation related fields
    const bankFields = data2.data.fields?.filter((f: any) => 
      f.fieldname.includes('bank') || 
      f.fieldname.includes('reconcil') || 
      f.fieldname.includes('clear') ||
      f.label?.toLowerCase().includes('bank') ||
      f.label?.toLowerCase().includes('reconcil') ||
      f.label?.toLowerCase().includes('clear')
    );
    
    console.log('✅ Bank reconciliation related fields found:');
    if (bankFields && bankFields.length > 0) {
      bankFields.forEach((f: any) => {
        console.log(`  - ${f.fieldname} (${f.fieldtype}): ${f.label}`);
      });
    } else {
      console.log('❌ No bank reconciliation fields found in GL Entry');
      console.log('This suggests bank reconciliation might work differently in your ERPNext version');
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot get GL Entry fields');
    console.log('Error:', error.message);
  }

  try {
    // Test 3: Check if Bank Reconciliation doctype exists
    console.log('\nTest 3: Checking Bank Reconciliation doctype...');
    const response3 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/DocType/Bank Reconciliation`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ SUCCESS: Bank Reconciliation doctype exists');
      
      // Look for clearance_date field in Bank Reconciliation
      const clearanceField = data3.data.fields?.find((f: any) => f.fieldname === 'clearance_date');
      if (clearanceField) {
        console.log('Found clearance_date field in Bank Reconciliation doctype');
      }
    } else {
      console.log('❌ Bank Reconciliation doctype not found');
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot check Bank Reconciliation doctype');
    console.log('Error:', error.message);
  }

  try {
    // Test 4: Check Bank Transaction doctype (newer ERPNext versions)
    console.log('\nTest 4: Checking Bank Transaction doctype...');
    const response4 = await fetch(`${process.env.ERPNEXT_API_URL}/api/resource/DocType/Bank Transaction`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response4.ok) {
      const data4 = await response4.json();
      console.log('✅ SUCCESS: Bank Transaction doctype exists');
      
      // Look for clearance related fields
      const clearanceFields = data4.data.fields?.filter((f: any) => 
        f.fieldname.includes('clear') || 
        f.label?.toLowerCase().includes('clear')
      );
      
      if (clearanceFields && clearanceFields.length > 0) {
        console.log('Clearance fields in Bank Transaction:');
        clearanceFields.forEach((f: any) => {
          console.log(`  - ${f.fieldname} (${f.fieldtype}): ${f.label}`);
        });
      }
    } else {
      console.log('❌ Bank Transaction doctype not found');
    }

  } catch (error: any) {
    console.log('❌ FAILED: Cannot check Bank Transaction doctype');
    console.log('Error:', error.message);
  }

  console.log('\n=== SUMMARY ===');
  console.log('Based on the tests above, here are the possible solutions:');
  console.log('1. If clearance_date field is missing from GL Entry, you need to add it as a custom field');
  console.log('2. If Bank Transaction doctype exists, bank reconciliation might use that instead');
  console.log('3. Your ERPNext version might use a different approach for bank reconciliation');
  console.log('4. Check ERPNext documentation for your version on bank reconciliation setup');
}

// Run the test
testClearanceDateAccess().catch(console.error);