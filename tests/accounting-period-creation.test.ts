/**
 * Property-Based Tests for Accounting Period Creation
 * Feature: accounting-period-closing
 * Task 3.3: Buat property tests untuk period creation
 * 
 * **Validates: Requirements 1.2, 1.3, 1.5**
 * 
 * Property 1: Date Range Validation
 * Property 2: Period Overlap Detection
 * Property 4: Initial Status Invariant
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
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'Berkat Abadi Cirebon';

interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
}

// Helper functions
async function createPeriod(data: any): Promise<AccountingPeriod> {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Accounting Period`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  const result = await response.json();
  return result.data;
}

async function deletePeriod(name: string): Promise<void> {
  await fetch(`${ERPNEXT_API_URL}/api/resource/Accounting Period/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
    }
  });
}

// Property 1: Date Range Validation
async function testDateRangeValidation(iteration: number): Promise<boolean> {
  try {
    // Generate invalid date range (end before start)
    const year = 2024 + Math.floor(Math.random() * 2);
    const month = Math.floor(Math.random() * 12) + 1;
    const startDate = new Date(year, month - 1, 15);
    const endDate = new Date(year, month - 1, 1); // Before start
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    try {
      await createPeriod({
        period_name: `TEST-INVALID-${iteration}-${Date.now()}`,
        company: COMPANY,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        period_type: 'Monthly',
        status: 'Open',
      });
      
      // Should not reach here
      return false;
    } catch (error: any) {
      // Should reject with error about dates
      return error.message.toLowerCase().includes('date') || 
             error.message.toLowerCase().includes('before') ||
             error.message.toLowerCase().includes('after');
    }
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  }
}

// Property 2: Period Overlap Detection
async function testOverlapDetection(iteration: number): Promise<boolean> {
  let period1Name: string | null = null;
  
  try {
    // Create first period
    const year = 2024;
    const month = (iteration % 12) + 1;
    const startDate1 = new Date(year, month - 1, 1);
    const endDate1 = new Date(year, month - 1, 28);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const period1 = await createPeriod({
      period_name: `TEST-P1-${iteration}-${Date.now()}`,
      company: COMPANY,
      start_date: formatDate(startDate1),
      end_date: formatDate(endDate1),
      period_type: 'Monthly',
      status: 'Open',
    });
    
    period1Name = period1.name;
    
    // Try to create overlapping period
    const startDate2 = new Date(year, month - 1, 15); // Overlaps with period1
    const endDate2 = new Date(year, month, 15);
    
    try {
      await createPeriod({
        period_name: `TEST-P2-${iteration}-${Date.now()}`,
        company: COMPANY,
        start_date: formatDate(startDate2),
        end_date: formatDate(endDate2),
        period_type: 'Monthly',
        status: 'Open',
      });
      
      // Should not reach here
      return false;
    } catch (error: any) {
      // Should reject with error about overlap
      return error.message.toLowerCase().includes('overlap') || 
             error.message.toLowerCase().includes('exists');
    }
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  } finally {
    if (period1Name) {
      try {
        await deletePeriod(period1Name);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Property 4: Initial Status Invariant
async function testInitialStatusInvariant(iteration: number): Promise<boolean> {
  let periodName: string | null = null;
  
  try {
    const year = 2025 + Math.floor(iteration / 12);
    const month = (iteration % 12) + 1;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const period = await createPeriod({
      period_name: `TEST-STATUS-${iteration}-${Date.now()}`,
      company: COMPANY,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      period_type: 'Monthly',
      status: 'Open',
    });
    
    periodName = period.name;
    
    // Verify status is "Open"
    return period.status === 'Open';
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  } finally {
    if (periodName) {
      try {
        await deletePeriod(periodName);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Main test runner
async function runPropertyTests() {
  console.log('='.repeat(60));
  console.log('🧪 Property Tests: Period Creation');
  console.log('   Feature: accounting-period-closing, Task 3.3');
  console.log('   Validates: Requirements 1.2, 1.3, 1.5');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API URL: ${ERPNEXT_API_URL}`);
  console.log(`   Company: ${COMPANY}\n`);

  const iterations = 20;
  let totalPassed = 0;
  let totalFailed = 0;

  // Test Property 1: Date Range Validation
  console.log('📋 Property 1: Date Range Validation');
  let prop1Passed = 0;
  for (let i = 1; i <= iterations; i++) {
    if (await testDateRangeValidation(i)) {
      prop1Passed++;
    }
  }
  console.log(`   Result: ${prop1Passed}/${iterations} passed\n`);
  totalPassed += prop1Passed;
  totalFailed += (iterations - prop1Passed);

  // Test Property 2: Period Overlap Detection
  console.log('📋 Property 2: Period Overlap Detection');
  let prop2Passed = 0;
  for (let i = 1; i <= iterations; i++) {
    if (await testOverlapDetection(i)) {
      prop2Passed++;
    }
  }
  console.log(`   Result: ${prop2Passed}/${iterations} passed\n`);
  totalPassed += prop2Passed;
  totalFailed += (iterations - prop2Passed);

  // Test Property 4: Initial Status Invariant
  console.log('📋 Property 4: Initial Status Invariant');
  let prop4Passed = 0;
  for (let i = 1; i <= iterations; i++) {
    if (await testInitialStatusInvariant(i)) {
      prop4Passed++;
    }
  }
  console.log(`   Result: ${prop4Passed}/${iterations} passed\n`);
  totalPassed += prop4Passed;
  totalFailed += (iterations - prop4Passed);

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total tests: ${iterations * 3}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All Property Tests PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Some Property Tests FAILED');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runPropertyTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
