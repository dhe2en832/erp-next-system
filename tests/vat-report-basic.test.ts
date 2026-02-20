/**
 * Basic Integration Test: VAT Report API
 * 
 * This test verifies that the VAT Report API endpoint is accessible
 * and returns the expected data structure.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;
const ERP_COMPANY = process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY || 'BAC';

async function testVatReportEndpoint(): Promise<void> {
  console.log('\n🧪 Testing VAT Report API Endpoint\n');

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ERP_API_KEY && ERP_API_SECRET) {
      headers['Authorization'] = `token ${ERP_API_KEY}:${ERP_API_SECRET}`;
    }

    // Test 1: Basic endpoint access
    console.log('Test 1: Accessing VAT Report endpoint...');
    const today = new Date().toISOString().split('T')[0];
    const url = `${API_BASE_URL}/api/finance/reports/vat-report?company=${ERP_COMPANY}&from_date=${today}&to_date=${today}`;
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch VAT report: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✓ VAT Report endpoint accessible');

    // Test 2: Verify response structure
    console.log('\nTest 2: Verifying response structure...');
    
    if (!result.success) {
      throw new Error('Response success flag is false');
    }
    console.log('✓ Response has success flag');

    if (!result.data) {
      throw new Error('Response missing data field');
    }
    console.log('✓ Response has data field');

    const data = result.data;

    // Check PPN Output structure
    if (!data.ppn_output || !Array.isArray(data.ppn_output.invoices)) {
      throw new Error('Invalid ppn_output structure');
    }
    console.log('✓ PPN Output structure valid');

    // Check PPN Input structure
    if (!data.ppn_input || !Array.isArray(data.ppn_input.invoices)) {
      throw new Error('Invalid ppn_input structure');
    }
    console.log('✓ PPN Input structure valid');

    // Check Summary structure
    if (!data.summary || typeof data.summary.total_ppn_output !== 'number') {
      throw new Error('Invalid summary structure');
    }
    console.log('✓ Summary structure valid');

    // Check Period structure
    if (!data.period) {
      throw new Error('Invalid period structure');
    }
    console.log('✓ Period structure valid');

    // Test 3: Verify calculation logic
    console.log('\nTest 3: Verifying calculation logic...');
    const expectedNetPayable = data.summary.total_ppn_output - data.summary.total_ppn_input;
    const actualNetPayable = data.summary.ppn_kurang_lebih_bayar;
    
    if (Math.abs(expectedNetPayable - actualNetPayable) > 0.01) {
      throw new Error(
        `Calculation mismatch: Expected ${expectedNetPayable}, Got ${actualNetPayable}`
      );
    }
    console.log('✓ Calculation logic correct (Output - Input = Net Payable)');

    // Test 4: Test export endpoint
    console.log('\nTest 4: Testing export endpoint...');
    const exportUrl = `${API_BASE_URL}/api/finance/reports/vat-report/export?company=${ERP_COMPANY}&from_date=${today}&to_date=${today}`;
    const exportResponse = await fetch(exportUrl, { headers });

    if (!exportResponse.ok) {
      const error = await exportResponse.text();
      throw new Error(`Failed to export VAT report: ${error}`);
    }

    const contentType = exportResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('spreadsheet')) {
      throw new Error(`Invalid content type for export: ${contentType}`);
    }
    console.log('✓ Export endpoint accessible and returns Excel file');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All VAT Report API tests passed!');
    console.log('='.repeat(60) + '\n');

    console.log('Report Summary:');
    console.log(`  Total PPN Output: ${data.summary.formatted.total_ppn_output}`);
    console.log(`  Total PPN Input: ${data.summary.formatted.total_ppn_input}`);
    console.log(`  PPN Kurang/Lebih Bayar: ${data.summary.formatted.ppn_kurang_lebih_bayar}`);
    console.log(`  PPN Output Invoices: ${data.ppn_output.invoices.length}`);
    console.log(`  PPN Input Invoices: ${data.ppn_input.invoices.length}`);
    console.log();

  } catch (error) {
    console.error('\n❌ VAT Report API test failed:', error);
    throw error;
  }
}

// Run the test
testVatReportEndpoint()
  .then(() => {
    console.log('✅ VAT Report basic test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ VAT Report basic test failed:', error);
    process.exit(1);
  });
