/**
 * Property-Based Tests for Invoice Calculations
 * Feature: detailed-invoice-payment-reports
 * Property 3: Invoice Summary Calculation Correctness
 */

import fc from 'fast-check';
import { calculateInvoiceSummary } from '@/lib/report-utils';

describe('Property 3: Invoice Summary Calculation Correctness', () => {
  const invoiceGenerator = fc.record({
    name: fc.string({ minLength: 5, maxLength: 20 }),
    customer: fc.string({ minLength: 3, maxLength: 30 }),
    posting_date: fc.date().map(d => d.toISOString().split('T')[0]),
    status: fc.constantFrom('Draft', 'Submitted', 'Paid', 'Unpaid', 'Cancelled'),
    grand_total: fc.float({ min: 100, max: 1000000, noNaN: true }),
    docstatus: fc.integer({ min: 0, max: 2 })
  });

  it('should calculate count correctly for any set of invoices', () => {
    fc.assert(
      fc.property(
        fc.array(invoiceGenerator),
        (invoices) => {
          const summary = calculateInvoiceSummary(invoices);
          expect(summary.count).toBe(invoices.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate total correctly for any set of invoices', () => {
    fc.assert(
      fc.property(
        fc.array(invoiceGenerator),
        (invoices) => {
          const summary = calculateInvoiceSummary(invoices);
          const expectedTotal = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
          expect(Math.abs(summary.total - expectedTotal)).toBeLessThan(0.01);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate average correctly for any set of invoices', () => {
    fc.assert(
      fc.property(
        fc.array(invoiceGenerator),
        (invoices) => {
          const summary = calculateInvoiceSummary(invoices);
          const expectedAvg = invoices.length > 0 ? summary.total / invoices.length : 0;
          expect(Math.abs(summary.average - expectedAvg)).toBeLessThan(0.01);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty invoice array', () => {
    const summary = calculateInvoiceSummary([]);
    expect(summary.count).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.average).toBe(0);
  });

  it('should handle single invoice', () => {
    fc.assert(
      fc.property(
        invoiceGenerator,
        (invoice) => {
          const summary = calculateInvoiceSummary([invoice]);
          expect(summary.count).toBe(1);
          expect(Math.abs(summary.total - invoice.grand_total)).toBeLessThan(0.01);
          expect(Math.abs(summary.average - invoice.grand_total)).toBeLessThan(0.01);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

export {};
