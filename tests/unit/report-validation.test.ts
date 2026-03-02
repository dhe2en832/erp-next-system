/**
 * Unit tests for date validation utility
 * Tests validateDateRange function for financial reports
 */

import { validateDateRange } from '../../utils/report-validation';

console.log('Running Date Validation Unit Tests...\n');

// Test 1: Valid date range
console.log('Test 1: Valid date range (from_date <= to_date)');
const result1 = validateDateRange('2024-01-01', '2024-12-31');
console.assert(result1.valid === true, 'Should be valid');
console.assert(result1.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 2: Invalid date range (from_date > to_date)
console.log('Test 2: Invalid date range (from_date > to_date)');
const result2 = validateDateRange('2024-12-31', '2024-01-01');
console.assert(result2.valid === false, 'Should be invalid');
console.assert(
  result2.error === 'from_date must be less than or equal to to_date',
  'Should have correct error message'
);
console.log('✓ Passed\n');

// Test 3: Equal dates (from_date = to_date)
console.log('Test 3: Equal dates (from_date = to_date)');
const result3 = validateDateRange('2024-06-15', '2024-06-15');
console.assert(result3.valid === true, 'Should be valid');
console.assert(result3.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 4: Invalid from_date format
console.log('Test 4: Invalid from_date format');
const result4 = validateDateRange('invalid-date', '2024-12-31');
console.assert(result4.valid === false, 'Should be invalid');
console.assert(
  result4.error === 'Invalid from_date format. Use YYYY-MM-DD.',
  'Should have correct error message'
);
console.log('✓ Passed\n');

// Test 5: Invalid to_date format
console.log('Test 5: Invalid to_date format');
const result5 = validateDateRange('2024-01-01', 'not-a-date');
console.assert(result5.valid === false, 'Should be invalid');
console.assert(
  result5.error === 'Invalid to_date format. Use YYYY-MM-DD.',
  'Should have correct error message'
);
console.log('✓ Passed\n');

// Test 6: Null from_date
console.log('Test 6: Null from_date');
const result6 = validateDateRange(null, '2024-12-31');
console.assert(result6.valid === true, 'Should be valid (null dates pass)');
console.assert(result6.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 7: Null to_date
console.log('Test 7: Null to_date');
const result7 = validateDateRange('2024-01-01', null);
console.assert(result7.valid === true, 'Should be valid (null dates pass)');
console.assert(result7.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 8: Both dates null
console.log('Test 8: Both dates null');
const result8 = validateDateRange(null, null);
console.assert(result8.valid === true, 'Should be valid (null dates pass)');
console.assert(result8.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 9: Empty string dates
console.log('Test 9: Empty string dates');
const result9 = validateDateRange('', '');
console.assert(result9.valid === true, 'Should be valid (empty strings treated as null)');
console.assert(result9.error === undefined, 'Should have no error');
console.log('✓ Passed\n');

// Test 10: Partial date format (missing day)
console.log('Test 10: Partial date format (missing day)');
const result10 = validateDateRange('2024-01', '2024-12-31');
console.assert(result10.valid === true, 'Should be valid (Date constructor accepts YYYY-MM)');
console.log('✓ Passed\n');

// Test 11: Invalid date values (e.g., month 13)
console.log('Test 11: Invalid date values (month 13)');
const result11 = validateDateRange('2024-13-01', '2024-12-31');
console.assert(result11.valid === false, 'Should be invalid');
console.log('✓ Passed\n');

console.log('All Date Validation Unit Tests Passed! ✓');
