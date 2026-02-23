/**
 * Property-Based Test: Transaction Direction Classification
 * 
 * Feature: stock-card-report, Property 4: Transaction Direction Classification
 * 
 * Property: For any transaction, if actual_qty is positive it should be classified
 * and displayed as incoming (Masuk), and if actual_qty is negative it should be
 * classified and displayed as outgoing (Keluar) with absolute value.
 * 
 * Validates: Requirements 1.4
 * Task: 3.2 Write property test for transaction direction classification
 */

import * as fc from 'fast-check';
import { classifyTransactionDirection } from '../lib/stock-card-utils';

/**
 * Property Test: Positive quantities are classified as 'in'
 */
async function testPositiveQuantitiesAreIn(): Promise<void> {
  console.log('Running property test: Positive quantities classified as "in"...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000000 }),
        async (qty: number) => {
          const direction = classifyTransactionDirection(qty);
          
          if (direction !== 'in') {
            throw new Error(
              `Positive quantity ${qty} should be classified as "in", got "${direction}"`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: All positive quantities are classified as "in"');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Negative quantities are classified as 'out'
 */
async function testNegativeQuantitiesAreOut(): Promise<void> {
  console.log('\nRunning property test: Negative quantities classified as "out"...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000000, max: -1 }),
        async (qty: number) => {
          const direction = classifyTransactionDirection(qty);
          
          if (direction !== 'out') {
            throw new Error(
              `Negative quantity ${qty} should be classified as "out", got "${direction}"`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: All negative quantities are classified as "out"');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Zero is classified as 'in'
 */
async function testZeroIsIn(): Promise<void> {
  console.log('\nRunning property test: Zero quantity classified as "in"...');
  
  const direction = classifyTransactionDirection(0);
  
  if (direction !== 'in') {
    throw new Error(`Zero should be classified as "in", got "${direction}"`);
  }
  
  console.log('✓ Property holds: Zero is classified as "in"');
}

/**
 * Property Test: Classification is deterministic
 * Same input always produces same output
 */
async function testClassificationIsDeterministic(): Promise<void> {
  console.log('\nRunning property test: Classification is deterministic...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000000, max: 1000000 }),
        async (qty: number) => {
          const direction1 = classifyTransactionDirection(qty);
          const direction2 = classifyTransactionDirection(qty);
          const direction3 = classifyTransactionDirection(qty);
          
          if (direction1 !== direction2 || direction2 !== direction3) {
            throw new Error(
              `Classification should be deterministic for ${qty}, ` +
              `got ${direction1}, ${direction2}, ${direction3}`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Classification is deterministic');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Classification is total (covers all integers)
 * Every integer can be classified
 */
async function testClassificationIsTotal(): Promise<void> {
  console.log('\nRunning property test: Classification is total...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000000, max: 1000000 }),
        async (qty: number) => {
          const direction = classifyTransactionDirection(qty);
          
          // Should return either 'in' or 'out', never undefined or other values
          if (direction !== 'in' && direction !== 'out') {
            throw new Error(
              `Classification should return 'in' or 'out' for ${qty}, got "${direction}"`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Classification is total (covers all integers)');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Sign preservation
 * The sign of the quantity determines the direction
 */
async function testSignPreservation(): Promise<void> {
  console.log('\nRunning property test: Sign determines direction...');
  
  try {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000000, max: 1000000 }),
        async (qty: number) => {
          const direction = classifyTransactionDirection(qty);
          
          // Property: sign(qty) >= 0 ⟺ direction === 'in'
          const expectedDirection = qty >= 0 ? 'in' : 'out';
          
          if (direction !== expectedDirection) {
            throw new Error(
              `For quantity ${qty}, expected "${expectedDirection}", got "${direction}"`
            );
          }
          
          return true;
        }
      ),
      { numRuns: 100, verbose: false }
    );
    
    console.log('✓ Property holds: Sign correctly determines direction');
    
  } catch (error: any) {
    console.error('✗ Property violated:', error.message);
    throw error;
  }
}

/**
 * Property Test: Boundary values
 * Test edge cases around zero
 */
async function testBoundaryValues(): Promise<void> {
  console.log('\nRunning property test: Boundary values around zero...');
  
  const testCases = [
    { qty: -1, expected: 'out' as const },
    { qty: 0, expected: 'in' as const },
    { qty: 1, expected: 'in' as const },
    { qty: Number.MIN_SAFE_INTEGER, expected: 'out' as const },
    { qty: Number.MAX_SAFE_INTEGER, expected: 'in' as const }
  ];
  
  for (const { qty, expected } of testCases) {
    const direction = classifyTransactionDirection(qty);
    
    if (direction !== expected) {
      throw new Error(
        `Boundary value ${qty} should be "${expected}", got "${direction}"`
      );
    }
  }
  
  console.log('✓ Property holds: Boundary values are correctly classified');
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n=== Property-Based Tests: Transaction Direction Classification ===\n');
  
  try {
    await testPositiveQuantitiesAreIn();
    await testNegativeQuantitiesAreOut();
    await testZeroIsIn();
    await testClassificationIsDeterministic();
    await testClassificationIsTotal();
    await testSignPreservation();
    await testBoundaryValues();
    
    console.log('\n✅ All property tests passed!\n');
  } catch (error) {
    console.error('\n❌ Property test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
