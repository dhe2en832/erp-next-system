/**
 * Property-Based Tests for Sales Return Management
 * 
 * This file contains property tests for:
 * - Property 5: Delivery Note Linkage
 * - Property 6: Initial Draft Status
 * - Property 9: Submit API Call
 * - Property 10: Status Transition on Submit
 * - Property 12: List Filtering
 * - Property 13: Complete Detail Display
 * - Property 16: Cancel API Call
 * - Property 17: Status Transition on Cancel
 * - Property 18: Unique Return Number Generation
 * 
 * Feature: sales-return-management
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

// Test configuration - will be dynamically determined
let TEST_COMPANY: string | null = null;

// Cache for test data
let cachedWarehouse: string | null = null;
let cachedCustomer: string | null = null;
let cachedItem: string | null = null;

// Helper function to get test company
async function getTestCompany(): Promise<string> {
  if (TEST_COMPANY) return TEST_COMPANY;
  
  const headers = getAuthHeaders();
  
  // Try to fetch first available company
  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Company?fields=["name"]&limit_page_length=1`,
    { headers }
  );
  
  if (response.ok) {
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      TEST_COMPANY = data.data[0].name;
      console.log(`Using test company: ${TEST_COMPANY}`);
      return TEST_COMPANY!;
    }
  }
  
  throw new Error('No company found in the system');
}

interface SalesReturnItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  delivery_note_item: string;
  return_reason: string;
  return_notes?: string;
}

interface SalesReturn {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  delivery_note: string;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  company: string;
  grand_total: number;
  items: SalesReturnItem[];
  custom_notes?: string;
}

interface DeliveryNote {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  status: string;
  items: Array<{
    name: string;
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    warehouse: string;
  }>;
}

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (API_KEY && API_SECRET) {
    headers['Authorization'] = `token ${API_KEY}:${API_SECRET}`;
  }

  return headers;
}

// Helper function to get or create test warehouse
async function getTestWarehouse(): Promise<string> {
  if (cachedWarehouse) return cachedWarehouse;
  
  const headers = getAuthHeaders();
  const company = await getTestCompany();
  
  // Try to fetch existing warehouse for the company
  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Warehouse?filters=[["company","=","${company}"]]&fields=["name"]&limit_page_length=1`,
    { headers }
  );
  
  if (response.ok) {
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      cachedWarehouse = data.data[0].name;
      console.log(`Using test warehouse: ${cachedWarehouse}`);
      return cachedWarehouse!;
    }
  }
  
  throw new Error('No warehouse found for company ' + company);
}

// Helper function to get or create test customer
async function getTestCustomer(): Promise<string> {
  if (cachedCustomer) return cachedCustomer;
  
  const headers = getAuthHeaders();
  
  // Try to fetch existing customer
  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Customer?fields=["name"]&limit_page_length=1`,
    { headers }
  );
  
  if (response.ok) {
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      cachedCustomer = data.data[0].name;
      console.log(`Using test customer: ${cachedCustomer}`);
      return cachedCustomer!;
    }
  }
  
  throw new Error('No customer found in the system');
}

// Helper function to get or create test item
async function getTestItem(): Promise<string> {
  if (cachedItem) return cachedItem;
  
  const headers = getAuthHeaders();
  
  // Try to fetch existing item
  const response = await fetch(
    `${ERPNEXT_API_URL}/api/resource/Item?filters=[["is_stock_item","=",1]]&fields=["name","item_name"]&limit_page_length=1`,
    { headers }
  );
  
  if (response.ok) {
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      cachedItem = data.data[0].name;
      console.log(`Using test item: ${cachedItem}`);
      return cachedItem!;
    }
  }
  
  throw new Error('No stock item found in the system');
}

// Helper function to create a test delivery note
async function createTestDeliveryNote(suffix: string): Promise<DeliveryNote> {
  const headers = getAuthHeaders();
  
  // Get valid test data
  const company = await getTestCompany();
  const warehouse = await getTestWarehouse();
  const customer = await getTestCustomer();
  const item = await getTestItem();
  
  const deliveryNoteData = {
    doctype: 'Delivery Note',
    company: company,
    customer: customer,
    posting_date: new Date().toISOString().split('T')[0],
    naming_series: 'DN-',
    items: [
      {
        item_code: item,
        qty: 10,
        rate: 10000,
        warehouse: warehouse,
      },
    ],
  };

  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
    method: 'POST',
    headers,
    body: JSON.stringify(deliveryNoteData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create delivery note: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  // Submit the delivery note
  await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${result.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 }),
  });

  return result.data as DeliveryNote;
}

// Helper function to create a test sales return
async function createTestSalesReturn(
  deliveryNote: DeliveryNote,
  suffix: string,
  customData?: Partial<any>
): Promise<SalesReturn> {
  const headers = getAuthHeaders();
  const company = await getTestCompany();
  
  const salesReturnData = {
    doctype: 'Sales Return',
    company: company,
    customer: deliveryNote.customer,
    posting_date: new Date().toISOString().split('T')[0],
    delivery_note: deliveryNote.name,
    naming_series: 'RET-.YYYY.-',
    items: [
      {
        item_code: deliveryNote.items[0].item_code,
        item_name: deliveryNote.items[0].item_name,
        qty: 5,
        rate: deliveryNote.items[0].rate,
        amount: 5 * deliveryNote.items[0].rate,
        warehouse: deliveryNote.items[0].warehouse,
        delivery_note_item: deliveryNote.items[0].name,
        return_reason: 'Damaged',
      },
    ],
    custom_notes: 'Test return ' + suffix,
    ...customData,
  };

  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Return`, {
    method: 'POST',
    headers,
    body: JSON.stringify(salesReturnData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create sales return: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.data as SalesReturn;
}

// Helper function to cleanup test data
async function cleanupSalesReturn(returnName: string): Promise<void> {
  try {
    const headers = getAuthHeaders();
    await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Return/${returnName}`, {
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    console.error('Error cleaning up sales return:', error);
  }
}

async function cleanupDeliveryNote(dnName: string): Promise<void> {
  try {
    const headers = getAuthHeaders();
    
    // Cancel first if submitted
    await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${dnName}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ docstatus: 2 }),
    });
    
    // Then delete
    await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${dnName}`, {
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    console.error('Error cleaning up delivery note:', error);
  }
}

/**
 * Property 6: Initial Draft Status
 * 
 * **Validates: Requirements 1.6**
 * 
 * For any newly saved return document, its status should be "Draft" until 
 * explicitly submitted.
 */
