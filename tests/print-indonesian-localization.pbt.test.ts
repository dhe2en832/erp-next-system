/**
 * Property-Based Tests for Indonesian Localization Utilities
 * 
 * Feature: print-document-redesign
 * 
 * This file contains property tests for:
 * - Property 7: Indonesian Localization
 * - Property 8: Currency Formatting Consistency
 * 
 * **Validates: Requirements 7.1-7.10, 8.1**
 */

import * as fc from 'fast-check';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  numberToWords,
  getLabel,
  INDONESIAN_LABELS,
} from '@/lib/print-utils';

/**
 * Property 7: Indonesian Localization
 * 
 * **Validates: Requirements 7.1-7.10**
 * 
 * For any label or text element in any document, the text SHALL be in 
 * Bahasa Indonesia according to specified translations.
 */
async function testProperty7_IndonesianLocalization(): Promise<void> {
  console.log('\n=== Property 7: Indonesian Localization ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'documentNumber', 'date', 'customer', 'supplier', 'notes',
          'subtotal', 'tax', 'total', 'terbilang',
          'salesOrder', 'deliveryNote', 'salesInvoice',
          'purchaseOrder', 'purchaseReceipt', 'purchaseInvoice',
          'paymentPay', 'paymentReceive'
        ),
        async (labelKey) => {
          // Test 1: All labels must be in Indonesian
          const label = getLabel(labelKey as keyof typeof INDONESIAN_LABELS);
          
          if (!label || label.length === 0) {
            const error = `Label for ${labelKey} is empty`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Verify specific required labels
          const requiredLabels: Record<string, string> = {
            documentNumber: 'No. Dokumen',
            date: 'Tanggal',
            customer: 'Pelanggan',
            supplier: 'Pemasok',
            notes: 'Catatan',
            subtotal: 'Subtotal',
            tax: 'Pajak',
            total: 'Total',
            terbilang: 'Terbilang',
          };
          
          if (labelKey in requiredLabels) {
            const expectedLabel = requiredLabels[labelKey];
            if (label !== expectedLabel) {
              const error = `Label for ${labelKey} should be "${expectedLabel}", got "${label}"`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 3: Labels should not contain English-only words (basic check)
          // Note: Some words like "Subtotal" are the same in both languages
          const englishOnlyWords = ['Document Number', 'Customer', 'Supplier', 'Notes'];
          for (const englishWord of englishOnlyWords) {
            if (label === englishWord) {
              const error = `Label "${label}" appears to be in English, not Indonesian`;
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
    
    console.log(`✅ Property 7 PASSED: ${passCount} iterations`);
    console.log(`   - All labels are in Bahasa Indonesia`);
    console.log(`   - Required labels match specifications`);
    console.log(`   - No English-only labels found`);
    
  } catch (error) {
    console.error(`❌ Property 7 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 8: Currency Formatting Consistency
 * 
 * **Validates: Requirements 7.10**
 * 
 * For any numeric currency value displayed in any document, the value SHALL 
 * be formatted using Indonesian locale (Rp X.XXX.XXX format with thousand separators).
 */
async function testProperty8_CurrencyFormattingConsistency(): Promise<void> {
  console.log('\n=== Property 8: Currency Formatting Consistency ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000000000, max: 1000000000 }),
        async (amount) => {
          const formatted = formatCurrency(amount);
          
          // Test 1: Must start with "Rp " or "-Rp "
          if (!formatted.startsWith('Rp ') && !formatted.startsWith('-Rp ')) {
            const error = `Currency format should start with "Rp " or "-Rp ", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Must use period (.) as thousand separator (Indonesian locale)
          const numberPart = formatted.replace(/^-?Rp\s+/, '');
          if (Math.abs(amount) >= 1000) {
            if (!numberPart.includes('.')) {
              const error = `Currency format should use period as thousand separator for ${amount}, got "${formatted}"`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 3: Should not use comma as thousand separator (that's US format)
          if (numberPart.includes(',')) {
            const error = `Currency format should not use comma as thousand separator, got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Negative numbers should have minus sign before "Rp"
          if (amount < 0 && !formatted.startsWith('-Rp ')) {
            const error = `Negative currency should start with "-Rp ", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 5: Zero should format as "Rp 0"
          if (amount === 0 && formatted !== 'Rp 0') {
            const error = `Zero should format as "Rp 0", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 6: Verify specific examples
          const testCases = new Map<number, string>([
            [1000, 'Rp 1.000'],
            [1000000, 'Rp 1.000.000'],
            [1234567, 'Rp 1.234.567'],
            [100, 'Rp 100'],
            [-5000, '-Rp 5.000'],
          ]);
          
          if (testCases.has(amount)) {
            const expected = testCases.get(amount)!;
            if (formatted !== expected) {
              const error = `Amount ${amount} should format as "${expected}", got "${formatted}"`;
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
    
    console.log(`✅ Property 8 PASSED: ${passCount} iterations`);
    console.log(`   - All currency values start with "Rp "`);
    console.log(`   - Thousand separators use period (.) - Indonesian locale`);
    console.log(`   - No comma separators (US format) found`);
    console.log(`   - Negative numbers formatted correctly`);
    console.log(`   - Zero formatted as "Rp 0"`);
    
  } catch (error) {
    console.error(`❌ Property 8 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Date Formatting with Indonesian Locale
 * 
 * Verifies that dates are formatted using Indonesian month names
 */
async function testProperty_DateFormattingIndonesian(): Promise<void> {
  console.log('\n=== Additional Property: Date Formatting with Indonesian Locale ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 2000, max: 2100 }),
        async (day, month, year) => {
          // Create a valid date
          const date = new Date(year, month, Math.min(day, 28)); // Use 28 to avoid invalid dates
          const formatted = formatDate(date);
          
          // Test 1: Must contain Indonesian month name
          const expectedMonth = indonesianMonths[month];
          if (!formatted.includes(expectedMonth)) {
            const error = `Date format should contain Indonesian month "${expectedMonth}", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Must contain year
          if (!formatted.includes(year.toString())) {
            const error = `Date format should contain year ${year}, got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Format should be "DD Month YYYY"
          const expectedFormat = `${date.getDate()} ${expectedMonth} ${year}`;
          if (formatted !== expectedFormat) {
            const error = `Date format should be "${expectedFormat}", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Should not contain English-only month names
          // Note: "April", "Mei", "September", and "November" are the same or similar in both languages
          const englishOnlyMonths = ['January', 'February', 'March', 'May', 'June',
                                     'July', 'August', 'October', 'December'];
          for (const englishMonth of englishOnlyMonths) {
            if (formatted.includes(englishMonth)) {
              const error = `Date format should not contain English-only month "${englishMonth}", got "${formatted}"`;
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
    
    console.log(`✅ Date Formatting Indonesian PASSED: ${passCount} iterations`);
    console.log(`   - All dates use Indonesian month names`);
    console.log(`   - Format is "DD Month YYYY"`);
    console.log(`   - No English month names found`);
    
  } catch (error) {
    console.error(`❌ Date Formatting Indonesian FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Number to Words (Terbilang) Correctness
 * 
 * Verifies that numbers are correctly converted to Indonesian words
 */
async function testProperty_NumberToWordsCorrectness(): Promise<void> {
  console.log('\n=== Additional Property: Number to Words (Terbilang) Correctness ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000000000 }),
        async (amount) => {
          const words = numberToWords(amount);
          
          // Test 1: Must end with "rupiah"
          if (!words.endsWith('rupiah')) {
            const error = `Terbilang should end with "rupiah", got "${words}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Must be in lowercase (Indonesian convention)
          if (words !== words.toLowerCase()) {
            const error = `Terbilang should be lowercase, got "${words}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Should not contain English number words
          const englishWords = ['one', 'two', 'three', 'four', 'five', 'hundred', 'thousand', 'million'];
          for (const englishWord of englishWords) {
            if (words.includes(englishWord)) {
              const error = `Terbilang should not contain English word "${englishWord}", got "${words}"`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 4: Verify specific test cases
          const testCases = new Map<number, string>([
            [0, 'nol rupiah'],
            [1, 'satu rupiah'],
            [10, 'sepuluh rupiah'],
            [11, 'sebelas rupiah'],
            [100, 'seratus rupiah'],
            [1000, 'seribu rupiah'],
            [1000000, 'satu juta rupiah'],
          ]);
          
          if (testCases.has(amount)) {
            const expected = testCases.get(amount)!;
            if (words !== expected) {
              const error = `Amount ${amount} should convert to "${expected}", got "${words}"`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 5: Should contain Indonesian number words
          const indonesianWords = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 
                                   'enam', 'tujuh', 'delapan', 'sembilan',
                                   'sepuluh', 'sebelas', 'puluh', 'ratus', 'ribu', 
                                   'juta', 'miliar', 'triliun'];
          
          let containsIndonesianWord = false;
          for (const indonesianWord of indonesianWords) {
            if (words.includes(indonesianWord)) {
              containsIndonesianWord = true;
              break;
            }
          }
          
          if (!containsIndonesianWord && amount !== 0) {
            const error = `Terbilang should contain Indonesian number words, got "${words}"`;
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
    
    console.log(`✅ Number to Words Correctness PASSED: ${passCount} iterations`);
    console.log(`   - All conversions end with "rupiah"`);
    console.log(`   - All conversions are lowercase`);
    console.log(`   - No English number words found`);
    console.log(`   - Contains Indonesian number words`);
    console.log(`   - Specific test cases verified`);
    
  } catch (error) {
    console.error(`❌ Number to Words Correctness FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: DateTime Formatting with WIB Timezone
 * 
 * Verifies that date-time strings include WIB timezone indicator
 */
async function testProperty_DateTimeFormattingWIB(): Promise<void> {
  console.log('\n=== Additional Property: DateTime Formatting with WIB Timezone ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
        async (date) => {
          const formatted = formatDateTime(date);
          
          // Skip if date is invalid (should return empty string)
          if (isNaN(date.getTime())) {
            passCount++;
            return true;
          }
          
          // Test 1: Must end with "WIB"
          if (!formatted.endsWith('WIB')) {
            const error = `DateTime format should end with "WIB", got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Must contain time in HH:MM format
          const timeRegex = /\d{2}:\d{2}/;
          if (!timeRegex.test(formatted)) {
            const error = `DateTime format should contain time in HH:MM format, got "${formatted}"`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Must contain Indonesian month name
          const indonesianMonths = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          
          let containsIndonesianMonth = false;
          for (const month of indonesianMonths) {
            if (formatted.includes(month)) {
              containsIndonesianMonth = true;
              break;
            }
          }
          
          if (!containsIndonesianMonth) {
            const error = `DateTime format should contain Indonesian month name, got "${formatted}"`;
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
    
    console.log(`✅ DateTime Formatting WIB PASSED: ${passCount} iterations`);
    console.log(`   - All date-times end with "WIB"`);
    console.log(`   - All date-times contain time in HH:MM format`);
    console.log(`   - All date-times contain Indonesian month names`);
    
  } catch (error) {
    console.error(`❌ DateTime Formatting WIB FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Property-Based Tests: Indonesian Localization Utilities      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  let allPassed = true;

  try {
    // Property 7: Indonesian Localization
    await testProperty7_IndonesianLocalization();
    
    // Property 8: Currency Formatting Consistency
    await testProperty8_CurrencyFormattingConsistency();
    
    // Additional Properties
    await testProperty_DateFormattingIndonesian();
    await testProperty_NumberToWordsCorrectness();
    await testProperty_DateTimeFormattingWIB();
    
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
