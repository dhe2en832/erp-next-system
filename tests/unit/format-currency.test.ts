import { formatCurrency } from '../../utils/format';

/**
 * Simple test runner for formatCurrency utility
 * Validates Requirements 2.19, 2.20 from bugfix.md
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

function assertEqual(actual: string, expected: string, testName: string) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`  Expected: "${expected}"`);
    console.error(`  Actual:   "${actual}"`);
    process.exit(1);
  }
  console.log(`✓ ${testName}`);
}

console.log('Testing formatCurrency utility...\n');

// Test 1: Positive amounts
console.log('Test 1: Positive amounts');
assertEqual(formatCurrency(1000000), 'Rp 1.000.000,00', 'Format 1,000,000');
assertEqual(formatCurrency(1234567.89), 'Rp 1.234.567,89', 'Format 1,234,567.89');
assertEqual(formatCurrency(100), 'Rp 100,00', 'Format 100');

// Test 2: Negative amounts (should use absolute value)
console.log('\nTest 2: Negative amounts (absolute value)');
assertEqual(formatCurrency(-1000000), 'Rp 1.000.000,00', 'Format -1,000,000 as positive');
assertEqual(formatCurrency(-1234567.89), 'Rp 1.234.567,89', 'Format -1,234,567.89 as positive');

// Test 3: Zero
console.log('\nTest 3: Zero amount');
assertEqual(formatCurrency(0), 'Rp 0,00', 'Format 0');

// Test 4: Decimal places
console.log('\nTest 4: Decimal places (always 2)');
assertEqual(formatCurrency(1000), 'Rp 1.000,00', 'Format 1000 with 2 decimals');
assertEqual(formatCurrency(1000.5), 'Rp 1.000,50', 'Format 1000.5 with 2 decimals');
assertEqual(formatCurrency(1000.123), 'Rp 1.000,12', 'Format 1000.123 rounded to 2 decimals');

// Test 5: Indonesian formatting
console.log('\nTest 5: Indonesian formatting (dot for thousands, comma for decimals)');
const result = formatCurrency(1234567.89);
assert(result.includes('.'), 'Contains dot (thousands separator)');
assert(result.includes(','), 'Contains comma (decimal separator)');
assertEqual(result, 'Rp 1.234.567,89', 'Full Indonesian format');

// Test 6: Space after Rp prefix
console.log('\nTest 6: Space after Rp prefix');
assert(formatCurrency(1000).startsWith('Rp '), 'Has space after Rp');
assert(/^Rp \d/.test(formatCurrency(1000)), 'Matches pattern "Rp [digit]"');

console.log('\n✅ All tests passed!');
console.log('\nFormatCurrency utility meets requirements:');
console.log('  - Requirement 2.19: Consistent format "Rp 1.000.000,00"');
console.log('  - Requirement 2.20: Uses Intl.NumberFormat("id-ID")');
console.log('  - Handles positive, negative, and zero amounts');
console.log('  - Always shows 2 decimal places');
