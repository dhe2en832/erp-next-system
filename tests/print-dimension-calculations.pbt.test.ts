/**
 * Property-Based Tests for Print System Dimension Calculations
 * 
 * Feature: print-document-redesign
 * 
 * This file contains property tests for:
 * - Property 1: Transaction Document Continuous Form Dimensions
 * - Property 2: Report Document A4 Fixed Dimensions
 * 
 * **Validates: Requirements 1.4, 2.1, 2.2, 2.5, 2.6, 1.5, 3.1, 3.2, 3.10**
 */

import * as fc from 'fast-check';
import {
  MM_TO_PX,
  PAPER_DIMS,
  CONTINUOUS_PRINTABLE_WIDTH_MM,
  CONTINUOUS_TRACTOR_MARGIN_MM,
  CONTINUOUS_TOTAL_WIDTH_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  calculatePageDimensionsMm,
  calculatePageDimensionsPx,
  getMargins,
  getPrintableArea,
  mmToPx,
  pxToMm,
  validatePaperMode,
  calculateAspectRatio,
} from '../lib/print-utils';
import type { PaperSize, PaperOrientation } from '../types/print';

/**
 * Property 1: Transaction Document Continuous Form Dimensions
 * 
 * **Validates: Requirements 1.4, 2.1, 2.2, 2.5, 2.6**
 * 
 * For any transaction document (SO, SJ, FJ, PO, PR, PI, Payment), when rendered 
 * in continuous mode, the page width SHALL be exactly 210mm, and the height 
 * SHALL be flexible (auto-adjusts to content).
 */
