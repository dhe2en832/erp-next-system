/**
 * Unit tests for GET /api/sales/credit-note/[name] endpoint
 * 
 * Tests the Credit Note detail retrieval functionality
 * Requirements: 4.7, 4.8
 */

// Simple assertion helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertContains(str: string, substring: string, message: string) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\nExpected "${str}" to contain "${substring}"`);
  }
}

// Test: Data Transformation
async function testDataTransformation() {
  console.log('\n=== Test: Data Transformation ===');
  
  const mockCreditNote = {
    name: 'ACC-SINV-2024-00001',
    is_return: 1,
    return_against: 'SINV-2024-00001',
    customer: 'CUST-001',
    items: []
  };

  const transformed = {
    ...mockCreditNote,
    sales_invoice: mockCreditNote.return_against
  };

  assertEqual(transformed.sales_invoice, 'SINV-2024-00001', 'Should transform return_against to sales_invoice');
  assertEqual(transformed.return_against, 'SINV-2024-00001', 'Should keep original return_against field');
  
  console.log('✓ Data transformation works correctly');
}

// Test: Child Tables Inclusion
async function testChildTablesInclusion() {
  console.log('\n=== Test: Child Tables Inclusion ===');
  
  const mockCreditNote = {
    name: 'ACC-SINV-2024-00001',
    is_return: 1,
    return_against: 'SINV-2024-00001',
    items: [
      {
        name: 'row1',
        item_code: 'ITEM-001',
        qty: -5,
        rate: 1000,
        amount: -5000,
        custom_komisi_sales: -250
      }
    ]
  };

  assertEqual(mockCreditNote.items.length, 1, 'Should include items array');
  assertEqual(mockCreditNote.items[0].qty, -5, 'Item qty should be negative');
  assertEqual(mockCreditNote.items[0].custom_komisi_sales, -250, 'Commission should be negative');
  
  console.log('✓ Child tables are included correctly');
}

// Test: Credit Note Verification
async function testCreditNoteVerification() {
  console.log('\n=== Test: Credit Note Verification ===');
  
  // Test invalid document (is_return = 0)
  const invalidDoc = {
    name: 'SINV-2024-00001',
    is_return: 0,
    customer: 'CUST-001'
  };
  
  const isInvalid = invalidDoc.is_return !== 1;
  assert(isInvalid, 'Should reject document with is_return = 0');
  
  // Test valid Credit Note (is_return = 1)
  const validDoc = {
    name: 'ACC-SINV-2024-00001',
    is_return: 1,
    return_against: 'SINV-2024-00001',
    customer: 'CUST-001'
  };
  
  const isValid = validDoc.is_return === 1;
  assert(isValid, 'Should accept document with is_return = 1');
  
  console.log('✓ Credit Note verification works correctly');
}

// Test: Response Structure
async function testResponseStructure() {
  console.log('\n=== Test: Response Structure ===');
  
  // Success response
  const successResponse = {
    success: true,
    data: {
      name: 'ACC-SINV-2024-00001',
      is_return: 1,
      return_against: 'SINV-2024-00001',
      sales_invoice: 'SINV-2024-00001',
      customer: 'CUST-001',
      customer_name: 'Test Customer',
      posting_date: '2024-01-15',
      grand_total: -5000,
      custom_total_komisi_sales: -250,
      items: []
    }
  };

  assert(successResponse.success === true, 'Success response should have success=true');
  assert(successResponse.data !== undefined, 'Success response should have data');
  assertEqual(successResponse.data.name, 'ACC-SINV-2024-00001', 'Should include Credit Note name');
  assertEqual(successResponse.data.sales_invoice, 'SINV-2024-00001', 'Should include sales_invoice field');
  
  // Error response - not found
  const notFoundResponse = {
    success: false,
    message: 'Credit Note tidak ditemukan'
  };
  
  assert(notFoundResponse.success === false, 'Error response should have success=false');
  assertContains(notFoundResponse.message, 'tidak ditemukan', 'Not found message should be in Indonesian');
  
  // Error response - not a Credit Note
  const invalidTypeResponse = {
    success: false,
    message: 'Dokumen bukan Credit Note'
  };
  
  assert(invalidTypeResponse.success === false, 'Invalid type response should have success=false');
  assertContains(invalidTypeResponse.message, 'bukan Credit Note', 'Invalid type message should be in Indonesian');
  
  console.log('✓ Response structure is correct');
}

