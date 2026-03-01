/**
 * Unit Tests for Name Utility Functions
 * 
 * Tests the name processing functions used in COA replacement:
 * - stripBacSuffix: Remove " - BAC" suffix from account names
 * - extractAccountNumber: Parse account number from parent references
 * - validateAccountNameLength: Check ERPNext field length limits
 */

import {
  stripBacSuffix,
  extractAccountNumber,
  validateAccountNameLength
} from '../../../scripts/lib/name-utils';

// Simple test framework
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

function assertNull(actual: any, message: string) {
  if (actual !== null) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Expected: null`);
    console.error(`   Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
  }
}

describe('stripBacSuffix', () => {
  it('should remove " - BAC" suffix from account name', () => {
    assertEqual(stripBacSuffix('Kas - BAC'), 'Kas', 'stripBacSuffix("Kas - BAC")');
    assertEqual(stripBacSuffix('Kas dan Bank - BAC'), 'Kas dan Bank', 'stripBacSuffix("Kas dan Bank - BAC")');
    assertEqual(stripBacSuffix('Hutang Komisi Sales - BAC'), 'Hutang Komisi Sales', 'stripBacSuffix("Hutang Komisi Sales - BAC")');
  });

  it('should handle account names without " - BAC" suffix', () => {
    assertEqual(stripBacSuffix('Kas'), 'Kas', 'stripBacSuffix("Kas")');
    assertEqual(stripBacSuffix('Kas dan Bank'), 'Kas dan Bank', 'stripBacSuffix("Kas dan Bank")');
  });

  it('should remove duplicate " - BAC" suffixes', () => {
    assertEqual(stripBacSuffix('Kas - BAC - BAC'), 'Kas - BAC', 'stripBacSuffix("Kas - BAC - BAC")');
    assertEqual(stripBacSuffix('Kas - BAC - BAC - BAC'), 'Kas - BAC - BAC', 'stripBacSuffix("Kas - BAC - BAC - BAC")');
  });

  it('should handle case-insensitive suffix matching', () => {
    assertEqual(stripBacSuffix('Kas - bac'), 'Kas', 'stripBacSuffix("Kas - bac")');
    assertEqual(stripBacSuffix('Kas - BAc'), 'Kas', 'stripBacSuffix("Kas - BAc")');
    assertEqual(stripBacSuffix('Kas - BaC'), 'Kas', 'stripBacSuffix("Kas - BaC")');
  });

  it('should trim whitespace from result', () => {
    assertEqual(stripBacSuffix('  Kas - BAC  '), 'Kas', 'stripBacSuffix("  Kas - BAC  ")');
    assertEqual(stripBacSuffix('Kas  - BAC'), 'Kas', 'stripBacSuffix("Kas  - BAC")');
    assertEqual(stripBacSuffix('Kas -  BAC  '), 'Kas', 'stripBacSuffix("Kas -  BAC  ")');
  });

  it('should handle empty or invalid input', () => {
    assertEqual(stripBacSuffix(''), '', 'stripBacSuffix("")');
    assertEqual(stripBacSuffix('   '), '', 'stripBacSuffix("   ")');
    assertEqual(stripBacSuffix(null as any), '', 'stripBacSuffix(null)');
    assertEqual(stripBacSuffix(undefined as any), '', 'stripBacSuffix(undefined)');
  });

  it('should preserve " - BAC" in the middle of account name', () => {
    assertEqual(stripBacSuffix('Account - BAC - Something'), 'Account - BAC - Something', 'stripBacSuffix("Account - BAC - Something")');
  });
});

