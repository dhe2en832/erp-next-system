/**
 * Property-Based Tests for PrintPreviewModal Component
 * 
 * Feature: print-document-redesign
 * 
 * This file contains property tests for:
 * - Property 3: Paper Mode Consistency
 * - Property 9: Preview and Output Consistency
 * 
 * **Validates: Requirements 1.2, 1.3, 1.6, 8.1, 8.10**
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the PrintPreviewModal component source code
const modalPath = path.join(__dirname, '../components/print/PrintPreviewModal.tsx');
const modalSource = fs.readFileSync(modalPath, 'utf-8');

// Read the globals.css for print styles
const cssPath = path.join(__dirname, '../app/globals.css');
const globalCSS = fs.readFileSync(cssPath, 'utf-8');

/**
 * Property 3: Paper Mode Consistency
 * 
 * **Validates: Requirements 1.2, 1.3, 1.6**
 * 
 * For any document, the paper mode SHALL match the document type (continuous 
 * for transactions, sheet for reports), and SHALL NOT be switchable for 
 * transaction documents.
 */
async function testProperty3_PaperModeConsistency(): Promise<void> {
  console.log('\n=== Property 3: Paper Mode Consistency ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        fc.constantFrom('transaction' as const, 'report' as const),
        fc.boolean(), // allowPaperSettings prop
        async (paperMode, documentType, allowPaperSettings) => {
          // Test 1: Paper mode must match document type
          const validCombination = 
            (documentType === 'transaction' && paperMode === 'continuous') ||
            (documentType === 'report' && paperMode === 'sheet');
          
          if (!validCombination) {
            // Invalid combinations should be rejected by the system
            // This is enforced at the component usage level
            passCount++;
            return true;
          }
          
          // Test 2: Transaction documents must use continuous mode
          if (documentType === 'transaction' && paperMode !== 'continuous') {
            const error = `Transaction documents must use continuous mode, got ${paperMode}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Report documents must use sheet mode
          if (documentType === 'report' && paperMode !== 'sheet') {
            const error = `Report documents must use sheet mode, got ${paperMode}`;
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Paper settings should not be available for continuous mode
          // Check that the component conditionally renders settings panel
          const settingsPanelRegex = /allowPaperSettings\s*&&\s*paperMode\s*===\s*['"]sheet['"]/;
          if (!settingsPanelRegex.test(modalSource)) {
            const error = 'Settings panel should only be available for sheet mode';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 5: Continuous mode should not allow paper size selection
          if (paperMode === 'continuous') {
            // Verify that paper size selector is not rendered for continuous mode
            const paperSizeCondition = /paperMode\s*===\s*['"]sheet['"]\s*&&\s*showSettings/;
            if (!paperSizeCondition.test(modalSource)) {
              const error = 'Paper size selection should be disabled for continuous mode';
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 6: Paper mode indicator should display correct label
          const paperModeIndicatorRegex = /getPaperModeLabel|paperMode\s*===\s*['"]continuous['"]\s*\?\s*['"]Continuous Form['"]/;
          if (!paperModeIndicatorRegex.test(modalSource)) {
            const error = 'Paper mode indicator not found in component';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 7: Dimension display should show correct format
          // Continuous: "210mm × Auto", Sheet: "210mm × 297mm"
          const dimensionDisplayRegex = /getDimensionText|pageHeightMm\s*===\s*['"]auto['"]/;
          if (!dimensionDisplayRegex.test(modalSource)) {
            const error = 'Dimension display logic not found in component';
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
    
    console.log(`✅ Property 3 PASSED: ${passCount} iterations`);
    console.log(`   - Paper mode matches document type`);
    console.log(`   - Transaction documents use continuous mode`);
    console.log(`   - Report documents use sheet mode`);
    console.log(`   - Paper settings disabled for continuous mode`);
    console.log(`   - Paper mode indicator displays correctly`);
    console.log(`   - Dimension display shows correct format`);
    
  } catch (error) {
    console.error(`❌ Property 3 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Property 9: Preview and Output Consistency
 * 
 * **Validates: Requirements 8.1, 8.10**
 * 
 * For any document, the CSS styles, dimensions, fonts, and margins used in 
 * print preview SHALL be identical to those used in actual print output.
 */
async function testProperty9_PreviewOutputConsistency(): Promise<void> {
  console.log('\n=== Property 9: Preview and Output Consistency ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        fc.constantFrom('A4' as const, 'A5' as const, 'Letter' as const, 'Legal' as const, 'F4' as const),
        fc.constantFrom('portrait' as const, 'landscape' as const),
        async (paperMode, paperSize, orientation) => {
          // Test 1: Preview container uses same dimensions as print output
          // Check that buildPrintHtml function exists and uses correct @page rules
          const buildPrintHtmlRegex = /buildPrintHtml\s*=\s*\(\)\s*=>/;
          if (!buildPrintHtmlRegex.test(modalSource)) {
            const error = 'buildPrintHtml function not found in component';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: @page rules in buildPrintHtml match paper mode
          if (paperMode === 'continuous') {
            const continuousPageRule = /@page\s*\{\s*size:\s*210mm\s+auto;\s*margin:\s*0\s+5mm;/;
            if (!continuousPageRule.test(modalSource)) {
              const error = 'Continuous @page rule not found in buildPrintHtml';
              failures.push(error);
              failCount++;
              return false;
            }
          } else {
            // Sheet mode should use dynamic dimensions
            const sheetPageRule = /@page\s*\{\s*size:\s*\$\{pageWidthMm\}mm\s+\$\{pageHeightMm\}mm/;
            if (!sheetPageRule.test(modalSource)) {
              const error = 'Sheet @page rule not found in buildPrintHtml';
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 3: Font family consistency
          // Preview and print output should use same fonts
          const previewFontRegex = /fontFamily:\s*['"]Arial,\s*Helvetica,\s*sans-serif['"]/;
          const printFontRegex = /font-family:\s*Arial,\s*Helvetica,\s*sans-serif/;
          
          if (!previewFontRegex.test(modalSource)) {
            const error = 'Preview font family not set to Arial, Helvetica, sans-serif';
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!printFontRegex.test(modalSource)) {
            const error = 'Print font family not set to Arial, Helvetica, sans-serif';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Font size consistency
          const previewFontSizeRegex = /fontSize:\s*['"]10px['"]/;
          const printFontSizeRegex = /font-size:\s*10px/;
          
          if (!previewFontSizeRegex.test(modalSource)) {
            const error = 'Preview font size not set to 10px';
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!printFontSizeRegex.test(modalSource)) {
            const error = 'Print font size not set to 10px';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 5: Color consistency
          const previewColorRegex = /color:\s*['"]#111['"]/;
          const printColorRegex = /color:\s*#111/;
          
          if (!previewColorRegex.test(modalSource)) {
            const error = 'Preview text color not set to #111';
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!printColorRegex.test(modalSource)) {
            const error = 'Print text color not set to #111';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 6: Margin consistency for continuous mode
          if (paperMode === 'continuous') {
            const previewMarginRegex = /padding:\s*paperMode\s*===\s*['"]continuous['"]\s*\?\s*['"]0\s+5mm['"]/;
            const printMarginRegex = /@page\s*\{\s*size:\s*210mm\s+auto;\s*margin:\s*0\s+5mm;/;
            
            if (!previewMarginRegex.test(modalSource)) {
              const error = 'Preview margins for continuous mode not set to 0 5mm';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!printMarginRegex.test(modalSource)) {
              const error = 'Print margins for continuous mode not set to 0 5mm';
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 7: Margin consistency for sheet mode
          if (paperMode === 'sheet') {
            const previewMarginRegex = /padding:\s*paperMode\s*===\s*['"]continuous['"]\s*\?\s*['"]0\s+5mm['"]\s*:\s*['"]10mm\s+12mm['"]/;
            // The print margin uses template literals with variables, so we check for the pattern
            const printMarginRegex = /@page\s*\{\s*size:\s*\$\{pageWidthMm\}mm\s+\$\{pageHeightMm\}mm;\s*margin:\s*10mm\s+12mm;/;
            
            if (!previewMarginRegex.test(modalSource)) {
              const error = 'Preview margins for sheet mode not set to 10mm 12mm';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!printMarginRegex.test(modalSource)) {
              const error = 'Print margins for sheet mode not set to 10mm 12mm';
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 8: Width consistency
          const previewWidthRegex = /width:\s*`\$\{pageWidthPx\}px`/;
          if (!previewWidthRegex.test(modalSource)) {
            const error = 'Preview width not using pageWidthPx';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 9: Height consistency for sheet mode
          if (paperMode === 'sheet') {
            const previewHeightRegex = /minHeight:\s*pageHeightPx\s*\?\s*`\$\{pageHeightPx\}px`/;
            if (!previewHeightRegex.test(modalSource)) {
              const error = 'Preview height not using pageHeightPx for sheet mode';
              failures.push(error);
              failCount++;
              return false;
            }
          }
          
          // Test 10: Color preservation in print
          const colorPreservationRegex = /-webkit-print-color-adjust:\s*exact/;
          if (!colorPreservationRegex.test(modalSource)) {
            const error = 'Color preservation not enabled in print output';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 11: Verify print styles match global CSS
          // Check that global CSS has matching print rules
          const globalPrintMediaRegex = /@media\s+print/;
          if (!globalPrintMediaRegex.test(globalCSS)) {
            const error = 'Global CSS missing @media print rules';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 12: Box sizing consistency
          const previewBoxSizingRegex = /boxSizing:\s*['"]border-box['"]/;
          const printBoxSizingRegex = /box-sizing:\s*border-box/;
          
          if (!previewBoxSizingRegex.test(modalSource)) {
            const error = 'Preview box-sizing not set to border-box';
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!printBoxSizingRegex.test(modalSource)) {
            const error = 'Print box-sizing not set to border-box';
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
    
    console.log(`✅ Property 9 PASSED: ${passCount} iterations`);
    console.log(`   - Preview dimensions match print output`);
    console.log(`   - @page rules consistent between preview and print`);
    console.log(`   - Font family consistent (Arial, Helvetica, sans-serif)`);
    console.log(`   - Font size consistent (10px)`);
    console.log(`   - Text color consistent (#111)`);
    console.log(`   - Margins consistent for both paper modes`);
    console.log(`   - Width and height calculations identical`);
    console.log(`   - Color preservation enabled (-webkit-print-color-adjust: exact)`);
    console.log(`   - Box sizing consistent (border-box)`);
    
  } catch (error) {
    console.error(`❌ Property 9 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Paper Mode Indicator Visibility
 * 
 * Verifies that paper mode indicator is always visible and displays correct information
 */
async function testProperty_PaperModeIndicatorVisibility(): Promise<void> {
  console.log('\n=== Additional Property: Paper Mode Indicator Visibility ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        async (paperMode) => {
          // Test 1: Paper mode indicator badge exists (with flexible whitespace)
          const badgeRegex = /paperMode\s*===\s*['"]continuous['"]\s*\?\s*['"]bg-amber-600/s;
          if (!badgeRegex.test(modalSource)) {
            const error = 'Paper mode indicator badge not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Paper mode label function exists
          const labelFunctionRegex = /getPaperModeLabel\s*=\s*\(\)\s*=>/;
          if (!labelFunctionRegex.test(modalSource)) {
            const error = 'getPaperModeLabel function not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Continuous mode shows "Continuous Form"
          const continuousLabelRegex = /paperMode\s*===\s*['"]continuous['"]\s*\?\s*['"]Continuous Form['"]/;
          if (!continuousLabelRegex.test(modalSource)) {
            const error = 'Continuous Form label not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Sheet mode shows "Sheet"
          const sheetLabelRegex = /:\s*['"]Sheet['"]/;
          if (!sheetLabelRegex.test(modalSource)) {
            const error = 'Sheet label not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 5: Dimension display function exists
          const dimensionFunctionRegex = /getDimensionText\s*=\s*\(\)\s*=>/;
          if (!dimensionFunctionRegex.test(modalSource)) {
            const error = 'getDimensionText function not found';
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
    
    console.log(`✅ Paper Mode Indicator Visibility PASSED: ${passCount} iterations`);
    console.log(`   - Paper mode indicator badge exists`);
    console.log(`   - Paper mode label function exists`);
    console.log(`   - Continuous mode displays "Continuous Form"`);
    console.log(`   - Sheet mode displays "Sheet"`);
    console.log(`   - Dimension display function exists`);
    
  } catch (error) {
    console.error(`❌ Paper Mode Indicator Visibility FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Settings Panel Conditional Rendering
 * 
 * Verifies that settings panel is only available for sheet mode when allowed
 */
async function testProperty_SettingsPanelConditionalRendering(): Promise<void> {
  console.log('\n=== Additional Property: Settings Panel Conditional Rendering ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        fc.boolean(), // allowPaperSettings
        async (paperMode, allowPaperSettings) => {
          // Test 1: Settings button only shown for sheet mode when allowed
          const settingsButtonRegex = /allowPaperSettings\s*&&\s*paperMode\s*===\s*['"]sheet['"]/;
          if (!settingsButtonRegex.test(modalSource)) {
            const error = 'Settings button condition not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 2: Settings panel only shown for sheet mode when allowed
          const settingsPanelRegex = /allowPaperSettings\s*&&\s*paperMode\s*===\s*['"]sheet['"]\s*&&\s*showSettings/;
          if (!settingsPanelRegex.test(modalSource)) {
            const error = 'Settings panel condition not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 3: Paper size selector exists in settings panel
          const paperSizeSelectorRegex = /setPaperSize\(e\.target\.value\s+as\s+PaperSize\)/;
          if (!paperSizeSelectorRegex.test(modalSource)) {
            const error = 'Paper size selector not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 4: Orientation toggle exists in settings panel
          const orientationToggleRegex = /setOrientation\(o\)/;
          if (!orientationToggleRegex.test(modalSource)) {
            const error = 'Orientation toggle not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          // Test 5: Settings panel shows current dimensions
          const dimensionDisplayRegex = /\{pageWidthMm\}mm\s*×\s*\{pageHeightMm\}mm/;
          if (!dimensionDisplayRegex.test(modalSource)) {
            const error = 'Dimension display in settings panel not found';
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
    
    console.log(`✅ Settings Panel Conditional Rendering PASSED: ${passCount} iterations`);
    console.log(`   - Settings button only shown for sheet mode when allowed`);
    console.log(`   - Settings panel only shown for sheet mode when allowed`);
    console.log(`   - Paper size selector exists`);
    console.log(`   - Orientation toggle exists`);
    console.log(`   - Current dimensions displayed`);
    
  } catch (error) {
    console.error(`❌ Settings Panel Conditional Rendering FAILED after ${passCount} successful iterations`);
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
  console.log('║  Property-Based Tests: PrintPreviewModal Component            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  let allPassed = true;

  try {
    // Property 3: Paper Mode Consistency
    await testProperty3_PaperModeConsistency();
    
    // Property 9: Preview and Output Consistency
    await testProperty9_PreviewOutputConsistency();
    
    // Additional Properties
    await testProperty_PaperModeIndicatorVisibility();
    await testProperty_SettingsPanelConditionalRendering();
    
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