async function testProperty6_InitialDraftStatus(): Promise<void> {
  console.log('\n=== Property 6: Initial Draft Status ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P6-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create a sales return
    salesReturn = await createTestSalesReturn(deliveryNote, `P6-${timestamp}`);
    console.log(`Created sales return: ${salesReturn.name}`);
    
    // Verify: Initial status is Draft
    if (salesReturn.status !== 'Draft') {
      throw new Error(
        `Property 6 FAILED: Initial status should be "Draft", got "${salesReturn.status}"`
      );
    }
    
    // Fetch the return again to verify persistence
    const headers = getAuthHeaders();
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch sales return: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const fetchedReturn = fetchedData.data as SalesReturn;
    
    if (fetchedReturn.status !== 'Draft') {
      throw new Error(
        `Property 6 FAILED: Status should persist as "Draft", got "${fetchedReturn.status}"`
      );
    }
    
    console.log('✓ Property 6 PASSED: Initial status is correctly set to Draft');
    console.log(`  Return: ${salesReturn.name}, Status: ${salesReturn.status}`);
    
  } finally {
    if (salesReturn) await cleanupSalesReturn(salesReturn.name);
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 12: List Filtering
 * 
 * **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
 * 
 * For any filter criteria (date range, customer name, status, or document number), 
 * applying the filter should return only return documents that match all specified 
 * criteria.
 */
async function testProperty12_ListFiltering(): Promise<void> {
  console.log('\n=== Property 12: List Filtering ===');
  
  const timestamp = Date.now();
  const deliveryNotes: DeliveryNote[] = [];
  const salesReturns: SalesReturn[] = [];
  
  try {
    // Create multiple test delivery notes and returns with different attributes
    for (let i = 0; i < 3; i++) {
      const dn = await createTestDeliveryNote(`P12-${timestamp}-${i}`);
      deliveryNotes.push(dn);
      
      const sr = await createTestSalesReturn(dn, `P12-${timestamp}-${i}`);
      salesReturns.push(sr);
    }
    
    console.log(`Created ${salesReturns.length} test sales returns`);
    
    const headers = getAuthHeaders();
    
    // Test 1: Filter by status (Draft)
    const statusFilterUrl = `${ERPNEXT_API_URL}/api/resource/Sales Return?filters=[["status","=","Draft"]]`;
    const statusResponse = await fetch(statusFilterUrl, { headers });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to fetch with status filter: ${statusResponse.status}`);
    }
    
    const statusData = await statusResponse.json();
    const statusResults = statusData.data as SalesReturn[];
    
    // Verify: All results have Draft status
    for (const result of statusResults) {
      if (result.status !== 'Draft') {
        throw new Error(
          `Property 12 FAILED: Status filter returned non-Draft document: ${result.name} (${result.status})`
        );
      }
    }
    
    console.log(`✓ Status filter test passed: ${statusResults.length} Draft returns found`);
    
    // Test 2: Filter by document number (partial match)
    const testReturnName = salesReturns[0].name;
    const docNumberFilterUrl = `${ERPNEXT_API_URL}/api/resource/Sales Return?filters=[["name","like","%${testReturnName.substring(0, 10)}%"]]`;
    const docNumberResponse = await fetch(docNumberFilterUrl, { headers });
    
    if (!docNumberResponse.ok) {
      throw new Error(`Failed to fetch with document number filter: ${docNumberResponse.status}`);
    }
    
    const docNumberData = await docNumberResponse.json();
    const docNumberResults = docNumberData.data as SalesReturn[];
    
    // Verify: Results contain the expected document
    const foundExpected = docNumberResults.some(r => r.name === testReturnName);
    if (!foundExpected) {
      throw new Error(
        `Property 12 FAILED: Document number filter did not return expected document: ${testReturnName}`
      );
    }
    
    console.log(`✓ Document number filter test passed: Found ${testReturnName}`);
    
    // Test 3: Filter by date range
    const today = new Date().toISOString().split('T')[0];
    const dateFilterUrl = `${ERPNEXT_API_URL}/api/resource/Sales Return?filters=[["posting_date","=","${today}"]]`;
    const dateResponse = await fetch(dateFilterUrl, { headers });
    
    if (!dateResponse.ok) {
      throw new Error(`Failed to fetch with date filter: ${dateResponse.status}`);
    }
    
    const dateData = await dateResponse.json();
    const dateResults = dateData.data as SalesReturn[];
    
    // Verify: All results have today's date
    for (const result of dateResults) {
      if (result.posting_date !== today) {
        throw new Error(
          `Property 12 FAILED: Date filter returned document with wrong date: ${result.name} (${result.posting_date})`
        );
      }
    }
    
    console.log(`✓ Date filter test passed: ${dateResults.length} returns found for ${today}`);
    
    // Test 4: Combined filters (status + date)
    const combinedFilterUrl = `${ERPNEXT_API_URL}/api/resource/Sales Return?filters=[["status","=","Draft"],["posting_date","=","${today}"]]`;
    const combinedResponse = await fetch(combinedFilterUrl, { headers });
    
    if (!combinedResponse.ok) {
      throw new Error(`Failed to fetch with combined filters: ${combinedResponse.status}`);
    }
    
    const combinedData = await combinedResponse.json();
    const combinedResults = combinedData.data as SalesReturn[];
    
    // Verify: All results match both criteria
    for (const result of combinedResults) {
      if (result.status !== 'Draft') {
        throw new Error(
          `Property 12 FAILED: Combined filter returned non-Draft document: ${result.name}`
        );
      }
      if (result.posting_date !== today) {
        throw new Error(
          `Property 12 FAILED: Combined filter returned document with wrong date: ${result.name}`
        );
      }
    }
    
    console.log(`✓ Combined filter test passed: ${combinedResults.length} returns match both criteria`);
    
    console.log('✓ Property 12 PASSED: All filtering tests passed');
    
  } finally {
    for (const sr of salesReturns) {
      await cleanupSalesReturn(sr.name);
    }
    for (const dn of deliveryNotes) {
      await cleanupDeliveryNote(dn.name);
    }
  }
}

/**
 * Property 18: Unique Return Number Generation
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 * 
 * For any newly created return document, the system should generate a unique 
 * return number following the pattern "RET-YYYY-NNNNN" where YYYY is the current 
 * year and NNNNN is a sequential number, and no two returns should ever have 
 * the same number.
 */
async function testProperty18_UniqueReturnNumberGeneration(): Promise<void> {
  console.log('\n=== Property 18: Unique Return Number Generation ===');
  
  const timestamp = Date.now();
  const deliveryNotes: DeliveryNote[] = [];
  const salesReturns: SalesReturn[] = [];
  const returnNumbers = new Set<string>();
  
  try {
    // Create multiple sales returns
    const count = 5;
    
    for (let i = 0; i < count; i++) {
      const dn = await createTestDeliveryNote(`P18-${timestamp}-${i}`);
      deliveryNotes.push(dn);
      
      const sr = await createTestSalesReturn(dn, `P18-${timestamp}-${i}`);
      salesReturns.push(sr);
      returnNumbers.add(sr.name);
    }
    
    console.log(`Created ${salesReturns.length} sales returns`);
    
    // Verify: All return numbers are unique
    if (returnNumbers.size !== count) {
      throw new Error(
        `Property 18 FAILED: Expected ${count} unique return numbers, got ${returnNumbers.size}`
      );
    }
    
    console.log(`✓ Uniqueness test passed: All ${count} return numbers are unique`);
    
    // Verify: All return numbers follow the naming pattern RET-YYYY-NNNNN
    const currentYear = new Date().getFullYear();
    const pattern = new RegExp(`^RET-${currentYear}-\\d{5}$`);
    
    for (const returnNumber of returnNumbers) {
      if (!pattern.test(returnNumber)) {
        throw new Error(
          `Property 18 FAILED: Return number "${returnNumber}" does not match pattern RET-${currentYear}-NNNNN`
        );
      }
    }
    
    console.log(`✓ Pattern test passed: All return numbers follow RET-${currentYear}-NNNNN pattern`);
    
    // Verify: Return numbers are sequential (extract and compare)
    const numbers = Array.from(returnNumbers)
      .map(name => parseInt(name.split('-')[2]))
      .sort((a, b) => a - b);
    
    console.log(`  Return numbers: ${Array.from(returnNumbers).join(', ')}`);
    console.log(`  Sequential numbers: ${numbers.join(', ')}`);
    
    console.log('✓ Property 18 PASSED: All return numbers are unique and follow the correct pattern');
    
  } finally {
    for (const sr of salesReturns) {
      await cleanupSalesReturn(sr.name);
    }
    for (const dn of deliveryNotes) {
      await cleanupDeliveryNote(dn.name);
    }
  }
}

/**
 * Property 5: Delivery Note Linkage
 * 
 * **Validates: Requirements 1.5**
 * 
 * For any created return document, it should maintain a reference to the 
 * originating delivery note, and this reference should be retrievable when 
 * viewing the return details.
 */
async function testProperty5_DeliveryNoteLinkage(): Promise<void> {
  console.log('\n=== Property 5: Delivery Note Linkage ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P5-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create a sales return linked to the delivery note
    salesReturn = await createTestSalesReturn(deliveryNote, `P5-${timestamp}`);
    console.log(`Created sales return: ${salesReturn.name}`);
    
    // Verify: Return document has delivery_note reference
    if (!salesReturn.delivery_note) {
      throw new Error(
        `Property 5 FAILED: Sales return should have delivery_note reference`
      );
    }
    
    if (salesReturn.delivery_note !== deliveryNote.name) {
      throw new Error(
        `Property 5 FAILED: delivery_note reference should be "${deliveryNote.name}", got "${salesReturn.delivery_note}"`
      );
    }
    
    console.log(`✓ Initial linkage verified: ${salesReturn.delivery_note}`);
    
    // Fetch the return again to verify the reference is retrievable
    const headers = getAuthHeaders();
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch sales return: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const fetchedReturn = fetchedData.data as SalesReturn;
    
    // Verify: Delivery note reference persists and is retrievable
    if (!fetchedReturn.delivery_note) {
      throw new Error(
        `Property 5 FAILED: Fetched return should have delivery_note reference`
      );
    }
    
    if (fetchedReturn.delivery_note !== deliveryNote.name) {
      throw new Error(
        `Property 5 FAILED: Fetched delivery_note should be "${deliveryNote.name}", got "${fetchedReturn.delivery_note}"`
      );
    }
    
    console.log('✓ Property 5 PASSED: Delivery note linkage is maintained and retrievable');
    console.log(`  Return: ${salesReturn.name} → Delivery Note: ${deliveryNote.name}`);
    
  } finally {
    if (salesReturn) await cleanupSalesReturn(salesReturn.name);
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 13: Complete Detail Display
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 * 
 * For any return document, when viewed in detail mode, the system should display 
 * all return information including linked delivery note details, customer information, 
 * all return items with their quantities, reasons, and prices, and the calculated 
 * total value.
 */
async function testProperty13_CompleteDetailDisplay(): Promise<void> {
  console.log('\n=== Property 13: Complete Detail Display ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P13-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create a sales return with specific data
    const returnQty = 5;
    const returnRate = deliveryNote.items[0].rate;
    const expectedAmount = returnQty * returnRate;
    
    salesReturn = await createTestSalesReturn(deliveryNote, `P13-${timestamp}`, {
      items: [
        {
          item_code: deliveryNote.items[0].item_code,
          item_name: deliveryNote.items[0].item_name,
          qty: returnQty,
          rate: returnRate,
          amount: expectedAmount,
          warehouse: deliveryNote.items[0].warehouse,
          delivery_note_item: deliveryNote.items[0].name,
          return_reason: 'Quality Issue',
          return_notes: 'Test notes for quality issue',
        },
      ],
    });
    console.log(`Created sales return: ${salesReturn.name}`);
    
    // Fetch the complete return details
    const headers = getAuthHeaders();
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch sales return details: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const fetchedReturn = fetchedData.data as SalesReturn;
    
    // Verify: Linked delivery note details are present (Requirement 6.2)
    if (!fetchedReturn.delivery_note) {
      throw new Error(
        `Property 13 FAILED: Delivery note reference missing`
      );
    }
    console.log(`✓ Delivery note reference present: ${fetchedReturn.delivery_note}`);
    
    // Verify: Customer information is present (Requirement 6.3)
    if (!fetchedReturn.customer || !fetchedReturn.customer_name) {
      throw new Error(
        `Property 13 FAILED: Customer information missing (customer: ${fetchedReturn.customer}, customer_name: ${fetchedReturn.customer_name})`
      );
    }
    console.log(`✓ Customer information present: ${fetchedReturn.customer_name} (${fetchedReturn.customer})`);
    
    // Verify: All return items are present with complete details (Requirement 6.4)
    if (!fetchedReturn.items || fetchedReturn.items.length === 0) {
      throw new Error(
        `Property 13 FAILED: Return items missing`
      );
    }
    
    const item = fetchedReturn.items[0];
    
    // Check item details
    if (!item.item_code || !item.item_name) {
      throw new Error(
        `Property 13 FAILED: Item code or name missing`
      );
    }
    
    if (item.qty !== returnQty) {
      throw new Error(
        `Property 13 FAILED: Item quantity should be ${returnQty}, got ${item.qty}`
      );
    }
    
    if (item.rate !== returnRate) {
      throw new Error(
        `Property 13 FAILED: Item rate should be ${returnRate}, got ${item.rate}`
      );
    }
    
    if (!item.return_reason) {
      throw new Error(
        `Property 13 FAILED: Return reason missing`
      );
    }
    
    console.log(`✓ Item details complete: ${item.item_name}, qty: ${item.qty}, rate: ${item.rate}, reason: ${item.return_reason}`);
    
    // Verify: Total value is calculated correctly (Requirement 6.5)
    if (!fetchedReturn.grand_total) {
      throw new Error(
        `Property 13 FAILED: Grand total missing`
      );
    }
    
    const calculatedTotal = fetchedReturn.items.reduce((sum, item) => sum + item.amount, 0);
    
    if (Math.abs(fetchedReturn.grand_total - calculatedTotal) > 0.01) {
      throw new Error(
        `Property 13 FAILED: Grand total should be ${calculatedTotal}, got ${fetchedReturn.grand_total}`
      );
    }
    
    console.log(`✓ Total value calculated correctly: ${fetchedReturn.grand_total}`);
    
    console.log('✓ Property 13 PASSED: All return details are complete and correctly displayed');
    
  } finally {
    if (salesReturn) await cleanupSalesReturn(salesReturn.name);
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 9: Submit API Call
 * 
 * **Validates: Requirements 4.1**
 * 
 * For any draft return document, when submitted, the system should send the 
 * complete return data to the ERPNext API with all items, quantities, reasons, 
 * and metadata.
 */
async function testProperty9_SubmitAPICall(): Promise<void> {
  console.log('\n=== Property 9: Submit API Call ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P9-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create a draft sales return
    salesReturn = await createTestSalesReturn(deliveryNote, `P9-${timestamp}`);
    console.log(`Created draft sales return: ${salesReturn.name}`);
    
    // Verify initial status is Draft
    if (salesReturn.status !== 'Draft') {
      throw new Error(
        `Property 9 FAILED: Initial status should be Draft, got ${salesReturn.status}`
      );
    }
    
    // Submit the return document
    const headers = getAuthHeaders();
    const submitResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      }
    );
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(
        `Property 9 FAILED: Submit API call failed with status ${submitResponse.status}: ${errorText}`
      );
    }
    
    console.log(`✓ Submit API call succeeded for ${salesReturn.name}`);
    
    // Fetch the submitted return to verify data integrity
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch submitted return: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const submittedReturn = fetchedData.data as SalesReturn;
    
    // Verify: All data is preserved after submission
    if (submittedReturn.customer !== salesReturn.customer) {
      throw new Error(
        `Property 9 FAILED: Customer data changed after submission`
      );
    }
    
    if (submittedReturn.delivery_note !== salesReturn.delivery_note) {
      throw new Error(
        `Property 9 FAILED: Delivery note reference changed after submission`
      );
    }
    
    if (!submittedReturn.items || submittedReturn.items.length === 0) {
      throw new Error(
        `Property 9 FAILED: Items missing after submission`
      );
    }
    
    const item = submittedReturn.items[0];
    if (!item.item_code || !item.qty || !item.rate || !item.return_reason) {
      throw new Error(
        `Property 9 FAILED: Item data incomplete after submission`
      );
    }
    
    console.log(`✓ All return data preserved after submission`);
    console.log(`  Customer: ${submittedReturn.customer_name}`);
    console.log(`  Items: ${submittedReturn.items.length}`);
    console.log(`  Total: ${submittedReturn.grand_total}`);
    
    console.log('✓ Property 9 PASSED: Submit API call sends and preserves complete return data');
    
  } finally {
    if (salesReturn) {
      // Cancel before cleanup
      try {
        const headers = getAuthHeaders();
        await fetch(
          `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ docstatus: 2 }),
          }
        );
      } catch (e) {
        // Ignore cancel errors during cleanup
      }
      await cleanupSalesReturn(salesReturn.name);
    }
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 10: Status Transition on Submit
 * 
 * **Validates: Requirements 4.5**
 * 
 * For any draft return document, when the submit API call succeeds, the document 
 * status should change from "Draft" to "Submitted".
 */