describe('extractAccountNumber', () => {
  it('should extract account number from parent reference with decimal', () => {
    assertEqual(extractAccountNumber('1110.000 - Kas dan Bank - BAC'), '1110.000', 'extractAccountNumber("1110.000 - Kas dan Bank - BAC")');
    assertEqual(extractAccountNumber('1110.001 - Kas - BAC'), '1110.001', 'extractAccountNumber("1110.001 - Kas - BAC")');
    assertEqual(extractAccountNumber('2150.0001 - Hutang Komisi - BAC'), '2150.0001', 'extractAccountNumber("2150.0001 - Hutang Komisi - BAC")');
  });

  it('should extract account number from parent reference without decimal', () => {
    assertEqual(extractAccountNumber('1000 - Aktiva - BAC'), '1000', 'extractAccountNumber("1000 - Aktiva - BAC")');
    assertEqual(extractAccountNumber('2150 - Hutang Komisi Sales - BAC'), '2150', 'extractAccountNumber("2150 - Hutang Komisi Sales - BAC")');
    assertEqual(extractAccountNumber('5000 - Beban - BAC'), '5000', 'extractAccountNumber("5000 - Beban - BAC")');
  });

  it('should handle parent references without " - BAC" suffix', () => {
    assertEqual(extractAccountNumber('1110.000 - Kas dan Bank'), '1110.000', 'extractAccountNumber("1110.000 - Kas dan Bank")');
    assertEqual(extractAccountNumber('2150 - Hutang Komisi Sales'), '2150', 'extractAccountNumber("2150 - Hutang Komisi Sales")');
  });

  it('should return null for invalid parent references', () => {
    assertNull(extractAccountNumber('Invalid'), 'extractAccountNumber("Invalid")');
    assertNull(extractAccountNumber('No Number Here'), 'extractAccountNumber("No Number Here")');
    assertNull(extractAccountNumber('- BAC'), 'extractAccountNumber("- BAC")');
  });

  it('should return null for empty or invalid input', () => {
    assertNull(extractAccountNumber(''), 'extractAccountNumber("")');
    assertNull(extractAccountNumber('   '), 'extractAccountNumber("   ")');
    assertNull(extractAccountNumber(null as any), 'extractAccountNumber(null)');
    assertNull(extractAccountNumber(undefined as any), 'extractAccountNumber(undefined)');
  });

  it('should extract only the leading number', () => {
    assertEqual(extractAccountNumber('1110.000 - Account 2150 - BAC'), '1110.000', 'extractAccountNumber("1110.000 - Account 2150 - BAC")');
    assertEqual(extractAccountNumber('2150 - Account with 1000 in name - BAC'), '2150', 'extractAccountNumber("2150 - Account with 1000 in name - BAC")');
  });

  it('should handle various decimal formats', () => {
    assertEqual(extractAccountNumber('1.0 - Account - BAC'), '1.0', 'extractAccountNumber("1.0 - Account - BAC")');
    assertEqual(extractAccountNumber('1110.0 - Account - BAC'), '1110.0', 'extractAccountNumber("1110.0 - Account - BAC")');
    assertEqual(extractAccountNumber('1110.001 - Account - BAC'), '1110.001', 'extractAccountNumber("1110.001 - Account - BAC")');
    assertEqual(extractAccountNumber('1110.0001 - Account - BAC'), '1110.0001', 'extractAccountNumber("1110.0001 - Account - BAC")');
  });
});

describe('validateAccountNameLength', () => {
  it('should validate short account names', () => {
    const result = validateAccountNameLength('Kas');
    assert(result.valid === true, 'validateAccountNameLength("Kas").valid should be true');
    assertEqual(result.length, 9, 'validateAccountNameLength("Kas").length'); // "Kas" (3) + " - BAC" (6)
    assertEqual(result.maxLength, 140, 'validateAccountNameLength("Kas").maxLength');
    assert(result.error === undefined, 'validateAccountNameLength("Kas").error should be undefined');
  });

  it('should validate medium-length account names', () => {
    const accountName = 'Beban Penyusutan Peralatan dan Mesin';
    const result = validateAccountNameLength(accountName);
    assert(result.valid === true, `validateAccountNameLength("${accountName}").valid should be true`);
    assertEqual(result.length, accountName.length + 6, `validateAccountNameLength("${accountName}").length`); // + " - BAC"
    assert(result.error === undefined, `validateAccountNameLength("${accountName}").error should be undefined`);
  });

  it('should validate account name at maximum length', () => {
    // 140 - 6 (" - BAC") = 134 characters max for account name
    const accountName = 'A'.repeat(134);
    const result = validateAccountNameLength(accountName);
    assert(result.valid === true, 'validateAccountNameLength(134 chars).valid should be true');
    assertEqual(result.length, 140, 'validateAccountNameLength(134 chars).length');
    assert(result.error === undefined, 'validateAccountNameLength(134 chars).error should be undefined');
  });

  it('should reject account name exceeding maximum length', () => {
    // 135 characters + 6 (" - BAC") = 141 characters (exceeds 140 limit)
    const accountName = 'A'.repeat(135);
    const result = validateAccountNameLength(accountName);
    assert(result.valid === false, 'validateAccountNameLength(135 chars).valid should be false');
    assertEqual(result.length, 141, 'validateAccountNameLength(135 chars).length');
    assert(result.error !== undefined && result.error.includes('exceeding the maximum'), 'validateAccountNameLength(135 chars).error should contain "exceeding the maximum"');
  });

  it('should reject account name far exceeding maximum length', () => {
    const accountName = 'A'.repeat(200);
    const result = validateAccountNameLength(accountName);
    assert(result.valid === false, 'validateAccountNameLength(200 chars).valid should be false');
    assertEqual(result.length, 206, 'validateAccountNameLength(200 chars).length'); // 200 + 6
    assert(result.error !== undefined && result.error.includes('exceeding the maximum'), 'validateAccountNameLength(200 chars).error should contain "exceeding the maximum"');
  });

  it('should handle empty or invalid input', () => {
    const emptyResult = validateAccountNameLength('');
    assert(emptyResult.valid === false, 'validateAccountNameLength("").valid should be false');
    assert(emptyResult.error !== undefined && emptyResult.error.includes('required'), 'validateAccountNameLength("").error should contain "required"');
    
    const nullResult = validateAccountNameLength(null as any);
    assert(nullResult.valid === false, 'validateAccountNameLength(null).valid should be false');
    assert(nullResult.error !== undefined && nullResult.error.includes('required'), 'validateAccountNameLength(null).error should contain "required"');
    
    const undefinedResult = validateAccountNameLength(undefined as any);
    assert(undefinedResult.valid === false, 'validateAccountNameLength(undefined).valid should be false');
    assert(undefinedResult.error !== undefined && undefinedResult.error.includes('required'), 'validateAccountNameLength(undefined).error should contain "required"');
  });

  it('should handle account names with special characters', () => {
    const accountName = 'Beban Bunga & Administrasi Bank (USD)';
    const result = validateAccountNameLength(accountName);
    assert(result.valid === true, `validateAccountNameLength("${accountName}").valid should be true`);
    assertEqual(result.length, accountName.length + 6, `validateAccountNameLength("${accountName}").length`);
  });

  it('should calculate length correctly for Indonesian characters', () => {
    const accountName = 'Beban Penyusutan Bangunan';
    const result = validateAccountNameLength(accountName);
    assert(result.valid === true, `validateAccountNameLength("${accountName}").valid should be true`);
    assertEqual(result.length, accountName.length + 6, `validateAccountNameLength("${accountName}").length`);
  });
});