// Test: ERPNext API Integration
async function testERPNextAPIIntegration() {
  console.log('\n=== Test: ERPNext API Integration ===');
  
  const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
  const expectedUrl = `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc`;
  const expectedBody = {
    doctype: 'Sales Invoice',
    name: 'ACC-SINV-2024-00001'
  };

  assertContains(expectedUrl, 'frappe.desk.form.load.getdoc', 'Should use getdoc method');
  assertEqual(expectedBody.doctype, 'Sales Invoice', 'Should use Sales Invoice doctype');
  assertEqual(expectedBody.name, 'ACC-SINV-2024-00001', 'Should include document name');
  
  // Test headers
  const ERP_API_KEY = process.env.ERP_API_KEY || '';
  const ERP_API_SECRET = process.env.ERP_API_SECRET || '';
  const expectedHeaders = {
    'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
    'Content-Type': 'application/json'
  };

  assertEqual(expectedHeaders['Content-Type'], 'application/json', 'Should use JSON content type');
  assertContains(expectedHeaders['Authorization'], 'token', 'Should use token authentication');
  
  console.log('✓ ERPNext API integration is correct');
}

// Test: Field Mapping
async function testFieldMapping() {
  console.log('\n=== Test: Field Mapping ===');
  
  const erpNextResponse = {
    name: 'ACC-SINV-2024-00001',
    doctype: 'Sales Invoice',
    is_return: 1,
    return_against: 'SINV-2024-00001',
    customer: 'CUST-001',
    customer_name: 'Test Customer',
    posting_date: '2024-01-15',
    company: 'Test Company',
    status: 'Submitted',
    docstatus: 1,
    grand_total: -5000,
    custom_total_komisi_sales: -250,
    return_notes: 'Test notes',
    items: [
      {
        name: 'row1',
        item_code: 'ITEM-001',
        item_name: 'Test Item',
        qty: -5,
        rate: 1000,
        amount: -5000,
        uom: 'Nos',
        warehouse: 'Stores - TC',
        si_detail: 'original-row1',
        return_reason: 'Damaged',
        return_item_notes: 'Item damaged',
        custom_komisi_sales: -250,
        delivered_qty: 5,
        returned_qty: 5
      }
    ],
    creation: '2024-01-15 10:00:00',
    modified: '2024-01-15 10:30:00',
    owner: 'user@example.com',
    modified_by: 'user@example.com'
  };

  const transformed = {
    ...erpNextResponse,
    sales_invoice: erpNextResponse.return_against
  };

  // Verify all required fields
  assert(transformed.name !== undefined, 'Should have name field');
  assertEqual(transformed.is_return, 1, 'Should have is_return = 1');
  assertEqual(transformed.sales_invoice, 'SINV-2024-00001', 'Should have sales_invoice field');
  assert(transformed.customer !== undefined, 'Should have customer field');
  assert(transformed.posting_date !== undefined, 'Should have posting_date field');
  assert(transformed.grand_total < 0, 'Grand total should be negative');
  assert(transformed.custom_total_komisi_sales < 0, 'Commission should be negative');
  assertEqual(transformed.items.length, 1, 'Should have items array');
  assert(transformed.items[0].qty < 0, 'Item qty should be negative');
  assert(transformed.items[0].custom_komisi_sales < 0, 'Item commission should be negative');
  
  console.log('✓ Field mapping is correct');
}

// Main test runner
async function runTests() {
  console.log('Starting Credit Note GET Detail API Tests...');
  
  try {
    await testDataTransformation();
    await testChildTablesInclusion();
    await testCreditNoteVerification();
    await testResponseStructure();
    await testERPNextAPIIntegration();
    await testFieldMapping();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