async function testProperty1_ContinuousFormDimensions(): Promise<void> {
  console.log('\n=== Property 1: Transaction Document Continuous Form Dimensions ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const),
        async (paperMode) => {
          // Calculate dimensions in millimeters
          const dimsMm = calculatePageDimensionsMm(paperMode);
          
          // Verify width is exactly 210mm
          if (dimsMm.width !== CONTINUOUS_PRINTABLE_WIDTH_MM) {
            const error = `Width mismatch: expected ${CONTINUOUS_PRINTABLE_WIDTH_MM}mm, got ${dimsMm.width}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify height is 'auto' (flexible)
          if (dimsMm.height !== 'auto') {
            const error = `Height should be 'auto' for continuous form, got ${dimsMm.height}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Calculate dimensions in pixels
          const dimsPx = calculatePageDimensionsPx(paperMode);
          
          // Verify width in pixels matches conversion
          const expectedWidthPx = CONTINUOUS_PRINTABLE_WIDTH_MM * MM_TO_PX;
          if (Math.abs(dimsPx.width - expectedWidthPx) > 0.01) {
            const error = `Width in pixels mismatch: expected ${expectedWidthPx}px, got ${dimsPx.width}px`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify height in pixels is 'auto'
          if (dimsPx.height !== 'auto') {
            const error = `Height in pixels should be 'auto' for continuous form, got ${dimsPx.height}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify tractor margins
          const margins = getMargins(paperMode);
          if (margins.left !== CONTINUOUS_TRACTOR_MARGIN_MM || margins.right !== CONTINUOUS_TRACTOR_MARGIN_MM) {
            const error = `Tractor margins incorrect: expected ${CONTINUOUS_TRACTOR_MARGIN_MM}mm, got left=${margins.left}mm, right=${margins.right}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify total width including tractor holes
          const totalWidth = dimsMm.width + margins.left + margins.right;
          if (totalWidth !== CONTINUOUS_TOTAL_WIDTH_MM) {
            const error = `Total width incorrect: expected ${CONTINUOUS_TOTAL_WIDTH_MM}mm, got ${totalWidth}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify printable area
          const printableArea = getPrintableArea(paperMode);
          if (printableArea.width !== CONTINUOUS_PRINTABLE_WIDTH_MM) {
            const error = `Printable area width incorrect: expected ${CONTINUOUS_PRINTABLE_WIDTH_MM}mm, got ${printableArea.width}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (printableArea.height !== 'auto') {
            const error = `Printable area height should be 'auto', got ${printableArea.height}`;
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
    
    console.log(`✅ Property 1 PASSED: ${passCount} iterations`);
    console.log(`   - Continuous form width: ${CONTINUOUS_PRINTABLE_WIDTH_MM}mm`);
    console.log(`   - Continuous form height: auto (flexible)`);
    console.log(`   - Tractor margins: ${CONTINUOUS_TRACTOR_MARGIN_MM}mm left/right`);
    console.log(`   - Total width: ${CONTINUOUS_TOTAL_WIDTH_MM}mm`);
    
  } catch (error) {
    console.error(`❌ Property 1 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 2: Report Document A4 Fixed Dimensions
 * 
 * **Validates: Requirements 1.5, 3.1, 3.2, 3.10**
 * 
 * For any report document, when rendered in sheet mode, the page dimensions 
 * SHALL be exactly 210mm width × 297mm height, and the aspect ratio SHALL 
 * equal 210:297.
 */
async function testProperty2_A4FixedDimensions(): Promise<void> {
  console.log('\n=== Property 2: Report Document A4 Fixed Dimensions ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('sheet' as const),
        fc.constantFrom('A4' as PaperSize),
        fc.constantFrom('portrait' as PaperOrientation, 'landscape' as PaperOrientation),
        async (paperMode, paperSize, orientation) => {
          // Calculate dimensions in millimeters
          const dimsMm = calculatePageDimensionsMm(paperMode, paperSize, orientation);
          
          // Expected dimensions based on orientation
          const expectedWidth = orientation === 'portrait' ? A4_WIDTH_MM : A4_HEIGHT_MM;
          const expectedHeight = orientation === 'portrait' ? A4_HEIGHT_MM : A4_WIDTH_MM;
          
          // Verify width
          if (dimsMm.width !== expectedWidth) {
            const error = `Width mismatch for ${orientation}: expected ${expectedWidth}mm, got ${dimsMm.width}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify height is a number (not 'auto')
          if (typeof dimsMm.height !== 'number') {
            const error = `Height should be a number for sheet mode, got ${dimsMm.height}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify height value
          if (dimsMm.height !== expectedHeight) {
            const error = `Height mismatch for ${orientation}: expected ${expectedHeight}mm, got ${dimsMm.height}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Calculate dimensions in pixels
          const dimsPx = calculatePageDimensionsPx(paperMode, paperSize, orientation);
          
          // Verify width in pixels
          const expectedWidthPx = expectedWidth * MM_TO_PX;
          if (Math.abs(dimsPx.width - expectedWidthPx) > 0.01) {
            const error = `Width in pixels mismatch: expected ${expectedWidthPx}px, got ${dimsPx.width}px`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify height in pixels
          if (typeof dimsPx.height !== 'number') {
            const error = `Height in pixels should be a number for sheet mode, got ${dimsPx.height}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          const expectedHeightPx = expectedHeight * MM_TO_PX;
          if (Math.abs(dimsPx.height - expectedHeightPx) > 0.01) {
            const error = `Height in pixels mismatch: expected ${expectedHeightPx}px, got ${dimsPx.height}px`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify aspect ratio for portrait orientation
          if (orientation === 'portrait') {
            const aspectRatio = calculateAspectRatio(paperSize, orientation);
            const expectedRatio = A4_WIDTH_MM / A4_HEIGHT_MM;
            
            if (Math.abs(aspectRatio - expectedRatio) > 0.0001) {
              const error = `Aspect ratio mismatch: expected ${expectedRatio}, got ${aspectRatio}`;
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
    
    console.log(`✅ Property 2 PASSED: ${passCount} iterations`);
    console.log(`   - A4 portrait: ${A4_WIDTH_MM}mm × ${A4_HEIGHT_MM}mm`);
    console.log(`   - A4 landscape: ${A4_HEIGHT_MM}mm × ${A4_WIDTH_MM}mm`);
    console.log(`   - Aspect ratio: ${(A4_WIDTH_MM / A4_HEIGHT_MM).toFixed(4)}`);
    
  } catch (error) {
    console.error(`❌ Property 2 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Paper Size Consistency
 * 
 * Verifies that all paper sizes have correct dimensions and conversions
 */
async function testProperty_PaperSizeConsistency(): Promise<void> {
  console.log('\n=== Additional Property: Paper Size Consistency ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('A4' as PaperSize, 'A5' as PaperSize, 'Letter' as PaperSize, 'Legal' as PaperSize, 'F4' as PaperSize),
        fc.constantFrom('portrait' as PaperOrientation, 'landscape' as PaperOrientation),
        async (paperSize, orientation) => {
          const dims = PAPER_DIMS[paperSize];
          const dimsMm = calculatePageDimensionsMm('sheet', paperSize, orientation);
          
          // Verify dimensions match paper size definition
          const expectedWidth = orientation === 'portrait' ? dims.w : dims.h;
          const expectedHeight = orientation === 'portrait' ? dims.h : dims.w;
          
          if (dimsMm.width !== expectedWidth || dimsMm.height !== expectedHeight) {
            const error = `Dimension mismatch for ${paperSize} ${orientation}: expected ${expectedWidth}×${expectedHeight}mm, got ${dimsMm.width}×${dimsMm.height}mm`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Verify conversion consistency
          const widthPx = mmToPx(dimsMm.width);
          const widthMmBack = pxToMm(widthPx);
          
          if (Math.abs(widthMmBack - dimsMm.width) > 0.001) {
            const error = `Conversion inconsistency: ${dimsMm.width}mm -> ${widthPx}px -> ${widthMmBack}mm`;
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
    
    console.log(`✅ Paper Size Consistency PASSED: ${passCount} iterations`);
    console.log(`   - All paper sizes have correct dimensions`);
    console.log(`   - MM to PX conversions are consistent`);
    
  } catch (error) {
    console.error(`❌ Paper Size Consistency FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Paper Mode Validation
 * 
 * Verifies that paper mode validation works correctly
 */
async function testProperty_PaperModeValidation(): Promise<void> {
  console.log('\n=== Additional Property: Paper Mode Validation ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        fc.constantFrom('transaction' as const, 'report' as const),
        async (paperMode, documentType) => {
          const isValid = validatePaperMode(paperMode, documentType);
          
          // Transaction documents must use continuous mode
          if (documentType === 'transaction' && paperMode !== 'continuous') {
            if (isValid) {
              const error = `Transaction document should not accept sheet mode`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Report documents must use sheet mode
          if (documentType === 'report' && paperMode !== 'sheet') {
            if (isValid) {
              const error = `Report document should not accept continuous mode`;
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Valid combinations
          if ((documentType === 'transaction' && paperMode === 'continuous') ||
              (documentType === 'report' && paperMode === 'sheet')) {
            if (!isValid) {
              const error = `Valid combination ${documentType}+${paperMode} should be accepted`;
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
    
    console.log(`✅ Paper Mode Validation PASSED: ${passCount} iterations`);
    console.log(`   - Transaction documents require continuous mode`);
    console.log(`   - Report documents require sheet mode`);
    
  } catch (error) {
    console.error(`❌ Paper Mode Validation FAILED after ${passCount} successful iterations`);
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
  console.log('║  Property-Based Tests: Print Dimension Calculations           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  let allPassed = true;

  try {
    // Property 1: Transaction Document Continuous Form Dimensions
    await testProperty1_ContinuousFormDimensions();
    
    // Property 2: Report Document A4 Fixed Dimensions
    await testProperty2_A4FixedDimensions();
    
    // Additional Properties
    await testProperty_PaperSizeConsistency();
    await testProperty_PaperModeValidation();
    
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