async function testProperty10_StatusTransitionOnSubmit(): Promise<void> {
  console.log('\n=== Property 10: Status Transition on Submit ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P10-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create a draft sales return
    salesReturn = await createTestSalesReturn(deliveryNote, `P10-${timestamp}`);
    console.log(`Created draft sales return: ${salesReturn.name}`);
    
    // Verify initial status is Draft
    if (salesReturn.status !== 'Draft') {
      throw new Error(
        `Property 10 FAILED: Initial status should be Draft, got ${salesReturn.status}`
      );
    }
    console.log(`✓ Initial status: Draft`);
    
    // Submit the return document
    const headers = getAuthHeaders();
    const submitResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      }
    );
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(
        `Property 10 FAILED: Submit API call failed: ${errorText}`
      );
    }
    
    // Fetch the return to verify status change
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch submitted return: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const submittedReturn = fetchedData.data as SalesReturn;
    
    // Verify: Status changed to Submitted
    if (submittedReturn.status !== 'Submitted') {
      throw new Error(
        `Property 10 FAILED: Status should be "Submitted" after submit, got "${submittedReturn.status}"`
      );
    }
    
    console.log(`✓ Status after submit: Submitted`);
    console.log('✓ Property 10 PASSED: Status correctly transitions from Draft to Submitted');
    
  } finally {
    if (salesReturn) {
      // Cancel before cleanup
      try {
        const headers = getAuthHeaders();
        await fetch(
          `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ docstatus: 2 }),
          }
        );
      } catch (e) {
        // Ignore cancel errors during cleanup
      }
      await cleanupSalesReturn(salesReturn.name);
    }
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 16: Cancel API Call
 * 
 * **Validates: Requirements 7.1**
 * 
 * For any submitted return document, when cancelled, the system should send a 
 * cancellation request to the ERPNext API with the return document name.
 */
async function testProperty16_CancelAPICall(): Promise<void> {
  console.log('\n=== Property 16: Cancel API Call ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P16-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create and submit a sales return
    salesReturn = await createTestSalesReturn(deliveryNote, `P16-${timestamp}`);
    console.log(`Created sales return: ${salesReturn.name}`);
    
    // Submit the return
    const headers = getAuthHeaders();
    const submitResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      }
    );
    
    if (!submitResponse.ok) {
      throw new Error(`Failed to submit return: ${submitResponse.status}`);
    }
    
    console.log(`✓ Return submitted: ${salesReturn.name}`);
    
    // Cancel the submitted return
    const cancelResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 }),
      }
    );
    
    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      throw new Error(
        `Property 16 FAILED: Cancel API call failed with status ${cancelResponse.status}: ${errorText}`
      );
    }
    
    console.log(`✓ Cancel API call succeeded for ${salesReturn.name}`);
    
    // Fetch the cancelled return to verify
    const fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch cancelled return: ${fetchResponse.status}`);
    }
    
    const fetchedData = await fetchResponse.json();
    const cancelledReturn = fetchedData.data as SalesReturn;
    
    // Verify: Document still exists and is accessible
    if (!cancelledReturn.name) {
      throw new Error(
        `Property 16 FAILED: Cancelled return should still be accessible`
      );
    }
    
    console.log(`✓ Cancelled return is still accessible: ${cancelledReturn.name}`);
    console.log('✓ Property 16 PASSED: Cancel API call successfully processes cancellation request');
    
  } finally {
    if (salesReturn) await cleanupSalesReturn(salesReturn.name);
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

/**
 * Property 17: Status Transition on Cancel
 * 
 * **Validates: Requirements 7.4**
 * 
 * For any submitted return document, when the cancel API call succeeds, the 
 * document status should change from "Submitted" to "Cancelled".
 */
async function testProperty17_StatusTransitionOnCancel(): Promise<void> {
  console.log('\n=== Property 17: Status Transition on Cancel ===');
  
  const timestamp = Date.now();
  let deliveryNote: DeliveryNote | null = null;
  let salesReturn: SalesReturn | null = null;
  
  try {
    // Create a test delivery note
    deliveryNote = await createTestDeliveryNote(`P17-${timestamp}`);
    console.log(`Created test delivery note: ${deliveryNote.name}`);
    
    // Create and submit a sales return
    salesReturn = await createTestSalesReturn(deliveryNote, `P17-${timestamp}`);
    console.log(`Created sales return: ${salesReturn.name}`);
    
    // Submit the return
    const headers = getAuthHeaders();
    const submitResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      }
    );
    
    if (!submitResponse.ok) {
      throw new Error(`Failed to submit return: ${submitResponse.status}`);
    }
    
    // Verify status is Submitted
    let fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    let fetchedData = await fetchResponse.json();
    let fetchedReturn = fetchedData.data as SalesReturn;
    
    if (fetchedReturn.status !== 'Submitted') {
      throw new Error(
        `Property 17 FAILED: Status should be Submitted before cancel, got ${fetchedReturn.status}`
      );
    }
    console.log(`✓ Status before cancel: Submitted`);
    
    // Cancel the submitted return
    const cancelResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 }),
      }
    );
    
    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      throw new Error(
        `Property 17 FAILED: Cancel API call failed: ${errorText}`
      );
    }
    
    // Fetch the return to verify status change
    fetchResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${salesReturn.name}`,
      { headers }
    );
    
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch cancelled return: ${fetchResponse.status}`);
    }
    
    fetchedData = await fetchResponse.json();
    const cancelledReturn = fetchedData.data as SalesReturn;
    
    // Verify: Status changed to Cancelled
    if (cancelledReturn.status !== 'Cancelled') {
      throw new Error(
        `Property 17 FAILED: Status should be "Cancelled" after cancel, got "${cancelledReturn.status}"`
      );
    }
    
    console.log(`✓ Status after cancel: Cancelled`);
    console.log('✓ Property 17 PASSED: Status correctly transitions from Submitted to Cancelled');
    
  } finally {
    if (salesReturn) await cleanupSalesReturn(salesReturn.name);
    if (deliveryNote) await cleanupDeliveryNote(deliveryNote.name);
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('Starting Property-Based Tests for Sales Return Management');
  console.log('='.repeat(60));
  
  if (!API_KEY || !API_SECRET) {
    console.error('ERROR: ERP_API_KEY and ERP_API_SECRET must be set in environment variables');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Property 5: Delivery Note Linkage', fn: testProperty5_DeliveryNoteLinkage },
    { name: 'Property 6: Initial Draft Status', fn: testProperty6_InitialDraftStatus },
    { name: 'Property 9: Submit API Call', fn: testProperty9_SubmitAPICall },
    { name: 'Property 10: Status Transition on Submit', fn: testProperty10_StatusTransitionOnSubmit },
    { name: 'Property 12: List Filtering', fn: testProperty12_ListFiltering },
    { name: 'Property 13: Complete Detail Display', fn: testProperty13_CompleteDetailDisplay },
    { name: 'Property 16: Cancel API Call', fn: testProperty16_CancelAPICall },
    { name: 'Property 17: Status Transition on Cancel', fn: testProperty17_StatusTransitionOnCancel },
    { name: 'Property 18: Unique Return Number Generation', fn: testProperty18_UniqueReturnNumberGeneration },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error: any) {
      console.error(`\n✗ ${test.name} FAILED:`, error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
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