describe('Integration: stripBacSuffix and extractAccountNumber', () => {
  it('should work together to process parent references', () => {
    const parentRef = '1110.000 - Kas dan Bank - BAC';
    const accountNumber = extractAccountNumber(parentRef);
    const accountName = stripBacSuffix('Kas dan Bank - BAC');
    
    assertEqual(accountNumber, '1110.000', 'extractAccountNumber(parentRef)');
    assertEqual(accountName, 'Kas dan Bank', 'stripBacSuffix("Kas dan Bank - BAC")');
  });

  it('should handle special account Hutang Komisi Sales', () => {
    const parentRef = '2100.000 - Liabilitas Jangka Pendek - BAC';
    const accountNumber = extractAccountNumber(parentRef);
    const accountName = stripBacSuffix('Hutang Komisi Sales - BAC');
    
    assertEqual(accountNumber, '2100.000', 'extractAccountNumber(parentRef)');
    assertEqual(accountName, 'Hutang Komisi Sales', 'stripBacSuffix("Hutang Komisi Sales - BAC")');
  });
});

describe('Integration: All three functions together', () => {
  it('should process a complete account with parent reference', () => {
    const accountName = 'Kas - BAC';
    const parentRef = '1110.000 - Kas dan Bank - BAC';
    
    // Strip suffix from account name
    const cleanName = stripBacSuffix(accountName);
    assertEqual(cleanName, 'Kas', 'stripBacSuffix(accountName)');
    
    // Extract parent account number
    const parentNumber = extractAccountNumber(parentRef);
    assertEqual(parentNumber, '1110.000', 'extractAccountNumber(parentRef)');
    
    // Validate length
    const validation = validateAccountNameLength(cleanName);
    assert(validation.valid === true, 'validateAccountNameLength(cleanName).valid should be true');
  });

  it('should handle long account names with validation', () => {
    const longName = 'Beban Penyusutan Peralatan Kantor dan Komputer - BAC';
    const parentRef = '5200.000 - Beban Operasional - BAC';
    
    const cleanName = stripBacSuffix(longName);
    const parentNumber = extractAccountNumber(parentRef);
    const validation = validateAccountNameLength(cleanName);
    
    assertEqual(cleanName, 'Beban Penyusutan Peralatan Kantor dan Komputer', 'stripBacSuffix(longName)');
    assertEqual(parentNumber, '5200.000', 'extractAccountNumber(parentRef)');
    assert(validation.valid === true, 'validateAccountNameLength(cleanName).valid should be true');
  });
});

// Run all tests
console.log('\n=== Running Name Utils Tests ===\n');
try {
  describe('stripBacSuffix', () => {});
  describe('extractAccountNumber', () => {});
  describe('validateAccountNameLength', () => {});
  describe('Integration: stripBacSuffix and extractAccountNumber', () => {});
  describe('Integration: All three functions together', () => {});
  
  console.log(`\n=== Test Results ===`);
  console.log(`✓ Passed: ${testsPassed}`);
  console.log(`✗ Failed: ${testsFailed}`);
  
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
} catch (error) {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
}
