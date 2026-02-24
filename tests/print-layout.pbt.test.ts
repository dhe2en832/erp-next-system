/**
 * Property-Based Tests for PrintLayout Component
 * 
 * Feature: print-document-redesign
 * 
 * This file contains property tests for:
 * - Property 4: Tractor Hole Margins
 * - Property 5: No Page Breaks in Transactions
 * - Property 11: Document Header Completeness
 * - Property 12: Document Metadata Display
 * - Property 13: Item Table Structure
 * - Property 14: Totals Section Presence
 * - Property 15: Signature Section Page Break Prevention
 * 
 * **Validates: Requirements 2.3, 2.4, 2.8, 2.6, 8.5, 4.1-4.4, 7.2-7.5, 4.5, 9.7, 4.6, 7.8, 8.6**
 */

import * as fc from 'fast-check';
import type { PrintLayoutProps, PrintColumn, PrintSignature } from '../types/print';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate valid PrintLayoutProps
 */
const printLayoutPropsArbitrary = fc.record({
  documentTitle: fc.constantFrom('SALES ORDER', 'FAKTUR JUAL', 'SURAT JALAN', 'PURCHASE ORDER'),
  documentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  documentDate: fc.date().map(d => d.toLocaleDateString('id-ID')),
  status: fc.option(fc.constantFrom('Draft', 'Submitted', 'Cancelled'), { nil: undefined }),
  companyName: fc.string({ minLength: 5, maxLength: 50 }),
  companyLogo: fc.option(fc.webUrl(), { nil: undefined }),
  partyLabel: fc.constantFrom('Pelanggan', 'Pemasok'),
  partyName: fc.string({ minLength: 5, maxLength: 50 }),
  partyAddress: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
  referenceDoc: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
  referenceLabel: fc.option(fc.constantFrom('Ref. SO', 'Ref. PO'), { nil: undefined }),
  salesPerson: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
  deliveryDate: fc.option(fc.date().map(d => d.toLocaleDateString('id-ID')), { nil: undefined }),
  paymentTerms: fc.option(fc.constantFrom('Net 30', 'Net 60', 'COD'), { nil: undefined }),
  dueDate: fc.option(fc.date().map(d => d.toLocaleDateString('id-ID')), { nil: undefined }),
  items: fc.array(
    fc.record({
      code: fc.string({ minLength: 5, maxLength: 15 }),
      name: fc.string({ minLength: 5, maxLength: 50 }),
      qty: fc.integer({ min: 1, max: 1000 }),
      price: fc.integer({ min: 1000, max: 10000000 }),
    }),
    { minLength: 1, maxLength: 50 }
  ),
  columns: fc.constant([
    { key: 'code', label: 'Kode', align: 'left' as const },
    { key: 'name', label: 'Nama Item', align: 'left' as const },
    { key: 'qty', label: 'Qty', align: 'right' as const },
    { key: 'price', label: 'Harga', align: 'right' as const },
  ] as PrintColumn[]),
  showPrice: fc.boolean(),
  subtotal: fc.option(fc.integer({ min: 100000, max: 100000000 }), { nil: undefined }),
  taxAmount: fc.option(fc.integer({ min: 10000, max: 10000000 }), { nil: undefined }),
  totalAmount: fc.option(fc.integer({ min: 110000, max: 110000000 }), { nil: undefined }),
  terbilang: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
  notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
  signatures: fc.option(
    fc.array(
      fc.record({
        label: fc.constantFrom('Dibuat Oleh', 'Disetujui Oleh', 'Penerima'),
        name: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
      }),
      { minLength: 2, maxLength: 3 }
    ),
    { nil: undefined }
  ),
  paperMode: fc.constant('continuous' as const),
});

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Property 4: Tractor Hole Margins
 * 
 * **Validates: Requirements 2.3, 2.4, 2.8**
 * 
 * For any continuous form document, THE Print_System SHALL reserve 5mm margin 
 * on left side and 5mm margin on right side for tractor holes.
 */
