/**
 * Property Test: Period Creation Round-Trip
 * Feature: accounting-period-closing, Property 3: Period Creation Round-Trip
 * Task 2.2: Buat property test untuk data model consistency
 * 
 * **Validates: Requirements 1.4**
 * 
 * Property 3: Period Creation Round-Trip
 * - For any valid period creation request, creating a period and then retrieving it
 *   should return a period object containing all specified attributes
 *   (period_name, company, start_date, end_date, period_type, status)
 * - Run dengan minimum 100 iterations
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables - try .env.local first, then .env
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local file found');
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'Berkat Abadi Cirebon';

interface CreatePeriodRequest {
  period_name: string;
  company: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
  fiscal_year?: string;
  remarks?: string;
}

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
  permanently_closed_by?: string;
  permanently_closed_on?: string;
  fiscal_year?: string;
  remarks?: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
}

// Helper: Check if Accounting Period DocType exists
async function checkDocTypeExists(): Promise<boolean> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Accounting Period`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper: Generate random period creation request
function generateRandomPeriodRequest(iteration: number): CreatePeriodRequest {
  const periodTypes: ('Monthly' | 'Quarterly' | 'Yearly')[] = ['Monthly', 'Quarterly', 'Yearly'];
  const periodType = periodTypes[Math.floor(Math.random() * periodTypes.length)];
  
  // Generate random dates within 2024-2025
  const year = 2024 + Math.floor(Math.random() * 2);
  const month = Math.floor(Math.random() * 12) + 1;
  const startDate = new Date(year, month - 1, 1);
  
  // Calculate end date based on period type
  let endDate: Date;
  switch (periodType) {
    case 'Monthly':
      endDate = new Date(year, month, 0); // Last day of month
      break;
    case 'Quarterly':
      endDate = new Date(year, month + 2, 0); // Last day of 3rd month
      break;
    case 'Yearly':
      endDate = new Date(year, 11, 31); // Last day of year
      break;
  }
  
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const remarks = Math.random() > 0.5 ? `Test period ${iteration} - ${periodType}` : undefined;
  
  return {
    period_name: `Test Period ${iteration} - ${periodType} ${year}-${month}`,
    company: COMPANY,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    period_type: periodType,
    status: 'Open',
    remarks
  };
}

// Helper: Create accounting period via API
async function createAccountingPeriod(data: CreatePeriodRequest): Promise<AccountingPeriod> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Accounting Period`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create period: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Retrieve accounting period via API
async function getAccountingPeriod(name: string): Promise<AccountingPeriod> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Accounting Period/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to retrieve period: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Delete accounting period via API
async function deleteAccountingPeriod(name: string): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Accounting Period/${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Failed to delete period: ${text}`);
  }
}

// Property Test: Period Creation Round-Trip
async function testPeriodCreationRoundTrip(iteration: number): Promise<boolean> {
  let periodName: string | null = null;
  
  try {
    // Step 1: Generate random period creation request
    const originalRequest = generateRandomPeriodRequest(iteration);
    
    // Step 2: Create period via API
    const created = await createAccountingPeriod(originalRequest);
    periodName = created.name;
    
    // Step 3: Retrieve period from database
    const retrieved = await getAccountingPeriod(periodName);
    
    // Step 4: Verify all specified attributes match
    const periodNameMatch = retrieved.period_name === originalRequest.period_name;
    const companyMatch = retrieved.company === originalRequest.company;
    const startDateMatch = retrieved.start_date === originalRequest.start_date;
    const endDateMatch = retrieved.end_date === originalRequest.end_date;
    const periodTypeMatch = retrieved.period_type === originalRequest.period_type;
    const statusMatch = retrieved.status === 'Open'; // Should be 'Open' by default (Requirement 1.5)
    
    // Verify remarks if provided
    const remarksMatch = originalRequest.remarks 
      ? retrieved.remarks === originalRequest.remarks 
      : true;
    
    const allMatch = periodNameMatch && companyMatch && startDateMatch && 
                     endDateMatch && periodTypeMatch && statusMatch && remarksMatch;
    
    if (!allMatch) {
      console.error(`❌ Iteration ${iteration} FAILED:`);
      console.error(`   Period name match: ${periodNameMatch}`);
      console.error(`   Company match: ${companyMatch}`);
      console.error(`   Start date match: ${startDateMatch} (${retrieved.start_date} vs ${originalRequest.start_date})`);
      console.error(`   End date match: ${endDateMatch} (${retrieved.end_date} vs ${originalRequest.end_date})`);
      console.error(`   Period type match: ${periodTypeMatch} (${retrieved.period_type} vs ${originalRequest.period_type})`);
      console.error(`   Status match: ${statusMatch} (${retrieved.status} should be 'Open')`);
      if (originalRequest.remarks) {
        console.error(`   Remarks match: ${remarksMatch} (${retrieved.remarks} vs ${originalRequest.remarks})`);
      }
    }
    
    return allMatch;
    
  } catch (error: any) {
    console.error(`❌ Iteration ${iteration} ERROR: ${error.message}`);
    return false;
  } finally {
    // Cleanup: Delete test period
    if (periodName) {
      try {
        await deleteAccountingPeriod(periodName);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Main test runner
async function runPropertyTest() {
  console.log('='.repeat(60));
  console.log('🧪 Property Test: Period Creation Round-Trip');
  console.log('   Feature: accounting-period-closing, Property 3');
  console.log('   Task 2.2: Data model consistency test');
  console.log('   Validates: Requirements 1.4');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API URL: ${ERPNEXT_API_URL}`);
  console.log(`   Company: ${COMPANY}`);
  
  // Check if Accounting Period DocType exists
  console.log(`\n🔍 Checking if Accounting Period DocType exists...`);
  const docTypeExists = await checkDocTypeExists();
  
  if (!docTypeExists) {
    console.error('\n❌ Error: Accounting Period DocType not found');
    console.error('   Please ensure the DocType has been created in ERPNext');
    console.error('   Run: cd erpnext-dev && bench --site batasku.local migrate');
    process.exit(1);
  }
  
  console.log(`✅ Accounting Period DocType found`);
  console.log(`   Running 100 iterations...\n`);

  const iterations = 100;
  let passed = 0;
  let failed = 0;

  for (let i = 1; i <= iterations; i++) {
    const result = await testPeriodCreationRoundTrip(i);
    
    if (result) {
      passed++;
      if (i % 10 === 0) {
        console.log(`✅ Iteration ${i}/${iterations} - ${passed} passed, ${failed} failed`);
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`Total iterations: ${iterations}`);
  console.log(`Passed: ${passed} (${(passed/iterations*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${(failed/iterations*100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log('\n✅ Property Test PASSED');
    console.log('   All period attributes persisted correctly');
    console.log('   Data model consistency verified');
    process.exit(0);
  } else {
    console.log('\n❌ Property Test FAILED');
    console.log(`   ${failed} iterations failed`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runPropertyTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testPeriodCreationRoundTrip, generateRandomPeriodRequest };
