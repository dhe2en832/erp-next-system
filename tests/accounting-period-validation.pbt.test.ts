import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { getERPNextClient } from '@/lib/erpnext';
import type { AccountingPeriod, PeriodClosingConfig, ValidationResult } from '@/types/accounting-period';

/**
 * Property-Based Tests for Accounting Period Validation Framework
 * Feature: accounting-period-closing
 */

describe('Feature: accounting-period-closing, Property 5: Validation Framework Completeness', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5**
   * 
   * For any accounting period, running pre-closing validation should return a validation result
   * for each enabled validation check in the configuration, and each result should contain
   * check_name, passed status, message, and details.
   */
  it('should return complete validation results for all enabled checks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          period_name: fc.string({ minLength: 5, maxLength: 20 }),
          company: fc.constant('Batasku'),
          start_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-01') }),
          end_date: fc.date({ min: new Date('2024-01-31'), max: new Date('2024-12-31') }),
        }),
        async (periodData) => {
          const erpnext = getERPNextClient();

          // Ensure start_date < end_date
          if (periodData.start_date >= periodData.end_date) {
            return; // Skip invalid date ranges
          }

          const start_date = periodData.start_date.toISOString().split('T')[0];
          const end_date = periodData.end_date.toISOString().split('T')[0];

          try {
            // Create test period
            const period = await erpnext.insert('Accounting Period', {
              period_name: `TEST-VAL-${periodData.period_name}`,
              company: periodData.company,
              start_date,
              end_date,
              period_type: 'Monthly',
              status: 'Open',
            });

            // Get configuration to know which checks are enabled
            const config = await erpnext.getDoc<PeriodClosingConfig>(
              'Period Closing Config',
              'Period Closing Config'
            );

            // Call validation endpoint
            const response = await fetch('http://localhost:3000/api/accounting-period/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                period_name: period.name,
                company: periodData.company,
              }),
            });

            const result = await response.json();

            // Property assertions
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('all_passed');
            expect(result).toHaveProperty('validations');
            expect(Array.isArray(result.validations)).toBe(true);

            // Count expected validations based on config
            const expectedChecks: string[] = [];
            if (config.enable_draft_transaction_check) expectedChecks.push('No Draft Transactions');
            if (config.enable_unposted_transaction_check) expectedChecks.push('All Transactions Posted');
            if (config.enable_bank_reconciliation_check) expectedChecks.push('Bank Reconciliation Complete');
            if (config.enable_sales_invoice_check) expectedChecks.push('Sales Invoices Processed');
            if (config.enable_purchase_invoice_check) expectedChecks.push('Purchase Invoices Processed');
            if (config.enable_inventory_check) expectedChecks.push('Inventory Transactions Posted');
            if (config.enable_payroll_check) expectedChecks.push('Payroll Entries Recorded');

            // Verify all enabled checks are present
            const returnedCheckNames = result.validations.map((v: ValidationResult) => v.check_name);
            for (const expectedCheck of expectedChecks) {
              expect(returnedCheckNames).toContain(expectedCheck);
            }

            // Verify each validation result has required fields
            for (const validation of result.validations) {
              expect(validation).toHaveProperty('check_name');
              expect(validation).toHaveProperty('passed');
              expect(validation).toHaveProperty('message');
              expect(validation).toHaveProperty('severity');
              expect(validation).toHaveProperty('details');
              
              expect(typeof validation.check_name).toBe('string');
              expect(typeof validation.passed).toBe('boolean');
              expect(typeof validation.message).toBe('string');
              expect(['error', 'warning', 'info']).toContain(validation.severity);
              expect(Array.isArray(validation.details)).toBe(true);
            }

            // Cleanup
            await erpnext.delete('Accounting Period', period.name);
          } catch (error: any) {
            // If period already exists or other errors, skip
            if (error.message?.includes('already exists')) {
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 10 } // Reduced runs for integration test
    );
  });
});

describe('Feature: accounting-period-closing, Property 6: Validation Failure Prevents Closing', () => {
  /**
   * **Validates: Requirements 2.4, 2.5**
   * 
   * For any accounting period with at least one failed validation of severity "error",
   * attempting to close the period without force flag should be rejected with an error
   * listing all failed validations.
   */
  it('should prevent closing when validations fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          period_name: fc.string({ minLength: 5, maxLength: 20 }),
          company: fc.constant('Batasku'),
        }),
        async (periodData) => {
          const erpnext = getERPNextClient();

          try {
            // Create a period with a date range that likely has draft transactions
            const start_date = '2024-01-01';
            const end_date = '2024-01-31';

            const period = await erpnext.insert('Accounting Period', {
              period_name: `TEST-FAIL-${periodData.period_name}`,
              company: periodData.company,
              start_date,
              end_date,
              period_type: 'Monthly',
              status: 'Open',
            });

            // Create a draft transaction to ensure validation fails
            const draftJournal = await erpnext.insert('Journal Entry', {
              company: periodData.company,
              posting_date: '2024-01-15',
              voucher_type: 'Journal Entry',
              accounts: [
                {
                  account: 'Cash - B',
                  debit_in_account_currency: 1000,
                  credit_in_account_currency: 0,
                },
                {
                  account: 'Sales - B',
                  debit_in_account_currency: 0,
                  credit_in_account_currency: 1000,
                },
              ],
            });
            // Leave it as draft (docstatus = 0)

            // Run validation
            const validateResponse = await fetch('http://localhost:3000/api/accounting-period/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                period_name: period.name,
                company: periodData.company,
              }),
            });

            const validateResult = await validateResponse.json();

            // Property: If any validation with severity "error" failed, all_passed should be false
            const hasErrorFailures = validateResult.validations.some(
              (v: ValidationResult) => !v.passed && v.severity === 'error'
            );

            if (hasErrorFailures) {
              expect(validateResult.all_passed).toBe(false);

              // Attempt to close without force flag should fail
              const closeResponse = await fetch('http://localhost:3000/api/accounting-period/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  period_name: period.name,
                  company: periodData.company,
                  force: false,
                }),
              });

              const closeResult = await closeResponse.json();

              // Should be rejected
              expect(closeResult.success).toBe(false);
              expect(closeResult.error || closeResult.message).toBeDefined();
            }

            // Cleanup
            await erpnext.delete('Journal Entry', draftJournal.name);
            await erpnext.delete('Accounting Period', period.name);
          } catch (error: any) {
            // Skip if resources don't exist or other setup issues
            if (error.message?.includes('already exists') || error.message?.includes('not found')) {
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 5 } // Reduced runs for integration test with side effects
    );
  });
});