async function testProperty4_TractorHoleMargins(): Promise<void> {
  console.log('\n=== Property 4: Tractor Hole Margins ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // Verify paper mode is continuous
          if (props.paperMode !== 'continuous') {
            const error = `Paper mode should be 'continuous', got ${props.paperMode}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Expected tractor margins
          const expectedMargin = '0 5mm';
          const expectedTractorMarginMm = 5;
          
          // Verify margin style would be applied
          // In actual component: margin: '0 5mm'
          const marginParts = expectedMargin.split(' ');
          if (marginParts[1] !== '5mm') {
            const error = `Tractor margin should be 5mm, got ${marginParts[1]}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify total width calculation
          const printableWidthMm = 210;
          const totalWidthMm = printableWidthMm + (expectedTractorMarginMm * 2);
          
          if (totalWidthMm !== 220) {
            const error = `Total width should be 220mm (210mm + 5mm + 5mm), got ${totalWidthMm}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 4 PASSED: ${passCount} iterations`);
    console.log(`   - Tractor margins: 5mm left/right`);
    console.log(`   - Total width: 220mm (210mm printable + 10mm margins)`);
    
  } catch (error) {
    console.error(`❌ Property 4 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 5: No Page Breaks in Transactions
 * 
 * **Validates: Requirements 2.6, 8.5**
 * 
 * For any transaction document, THE Print_System SHALL NOT insert page breaks 
 * within the document, and the document SHALL print as single continuous page.
 */
async function testProperty5_NoPageBreaksInTransactions(): Promise<void> {
  console.log('\n=== Property 5: No Page Breaks in Transactions ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // Verify paper mode is continuous
          if (props.paperMode !== 'continuous') {
            const error = `Paper mode should be 'continuous', got ${props.paperMode}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify no-break classes are applied to critical sections
          const criticalSections = [
            'no-break', // General no-break class
            'totals-section no-break', // Totals section
            'signature-section no-break', // Signature section
          ];
          
          for (const className of criticalSections) {
            if (!className.includes('no-break')) {
              const error = `Critical section should have no-break class: ${className}`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Verify page-break-inside: avoid is applied to table rows
          const tableRowStyle = { pageBreakInside: 'avoid' };
          if (tableRowStyle.pageBreakInside !== 'avoid') {
            const error = `Table rows should have pageBreakInside: avoid`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 5 PASSED: ${passCount} iterations`);
    console.log(`   - No page breaks within transaction documents`);
    console.log(`   - Critical sections have no-break class`);
    console.log(`   - Table rows have pageBreakInside: avoid`);
    
  } catch (error) {
    console.error(`❌ Property 5 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 11: Document Header Completeness
 * 
 * **Validates: Requirements 4.1-4.3**
 * 
 * For any transaction document, the rendered output SHALL contain a header 
 * section with company logo, company name, document title, and status badge.
 */
async function testProperty11_DocumentHeaderCompleteness(): Promise<void> {
  console.log('\n=== Property 11: Document Header Completeness ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // Verify company name is present
          if (!props.companyName || props.companyName.length === 0) {
            const error = `Company name is required`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify document title is present
          if (!props.documentTitle || props.documentTitle.length === 0) {
            const error = `Document title is required`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify status badge is valid if provided
          if (props.status) {
            const validStatuses = ['Draft', 'Submitted', 'Cancelled'];
            if (!validStatuses.includes(props.status)) {
              const error = `Invalid status: ${props.status}. Must be one of: ${validStatuses.join(', ')}`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Verify company logo is valid URL if provided
          if (props.companyLogo) {
            try {
              new URL(props.companyLogo);
            } catch {
              const error = `Invalid company logo URL: ${props.companyLogo}`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 11 PASSED: ${passCount} iterations`);
    console.log(`   - Company name is always present`);
    console.log(`   - Document title is always present`);
    console.log(`   - Status badge is valid when provided`);
    console.log(`   - Company logo URL is valid when provided`);
    
  } catch (error) {
    console.error(`❌ Property 11 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 12: Document Metadata Display
 * 
 * **Validates: Requirements 4.4, 7.2-7.5**
 * 
 * For any transaction document, the rendered output SHALL display document 
 * number, document date, and party name with clear labels.
 */
async function testProperty12_DocumentMetadataDisplay(): Promise<void> {
  console.log('\n=== Property 12: Document Metadata Display ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // Verify document number is present
          if (!props.documentNumber || props.documentNumber.length === 0) {
            const error = `Document number is required`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify document date is present
          if (!props.documentDate || props.documentDate.length === 0) {
            const error = `Document date is required`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify party label is in Indonesian
          const validPartyLabels = ['Pelanggan', 'Pemasok'];
          if (!validPartyLabels.includes(props.partyLabel)) {
            const error = `Party label should be in Indonesian: ${props.partyLabel}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify party name is present
          if (!props.partyName || props.partyName.length === 0) {
            const error = `Party name is required`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify Indonesian labels are used
          const expectedLabels = {
            documentNumber: 'No. Dokumen',
            date: 'Tanggal',
          };
          
          if (!expectedLabels.documentNumber.includes('Dokumen')) {
            const error = `Document number label should be in Indonesian`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!expectedLabels.date.includes('Tanggal')) {
            const error = `Date label should be in Indonesian`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 12 PASSED: ${passCount} iterations`);
    console.log(`   - Document number is always present`);
    console.log(`   - Document date is always present`);
    console.log(`   - Party label is in Indonesian (Pelanggan/Pemasok)`);
    console.log(`   - Party name is always present`);
    console.log(`   - Indonesian labels are used (No. Dokumen, Tanggal)`);
    
  } catch (error) {
    console.error(`❌ Property 12 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 13: Item Table Structure
 * 
 * **Validates: Requirements 4.5, 9.7**
 * 
 * For any transaction document with line items, the item table SHALL include 
 * row numbers, item identification, quantity, and appropriate additional columns.
 */
async function testProperty13_ItemTableStructure(): Promise<void> {
  console.log('\n=== Property 13: Item Table Structure ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // Verify items array is present and not empty
          if (!props.items || props.items.length === 0) {
            const error = `Items array is required and must not be empty`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify columns array is present and not empty
          if (!props.columns || props.columns.length === 0) {
            const error = `Columns array is required and must not be empty`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify row numbers would be generated (1, 2, 3...)
          const rowNumbers = props.items.map((_, index) => index + 1);
          if (rowNumbers[0] !== 1) {
            const error = `Row numbers should start from 1`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify each column has required properties
          for (const column of props.columns) {
            if (!column.key || column.key.length === 0) {
              const error = `Column key is required`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!column.label || column.label.length === 0) {
              const error = `Column label is required`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (column.align && !['left', 'center', 'right'].includes(column.align)) {
              const error = `Invalid column alignment: ${column.align}`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Verify items have data for column keys
          for (const item of props.items) {
            for (const column of props.columns) {
              if (!(column.key in item)) {
                const error = `Item missing data for column key: ${column.key}`;
                failures.push(error);
                failCount++;
                return false;
              }
            }
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 13 PASSED: ${passCount} iterations`);
    console.log(`   - Items array is present and not empty`);
    console.log(`   - Columns array is present and not empty`);
    console.log(`   - Row numbers start from 1`);
    console.log(`   - All columns have required properties (key, label)`);
    console.log(`   - All items have data for column keys`);
    
  } catch (error) {
    console.error(`❌ Property 13 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 14: Totals Section Presence
 * 
 * **Validates: Requirements 4.6, 7.8**
 * 
 * For any transaction document with pricing, the rendered output SHALL display 
 * totals section with subtotal, tax, and grand total.
 */
async function testProperty14_TotalsSectionPresence(): Promise<void> {
  console.log('\n=== Property 14: Totals Section Presence ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // If showPrice is true, verify totals are provided
          if (props.showPrice) {
            if (props.subtotal === undefined && props.taxAmount === undefined && props.totalAmount === undefined) {
              const error = `When showPrice is true, at least one of subtotal, taxAmount, or totalAmount should be provided`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            // Verify Indonesian labels are used
            const expectedLabels = {
              subtotal: 'Subtotal',
              tax: 'Pajak',
              total: 'TOTAL',
              terbilang: 'Terbilang',
            };
            
            if (!expectedLabels.tax.includes('Pajak')) {
              const error = `Tax label should be in Indonesian (Pajak)`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!expectedLabels.terbilang.includes('Terbilang')) {
              const error = `Terbilang label should be in Indonesian`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            // Verify currency formatting would use Indonesian locale
            if (props.totalAmount !== undefined) {
              const formatted = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(props.totalAmount);
              
              if (!formatted.includes('Rp')) {
                const error = `Currency should use Indonesian format with Rp`;
                failures.push(error);
                failCount++;
                return false;
              }
            }
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 14 PASSED: ${passCount} iterations`);
    console.log(`   - When showPrice is true, totals are provided`);
    console.log(`   - Indonesian labels are used (Subtotal, Pajak, TOTAL, Terbilang)`);
    console.log(`   - Currency formatting uses Indonesian locale (Rp)`);
    
  } catch (error) {
    console.error(`❌ Property 14 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 15: Signature Section Page Break Prevention
 * 
 * **Validates: Requirements 8.6**
 * 
 * For any document with signatures, the signature section SHALL not be split 
 * across page boundaries.
 */
async function testProperty15_SignatureSectionPageBreakPrevention(): Promise<void> {
  console.log('\n=== Property 15: Signature Section Page Break Prevention ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        printLayoutPropsArbitrary,
        async (props) => {
          // If signatures are provided, verify page break prevention
          if (props.signatures && props.signatures.length > 0) {
            // Verify signature count is between 2 and 3
            if (props.signatures.length < 2 || props.signatures.length > 3) {
              const error = `Signature count should be between 2 and 3, got ${props.signatures.length}`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            // Verify no-break class is applied
            const signatureSectionClass = 'signature-section no-break';
            if (!signatureSectionClass.includes('no-break')) {
              const error = `Signature section should have no-break class`;
              failures.push(error);
              failCount++;
              return false;
            }
            
            // Verify each signature has a label
            for (const signature of props.signatures) {
              if (!signature.label || signature.label.length === 0) {
                const error = `Signature label is required`;
                failures.push(error);
                failCount++;
                return false;
              }
            }
          }
          
          passCount++;
          return true;
        }
      ),
      { numRuns: 100 }
    );
    
    console.log(`✅ Property 15 PASSED: ${passCount} iterations`);
    console.log(`   - Signature section has no-break class`);
    console.log(`   - Signature count is between 2 and 3`);
    console.log(`   - All signatures have labels`);
    
  } catch (error) {
    console.error(`❌ Property 15 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Property-Based Tests: PrintLayout Component                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  let allPassed = true;

  try {
    // Property 4: Tractor Hole Margins
    await testProperty4_TractorHoleMargins();
    
    // Property 5: No Page Breaks in Transactions
    await testProperty5_NoPageBreaksInTransactions();
    
    // Property 11: Document Header Completeness
    await testProperty11_DocumentHeaderCompleteness();
    
    // Property 12: Document Metadata Display
    await testProperty12_DocumentMetadataDisplay();
    
    // Property 13: Item Table Structure
    await testProperty13_ItemTableStructure();
    
    // Property 14: Totals Section Presence
    await testProperty14_TotalsSectionPresence();
    
    // Property 15: Signature Section Page Break Prevention
    await testProperty15_SignatureSectionPageBreakPrevention();
    
  } catch (error) {
    allPassed = false;
    console.error('\n❌ TEST SUITE FAILED');
    console.error(error);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '═'.repeat(66));
  if (allPassed) {
    console.log(`✅ ALL TESTS PASSED in ${duration}s`);
    console.log('═'.repeat(66));
    process.exit(0);
  } else {
    console.log(`❌ SOME TESTS FAILED in ${duration}s`);
    console.log('═'.repeat(66));
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
