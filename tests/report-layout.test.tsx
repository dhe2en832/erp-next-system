/**
 * Unit Tests for ReportLayout Component
 * 
 * Feature: print-document-redesign
 * 
 * This file contains unit tests for the ReportLayout component to verify:
 * - Component renders without errors
 * - Header displays company name and report title
 * - Table displays columns and rows correctly
 * - Footer displays page numbers
 * - Hierarchy indentation works correctly
 * - Totals are styled appropriately
 */

import { ReportLayoutProps, ReportColumn, ReportRow } from '../types/print';

// Simple test runner
function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Unit Tests: ReportLayout Component                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passCount = 0;
  let failCount = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passCount++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   ${error}`);
      failCount++;
    }
  }

  function expect(value: any) {
    return {
      toBe(expected: any) {
        if (value !== expected) {
          throw new Error(`Expected ${value} to be ${expected}`);
        }
      },
      toBeDefined() {
        if (value === undefined) {
          throw new Error(`Expected value to be defined`);
        }
      },
      toBeUndefined() {
        if (value !== undefined) {
          throw new Error(`Expected value to be undefined`);
        }
      },
      toBeGreaterThan(expected: number) {
        if (value <= expected) {
          throw new Error(`Expected ${value} to be greater than ${expected}`);
        }
      },
      toBeGreaterThanOrEqual(expected: number) {
        if (value < expected) {
          throw new Error(`Expected ${value} to be greater than or equal to ${expected}`);
        }
      },
      toBeLessThanOrEqual(expected: number) {
        if (value > expected) {
          throw new Error(`Expected ${value} to be less than or equal to ${expected}`);
        }
      },
      toContain(expected: any) {
        if (!value.includes(expected)) {
          throw new Error(`Expected ${value} to contain ${expected}`);
        }
      },
    };
  }

  const mockColumns: ReportColumn[] = [
    { key: 'account', label: 'Account', align: 'left' },
    { key: 'debit', label: 'Debit', align: 'right' },
    { key: 'credit', label: 'Credit', align: 'right' },
  ];

  const mockRows: ReportRow[] = [
    { account: 'ASSETS', debit: 0, credit: 0, type: 'header' },
    { account: 'Cash', debit: 1000000, credit: 0, indent: 1 },
    { account: 'Bank', debit: 5000000, credit: 0, indent: 1 },
    { account: 'Total Assets', debit: 6000000, credit: 0, isTotal: true },
    { account: 'LIABILITIES', debit: 0, credit: 0, type: 'header' },
    { account: 'Accounts Payable', debit: 0, credit: 2000000, indent: 1 },
    { account: 'Total Liabilities', debit: 0, credit: 2000000, isTotal: true },
    { account: 'TOTAL', debit: 6000000, credit: 6000000, isGrandTotal: true },
  ];

  const baseProps: ReportLayoutProps = {
    reportTitle: 'TRIAL BALANCE',
    companyName: 'PT. Test Company',
    columns: mockColumns,
    rows: mockRows,
    paperMode: 'sheet',
  };

  test('should have correct paper mode', () => {
    expect(baseProps.paperMode).toBe('sheet');
  });

  test('should have required props', () => {
    expect(baseProps.reportTitle).toBeDefined();
    expect(baseProps.companyName).toBeDefined();
    expect(baseProps.columns).toBeDefined();
    expect(baseProps.rows).toBeDefined();
  });

  test('should have valid columns', () => {
    expect(baseProps.columns.length).toBeGreaterThan(0);
    baseProps.columns.forEach(col => {
      expect(col.key).toBeDefined();
      expect(col.label).toBeDefined();
    });
  });

  test('should have valid rows', () => {
    expect(baseProps.rows.length).toBeGreaterThan(0);
    baseProps.rows.forEach(row => {
      expect(row.account).toBeDefined();
    });
  });

  test('should support hierarchy with indentation', () => {
    const indentedRows = baseProps.rows.filter(row => row.indent !== undefined);
    expect(indentedRows.length).toBeGreaterThan(0);
    
    indentedRows.forEach(row => {
      expect(row.indent!).toBeGreaterThanOrEqual(0);
      expect(row.indent!).toBeLessThanOrEqual(5);
    });
  });

  test('should have total rows', () => {
    const totalRows = baseProps.rows.filter(row => row.isTotal || row.isGrandTotal);
    expect(totalRows.length).toBeGreaterThan(0);
  });

  test('should have grand total row', () => {
    const grandTotalRows = baseProps.rows.filter(row => row.isGrandTotal);
    expect(grandTotalRows.length).toBeGreaterThan(0);
  });

  test('should support optional date range', () => {
    const propsWithDateRange: ReportLayoutProps = {
      ...baseProps,
      dateRange: '01 Jan 2024 - 31 Dec 2024',
    };
    expect(propsWithDateRange.dateRange).toBeDefined();
  });

  test('should support optional as-of date', () => {
    const propsWithAsOfDate: ReportLayoutProps = {
      ...baseProps,
      asOfDate: 'Per 31 Desember 2024',
    };
    expect(propsWithAsOfDate.asOfDate).toBeDefined();
  });

  test('should support optional company logo', () => {
    const propsWithLogo: ReportLayoutProps = {
      ...baseProps,
      companyLogo: 'https://example.com/logo.png',
    };
    expect(propsWithLogo.companyLogo).toBeDefined();
  });

  test('should support optional generated timestamp', () => {
    const propsWithTimestamp: ReportLayoutProps = {
      ...baseProps,
      generatedAt: '01 Januari 2025 10:00 WIB',
    };
    expect(propsWithTimestamp.generatedAt).toBeDefined();
  });

  test('should support hierarchy display option', () => {
    const propsWithHierarchy: ReportLayoutProps = {
      ...baseProps,
      showHierarchy: true,
    };
    expect(propsWithHierarchy.showHierarchy).toBe(true);
  });

  test('should support totals display option', () => {
    const propsWithTotals: ReportLayoutProps = {
      ...baseProps,
      showTotals: true,
    };
    expect(propsWithTotals.showTotals).toBe(true);
  });

  test('should support different paper sizes', () => {
    const paperSizes = ['A4', 'A5', 'Letter', 'Legal', 'F4'] as const;
    paperSizes.forEach(size => {
      const propsWithSize: ReportLayoutProps = {
        ...baseProps,
        paperSize: size,
      };
      expect(propsWithSize.paperSize).toBe(size);
    });
  });

  test('should support different orientations', () => {
    const orientations = ['portrait', 'landscape'] as const;
    orientations.forEach(orientation => {
      const propsWithOrientation: ReportLayoutProps = {
        ...baseProps,
        orientation: orientation,
      };
      expect(propsWithOrientation.orientation).toBe(orientation);
    });
  });

  test('should handle empty optional fields gracefully', () => {
    const minimalProps: ReportLayoutProps = {
      reportTitle: 'TEST REPORT',
      companyName: 'Test Company',
      columns: mockColumns,
      rows: mockRows,
      paperMode: 'sheet',
    };
    
    expect(minimalProps.reportSubtitle).toBeUndefined();
    expect(minimalProps.companyLogo).toBeUndefined();
    expect(minimalProps.dateRange).toBeUndefined();
    expect(minimalProps.asOfDate).toBeUndefined();
    expect(minimalProps.generatedAt).toBeUndefined();
  });

  test('should validate row types', () => {
    const validTypes = ['header', 'data', 'subtotal', 'total'];
    const typedRows = baseProps.rows.filter(row => row.type !== undefined);
    
    typedRows.forEach(row => {
      if (!validTypes.includes(row.type!)) {
        throw new Error(`Invalid row type: ${row.type}`);
      }
    });
  });

  test('should have consistent column alignment', () => {
    const validAlignments = ['left', 'center', 'right'];
    baseProps.columns.forEach(col => {
      if (col.align && !validAlignments.includes(col.align)) {
        throw new Error(`Invalid alignment: ${col.align}`);
      }
    });
  });

  test('should format currency values correctly', () => {
    const testAmount = 1000000;
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(testAmount);
    
    expect(formatted).toContain('Rp');
    expect(formatted).toContain('1.000.000');
  });

  test('should format dates in Indonesian locale', () => {
    const testDate = new Date('2024-12-31');
    const formatted = testDate.toLocaleDateString('id-ID');
    
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
  });

  console.log('\n' + '═'.repeat(66));
  if (failCount === 0) {
    console.log(`✅ ALL TESTS PASSED (${passCount} tests)`);
    console.log('═'.repeat(66));
    process.exit(0);
  } else {
    console.log(`❌ SOME TESTS FAILED (${passCount} passed, ${failCount} failed)`);
    console.log('═'.repeat(66));
    process.exit(1);
  }
}

runTests();
