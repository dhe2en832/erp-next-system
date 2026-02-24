/**
 * Property-Based Tests for Print CSS Rules
 * 
 * Feature: print-document-redesign
 * 
 * This file contains property tests for:
 * - Property 10: Print Media Query Application
 * 
 * **Validates: Requirements 8.1-8.10**
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the actual CSS from globals.css once at module level
const cssPath = path.join(__dirname, '../app/globals.css');
const globalCSS = fs.readFileSync(cssPath, 'utf-8');

/**
 * Property 10: Print Media Query Application
 * 
 * **Validates: Requirements 8.1-8.10**
 * 
 * For any document, when rendering for print, THE Print_System SHALL apply 
 * print-specific CSS media queries that hide UI controls, preserve backgrounds, 
 * and set appropriate page margins.
 */
async function testProperty10_PrintMediaQueryApplication(): Promise<void> {
  console.log('\n=== Property 10: Print Media Query Application ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('continuous' as const, 'sheet' as const),
        fc.constantFrom(
          'document-header',
          'document-metadata',
          'item-row',
          'totals-section',
          'signature-section',
          'document-footer',
          'notes-section',
          'report-header',
          'report-footer',
          'account-group'
        ),
        async (paperMode, criticalSection) => {
          // Test 1: @media print rules apply correctly
          const printMediaRegex = /@media\s+print\s*\{/;
          if (!printMediaRegex.test(globalCSS)) {
            const error = '@media print rules not found in CSS';
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 2: Page breaks are prevented in critical sections
          const pageBreakRegex = new RegExp(`\\.${criticalSection}\\s*\\{[^}]*page-break-inside:\\s*avoid`, 's');
          const breakInsideRegex = new RegExp(`\\.${criticalSection}\\s*\\{[^}]*break-inside:\\s*avoid`, 's');
          
          if (!pageBreakRegex.test(globalCSS) && !breakInsideRegex.test(globalCSS)) {
            const error = `Page break prevention not found for .${criticalSection}`;
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 3: Color preservation with -webkit-print-color-adjust: exact
          const colorAdjustRegex = /-webkit-print-color-adjust:\s*exact/;
          const printColorAdjustRegex = /print-color-adjust:\s*exact/;
          
          if (!colorAdjustRegex.test(globalCSS) || !printColorAdjustRegex.test(globalCSS)) {
            const error = 'Color preservation rules not found';
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 4: UI controls are hidden when printing
          const uiControlsHidden = [
            'button',
            '.button',
            'nav',
            '.navigation',
            '.toolbar',
            '.controls',
            '.no-print'
          ];

          for (const control of uiControlsHidden) {
            const escapedControl = control.replace('.', '\\.');
            const hiddenRegex = new RegExp(`${escapedControl}[^}]*display:\\s*none\\s*!important`, 's');
            
            if (!hiddenRegex.test(globalCSS)) {
              const error = `UI control ${control} not hidden in print CSS`;
              failures.push(error);
              failCount++;
              return false;
            }
          }

          // Test 5: Text is dark for clear printing
          const darkTextRegex = /\*\s*\{[^}]*color:\s*#111\s*!important/s;
          if (!darkTextRegex.test(globalCSS)) {
            const error = 'Dark text rule not found for print';
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 6: Web-safe fonts are used
          const fontFamilyRegex = /font-family:\s*Arial,\s*Helvetica,\s*sans-serif/;
          if (!fontFamilyRegex.test(globalCSS)) {
            const error = 'Web-safe fonts not specified';
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 7: @page rules for continuous mode
          if (paperMode === 'continuous') {
            const continuousPageRegex = /@page\s+continuous\s*\{[^}]*size:\s*210mm\s+auto/s;
            const continuousMarginRegex = /@page\s+continuous\s*\{[^}]*margin:\s*0\s+5mm/s;
            
            if (!continuousPageRegex.test(globalCSS)) {
              const error = '@page continuous size rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!continuousMarginRegex.test(globalCSS)) {
              const error = '@page continuous margin rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
          }

          // Test 8: @page rules for sheet mode
          if (paperMode === 'sheet') {
            const sheetPageRegex = /@page\s+sheet\s*\{[^}]*size:\s*A4\s+portrait/s;
            const sheetMarginRegex = /@page\s+sheet\s*\{[^}]*margin:\s*10mm\s+12mm/s;
            
            if (!sheetPageRegex.test(globalCSS)) {
              const error = '@page sheet size rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!sheetMarginRegex.test(globalCSS)) {
              const error = '@page sheet margin rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
          }

          // Test 9: Continuous mode styles
          if (paperMode === 'continuous') {
            const continuousModeRegex = /\.continuous-mode\s*\{[^}]*width:\s*210mm/s;
            const noBreakRegex = /\.continuous-mode\s+\.no-break\s*\{[^}]*page-break-inside:\s*avoid/s;
            
            if (!continuousModeRegex.test(globalCSS)) {
              const error = '.continuous-mode width rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!noBreakRegex.test(globalCSS)) {
              const error = '.continuous-mode .no-break rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
          }

          // Test 10: Sheet mode styles
          if (paperMode === 'sheet') {
            const sheetModeWidthRegex = /\.sheet-mode\s*\{[^}]*width:\s*210mm/s;
            const sheetModeHeightRegex = /\.sheet-mode\s*\{[^}]*height:\s*297mm/s;
            const pageBreakRegex = /\.sheet-mode\s+\.page-break\s*\{[^}]*page-break-after:\s*always/s;
            
            if (!sheetModeWidthRegex.test(globalCSS)) {
              const error = '.sheet-mode width rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!sheetModeHeightRegex.test(globalCSS)) {
              const error = '.sheet-mode height rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!pageBreakRegex.test(globalCSS)) {
              const error = '.sheet-mode .page-break rule not found';
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
    
    console.log(`✅ Property 10 PASSED: ${passCount} iterations`);
    console.log(`   - @media print rules apply correctly`);
    console.log(`   - Page breaks prevented in critical sections`);
    console.log(`   - Color preservation with -webkit-print-color-adjust: exact`);
    console.log(`   - UI controls hidden when printing`);
    console.log(`   - Text is dark for clear printing`);
    console.log(`   - Web-safe fonts used (Arial, Helvetica)`);
    console.log(`   - @page rules for continuous and sheet modes`);
    console.log(`   - Continuous mode: 210mm width, auto height`);
    console.log(`   - Sheet mode: 210mm × 297mm (A4)`);
    
  } catch (error) {
    console.error(`❌ Property 10 FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Print Table Styles
 * 
 * Verifies that print table styles are correctly defined
 */
async function testProperty_PrintTableStyles(): Promise<void> {
  console.log('\n=== Additional Property: Print Table Styles ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('print-table', 'print-table-borderless', 'print-table-compact'),
        async (tableClass) => {
          // Test 1: Print table base styles
          if (tableClass === 'print-table') {
            const tableRegex = /\.print-table\s*\{[^}]*width:\s*100%/s;
            const borderCollapseRegex = /\.print-table\s*\{[^}]*border-collapse:\s*collapse/s;
            
            if (!tableRegex.test(globalCSS)) {
              const error = '.print-table width rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
            
            if (!borderCollapseRegex.test(globalCSS)) {
              const error = '.print-table border-collapse rule not found';
              failures.push(error);
              failCount++;
              return false;
            }
          }

          // Test 2: Print table cell styles
          const cellBorderRegex = /\.print-table\s+(th|td)[^}]*border:\s*1px\s+solid/s;
          const cellPaddingRegex = /\.print-table\s+(th|td)[^}]*padding:\s*4px\s+6px/s;
          
          if (!cellBorderRegex.test(globalCSS)) {
            const error = '.print-table cell border rule not found';
            failures.push(error);
            failCount++;
            return false;
          }
          
          if (!cellPaddingRegex.test(globalCSS)) {
            const error = '.print-table cell padding rule not found';
            failures.push(error);
            failCount++;
            return false;
          }

          // Test 3: Table row page break prevention
          const rowBreakRegex = /\.print-table\s+tbody\s+tr\s*\{[^}]*page-break-inside:\s*avoid/s;
          if (!rowBreakRegex.test(globalCSS)) {
            const error = '.print-table tbody tr page-break rule not found';
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
    
    console.log(`✅ Print Table Styles PASSED: ${passCount} iterations`);
    console.log(`   - Table width: 100%`);
    console.log(`   - Border collapse: collapse`);
    console.log(`   - Cell borders and padding defined`);
    console.log(`   - Row page breaks prevented`);
    
  } catch (error) {
    console.error(`❌ Print Table Styles FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: Critical Section Page Break Prevention
 * 
 * Verifies that all critical sections have page break prevention
 */
async function testProperty_CriticalSectionPageBreaks(): Promise<void> {
  console.log('\n=== Additional Property: Critical Section Page Break Prevention ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  const criticalSections = [
    'totals-section',
    'signature-section',
    'item-row',
    'document-header',
    'document-metadata',
    'document-footer',
    'notes-section',
    'report-header',
    'report-footer',
    'account-group'
  ];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...criticalSections),
        async (section) => {
          // Check for page-break-inside: avoid
          const pageBreakInsideRegex = new RegExp(`\\.${section}\\s*\\{[^}]*page-break-inside:\\s*avoid`, 's');
          const breakInsideRegex = new RegExp(`\\.${section}\\s*\\{[^}]*break-inside:\\s*avoid`, 's');
          
          if (!pageBreakInsideRegex.test(globalCSS) && !breakInsideRegex.test(globalCSS)) {
            const error = `Page break prevention not found for .${section}`;
            failures.push(error);
            failCount++;
            return false;
          }

          // Special checks for header and footer sections
          if (section === 'document-header' || section === 'report-header') {
            const pageBreakAfterRegex = new RegExp(`\\.${section}\\s*\\{[^}]*page-break-after:\\s*avoid`, 's');
            const breakAfterRegex = new RegExp(`\\.${section}\\s*\\{[^}]*break-after:\\s*avoid`, 's');
            
            if (!pageBreakAfterRegex.test(globalCSS) && !breakAfterRegex.test(globalCSS)) {
              const error = `Page break after prevention not found for .${section}`;
              failures.push(error);
              failCount++;
              return false;
            }
          }

          if (section === 'document-footer' || section === 'report-footer') {
            const pageBreakBeforeRegex = new RegExp(`\\.${section}\\s*\\{[^}]*page-break-before:\\s*avoid`, 's');
            const breakBeforeRegex = new RegExp(`\\.${section}\\s*\\{[^}]*break-before:\\s*avoid`, 's');
            
            if (!pageBreakBeforeRegex.test(globalCSS) && !breakBeforeRegex.test(globalCSS)) {
              const error = `Page break before prevention not found for .${section}`;
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
    
    console.log(`✅ Critical Section Page Break Prevention PASSED: ${passCount} iterations`);
    console.log(`   - All critical sections have page-break-inside: avoid`);
    console.log(`   - Headers have page-break-after: avoid`);
    console.log(`   - Footers have page-break-before: avoid`);
    
  } catch (error) {
    console.error(`❌ Critical Section Page Break Prevention FAILED after ${passCount} successful iterations`);
    console.error(`   Failed iterations: ${failCount}`);
    if (failures.length > 0) {
      console.error(`   First failure: ${failures[0]}`);
    }
    throw error;
  }
}

/**
 * Additional Property: UI Controls Hidden in Print
 * 
 * Verifies that all UI controls are hidden when printing
 */
async function testProperty_UIControlsHidden(): Promise<void> {
  console.log('\n=== Additional Property: UI Controls Hidden in Print ===');
  
  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  const uiControls = [
    'button',
    '.button',
    'nav',
    '.navigation',
    '.toolbar',
    '.controls',
    '.modal-overlay',
    '.modal-header',
    'input[type="button"]',
    'input[type="submit"]',
    '.action-button',
    '.edit-button',
    '.delete-button',
    '.no-print'
  ];

  try {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...uiControls),
        async (control) => {
          // Escape special characters for regex
          const escapedControl = control.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Check for display: none !important
          const hiddenRegex = new RegExp(`${escapedControl}[^}]*display:\\s*none\\s*!important`, 's');
          
          if (!hiddenRegex.test(globalCSS)) {
            const error = `UI control ${control} not hidden in print CSS`;
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
    
    console.log(`✅ UI Controls Hidden PASSED: ${passCount} iterations`);
    console.log(`   - All UI controls have display: none !important`);
    console.log(`   - Buttons, navigation, toolbars hidden`);
    console.log(`   - Modal overlays and headers hidden`);
    console.log(`   - Action buttons hidden`);
    
  } catch (error) {
    console.error(`❌ UI Controls Hidden FAILED after ${passCount} successful iterations`);
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
  console.log('║  Property-Based Tests: Print CSS Rules                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  let allPassed = true;

  try {
    // Property 10: Print Media Query Application
    await testProperty10_PrintMediaQueryApplication();
    
    // Additional Properties
    await testProperty_PrintTableStyles();
    await testProperty_CriticalSectionPageBreaks();
    await testProperty_UIControlsHidden();
    
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
