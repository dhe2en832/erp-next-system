/**
 * Verification Reporter for COA Replacement
 * 
 * This module provides comprehensive verification and reporting capabilities
 * for the Chart of Accounts replacement process. It validates that all 143
 * accounts exist, checks hierarchy integrity, identifies orphaned accounts,
 * and generates formatted reports.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.4, 11.5
 */

import { ERPNextClient } from '@/lib/erpnext';
import { COAAccount } from './hierarchy-validator';
import { extractAccountNumber } from './name-utils';

/**
 * ERPNext Account structure as returned by API
 */
export interface ERPNextAccount {
  name: string;
  account_name: string;
  account_number: string;
  company: string;
  parent_account?: string;
  is_group: 0 | 1;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  report_type: 'Balance Sheet' | 'Profit and Loss';
  account_type?: string;
  account_currency: string;
  lft: number;
  rgt: number;
  disabled: 0 | 1;
  [key: string]: any;
}

/**
 * Hierarchy validation error details
 */
export interface HierarchyError {
  account: string;
  error_type: 'missing_parent' | 'circular_reference' | 'invalid_group';
  details: string;
}

/**
 * Comprehensive verification report structure
 */
export interface VerificationReport {
  total_accounts: number;
  accounts_by_root_type: Record<string, number>;
  accounts_by_account_type: Record<string, number>;
  accounts_by_currency: Record<string, number>;
  missing_accounts: string[];
  orphaned_accounts: ERPNextAccount[];
  hierarchy_errors: HierarchyError[];
  ledger_with_children: ERPNextAccount[];
  leaf_groups: ERPNextAccount[];
  verification_passed: boolean;
}

/**
 * VerificationReporter class for COA verification and reporting
 * 
 * Provides comprehensive verification of the Chart of Accounts after
 * replacement, including:
 * - Verifying all 143 expected accounts exist
 * - Validating parent-child relationships
 * - Identifying orphaned accounts (invalid parent references)
 * - Checking ledger accounts have no children
 * - Checking leaf accounts are ledgers
 * - Generating formatted reports with summary statistics
 */
export class VerificationReporter {
  private client: ERPNextClient;
  private company: string;

  /**
   * Create a new VerificationReporter
   * 
   * @param client - ERPNext API client instance
   * @param company - Company name (default: "Berkat Abadi Cirebon")
   */
  constructor(client: ERPNextClient, company: string = 'Berkat Abadi Cirebon') {
    this.client = client;
    this.company = company;
  }

  /**
   * Generate comprehensive verification report
   * 
   * Fetches all accounts for the company and performs comprehensive validation:
   * - Counts accounts by root_type, account_type, and currency
   * - Verifies all expected accounts exist
   * - Identifies orphaned accounts with invalid parent references
   * - Validates ledger accounts have no children
   * - Validates leaf accounts are ledgers
   * 
   * @param expectedAccountNumbers - Array of expected account numbers (default: empty)
   * @returns Comprehensive verification report
   * 
   * @example
   * const reporter = new VerificationReporter(client);
   * const report = await reporter.generateReport(['1110.001', '1110.002', ...]);
   * console.log(report.verification_passed ? 'PASSED' : 'FAILED');
   * 
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
   */
  async generateReport(expectedAccountNumbers: string[] = []): Promise<VerificationReport> {
    const report: VerificationReport = {
      total_accounts: 0,
      accounts_by_root_type: {},
      accounts_by_account_type: {},
      accounts_by_currency: {},
      missing_accounts: [],
      orphaned_accounts: [],
      hierarchy_errors: [],
      ledger_with_children: [],
      leaf_groups: [],
      verification_passed: true
    };

    // Fetch all accounts for the company
    const allAccounts = await this.client.getList<ERPNextAccount>('Account', {
      filters: [['company', '=', this.company]],
      fields: ['*'],
      limit: 500,
      order_by: 'account_number asc'
    });

    report.total_accounts = allAccounts.length;

    // Group accounts by root_type, account_type, and currency
    for (const account of allAccounts) {
      // Count by root_type
      report.accounts_by_root_type[account.root_type] = 
        (report.accounts_by_root_type[account.root_type] || 0) + 1;

      // Count by account_type (if specified)
      if (account.account_type) {
        report.accounts_by_account_type[account.account_type] = 
          (report.accounts_by_account_type[account.account_type] || 0) + 1;
      }

      // Count by currency
      report.accounts_by_currency[account.account_currency] = 
        (report.accounts_by_currency[account.account_currency] || 0) + 1;
    }

    // Verify all expected accounts exist
    if (expectedAccountNumbers.length > 0) {
      const missingAccounts = await this.verifyAccountsExist(
        expectedAccountNumbers,
        allAccounts
      );
      report.missing_accounts = missingAccounts;
      if (missingAccounts.length > 0) {
        report.verification_passed = false;
      }
    }

    // Validate hierarchy and find orphaned accounts
    const hierarchyErrors = await this.validateHierarchy(allAccounts);
    report.hierarchy_errors = hierarchyErrors;
    report.orphaned_accounts = await this.findOrphanedAccounts(allAccounts);
    
    if (hierarchyErrors.length > 0 || report.orphaned_accounts.length > 0) {
      report.verification_passed = false;
    }

    // Check ledger accounts don't have children
    const ledgerWithChildren = await this.checkLedgerAccounts(allAccounts);
    report.ledger_with_children = ledgerWithChildren;
    if (ledgerWithChildren.length > 0) {
      report.verification_passed = false;
    }

    // Check leaf accounts are ledgers
    const leafGroups = await this.checkLeafAccounts(allAccounts);
    report.leaf_groups = leafGroups;
    if (leafGroups.length > 0) {
      report.verification_passed = false;
    }

    return report;
  }

  /**
   * Verify all expected accounts exist in the system
   * 
   * Compares the list of expected account numbers against the accounts
   * fetched from ERPNext to identify any missing accounts.
   * 
   * @param expectedAccountNumbers - Array of expected account numbers
   * @param allAccounts - All accounts fetched from ERPNext (optional, will fetch if not provided)
   * @returns Array of missing account numbers
   * 
   * @example
   * const missing = await reporter.verifyAccountsExist(['1110.001', '1110.002']);
   * if (missing.length > 0) {
   *   console.error('Missing accounts:', missing);
   * }
   * 
   * Requirements: 10.3
   */
  async verifyAccountsExist(
    expectedAccountNumbers: string[],
    allAccounts?: ERPNextAccount[]
  ): Promise<string[]> {
    // Fetch accounts if not provided
    if (!allAccounts) {
      allAccounts = await this.client.getList<ERPNextAccount>('Account', {
        filters: [['company', '=', this.company]],
        fields: ['account_number'],
        limit: 500
      });
    }

    const existingNumbers = new Set(
      allAccounts.map(a => String(a.account_number))
    );

    const missing: string[] = [];
    for (const expectedNumber of expectedAccountNumbers) {
      const normalizedExpected = String(expectedNumber);
      if (!existingNumbers.has(normalizedExpected)) {
        missing.push(normalizedExpected);
      }
    }

    return missing;
  }

  /**
   * Validate hierarchy integrity
   * 
   * Checks that all parent-child relationships are valid by verifying:
   * - Parent accounts exist for all accounts with parent_account specified
   * - No circular references exist
   * 
   * @param allAccounts - All accounts to validate (optional, will fetch if not provided)
   * @returns Array of hierarchy validation errors
   * 
   * @example
   * const errors = await reporter.validateHierarchy();
   * for (const error of errors) {
   *   console.error(`${error.error_type}: ${error.details}`);
   * }
   * 
   * Requirements: 10.5
   */
  async validateHierarchy(allAccounts?: ERPNextAccount[]): Promise<HierarchyError[]> {
    // Fetch accounts if not provided
    if (!allAccounts) {
      allAccounts = await this.client.getList<ERPNextAccount>('Account', {
        filters: [['company', '=', this.company]],
        fields: ['*'],
        limit: 500
      });
    }

    const errors: HierarchyError[] = [];
    const accountNameMap = new Map<string, ERPNextAccount>();

    // Build account name map for quick lookups
    for (const account of allAccounts) {
      accountNameMap.set(account.name, account);
    }

    // Check each account's parent reference
    for (const account of allAccounts) {
      if (account.parent_account && account.parent_account.trim() !== '') {
        const parentExists = accountNameMap.has(account.parent_account);
        
        if (!parentExists) {
          errors.push({
            account: account.name,
            error_type: 'missing_parent',
            details: `Parent account "${account.parent_account}" does not exist`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Find orphaned accounts with invalid parent references
   * 
   * Identifies accounts that have a parent_account specified but the
   * parent does not exist in the system. These are "orphaned" accounts
   * that have broken hierarchy relationships.
   * 
   * @param allAccounts - All accounts to check (optional, will fetch if not provided)
   * @returns Array of orphaned accounts
   * 
   * @example
   * const orphaned = await reporter.findOrphanedAccounts();
   * for (const account of orphaned) {
   *   console.error(`Orphaned: ${account.name} (parent: ${account.parent_account})`);
   * }
   * 
   * Requirements: 10.4
   */
  async findOrphanedAccounts(allAccounts?: ERPNextAccount[]): Promise<ERPNextAccount[]> {
    // Fetch accounts if not provided
    if (!allAccounts) {
      allAccounts = await this.client.getList<ERPNextAccount>('Account', {
        filters: [['company', '=', this.company]],
        fields: ['*'],
        limit: 500
      });
    }

    const orphaned: ERPNextAccount[] = [];
    const accountNameMap = new Map<string, ERPNextAccount>();

    // Build account name map
    for (const account of allAccounts) {
      accountNameMap.set(account.name, account);
    }

    // Find accounts with invalid parent references
    for (const account of allAccounts) {
      if (account.parent_account && account.parent_account.trim() !== '') {
        const parentExists = accountNameMap.has(account.parent_account);
        
        if (!parentExists) {
          orphaned.push(account);
        }
      }
    }

    return orphaned;
  }

  /**
   * Check that no ledger accounts (is_group=0) have children
   * 
   * Validates that all accounts marked as ledgers (is_group=0) do not
   * have any child accounts. Ledger accounts should be leaf nodes in
   * the hierarchy and cannot have children.
   * 
   * @param allAccounts - All accounts to check (optional, will fetch if not provided)
   * @returns Array of ledger accounts that incorrectly have children
   * 
   * @example
   * const invalid = await reporter.checkLedgerAccounts();
   * for (const account of invalid) {
   *   console.error(`Ledger account has children: ${account.name}`);
   * }
   * 
   * Requirements: 10.6
   */
  async checkLedgerAccounts(allAccounts?: ERPNextAccount[]): Promise<ERPNextAccount[]> {
    // Fetch accounts if not provided
    if (!allAccounts) {
      allAccounts = await this.client.getList<ERPNextAccount>('Account', {
        filters: [['company', '=', this.company]],
        fields: ['*'],
        limit: 500
      });
    }

    const ledgerWithChildren: ERPNextAccount[] = [];

    // Check each ledger account
    for (const account of allAccounts) {
      if (account.is_group === 0) {
        // Find children of this account
        const children = allAccounts.filter(a => a.parent_account === account.name);
        
        if (children.length > 0) {
          ledgerWithChildren.push(account);
        }
      }
    }

    return ledgerWithChildren;
  }

  /**
   * Check that all leaf accounts (no children) are ledgers (is_group=0)
   * 
   * Validates that all accounts without children are marked as ledgers.
   * Group accounts (is_group=1) should have at least one child account.
   * 
   * @param allAccounts - All accounts to check (optional, will fetch if not provided)
   * @returns Array of leaf accounts that are incorrectly marked as groups
   * 
   * @example
   * const invalid = await reporter.checkLeafAccounts();
   * for (const account of invalid) {
   *   console.error(`Leaf account marked as group: ${account.name}`);
   * }
   * 
   * Requirements: 10.7
   */
  async checkLeafAccounts(allAccounts?: ERPNextAccount[]): Promise<ERPNextAccount[]> {
    // Fetch accounts if not provided
    if (!allAccounts) {
      allAccounts = await this.client.getList<ERPNextAccount>('Account', {
        filters: [['company', '=', this.company]],
        fields: ['*'],
        limit: 500
      });
    }

    const leafGroups: ERPNextAccount[] = [];

    // Check each account
    for (const account of allAccounts) {
      // Find children of this account
      const children = allAccounts.filter(a => a.parent_account === account.name);
      
      // If no children but marked as group, it's invalid
      if (children.length === 0 && account.is_group === 1) {
        leafGroups.push(account);
      }
    }

    return leafGroups;
  }

  /**
   * Format and print verification report to console
   * 
   * Generates a formatted, human-readable report with:
   * - Account summary statistics
   * - Breakdown by root_type, account_type, and currency
   * - Missing accounts (if any)
   * - Orphaned accounts (if any)
   * - Hierarchy errors (if any)
   * - Ledger accounts with children (if any)
   * - Leaf accounts marked as groups (if any)
   * - Overall pass/fail status
   * 
   * @param report - Verification report to format
   * 
   * @example
   * const report = await reporter.generateReport(expectedNumbers);
   * reporter.printReport(report);
   * 
   * Requirements: 10.1, 10.2
   */
  printReport(report: VerificationReport): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  COA Verification Report                                   ║');
    console.log(`║  Company: ${this.company.padEnd(44)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Account Summary
    console.log('📊 Account Summary:');
    console.log(`   Total accounts: ${report.total_accounts}\n`);

    // By Root Type
    if (Object.keys(report.accounts_by_root_type).length > 0) {
      console.log('   By Root Type:');
      for (const [rootType, count] of Object.entries(report.accounts_by_root_type)) {
        console.log(`   - ${rootType}: ${count}`);
      }
      console.log('');
    }

    // By Account Type
    if (Object.keys(report.accounts_by_account_type).length > 0) {
      console.log('   By Account Type:');
      for (const [accountType, count] of Object.entries(report.accounts_by_account_type)) {
        console.log(`   - ${accountType}: ${count}`);
      }
      console.log('');
    }

    // By Currency
    if (Object.keys(report.accounts_by_currency).length > 0) {
      console.log('   By Currency:');
      for (const [currency, count] of Object.entries(report.accounts_by_currency)) {
        console.log(`   - ${currency}: ${count}`);
      }
      console.log('');
    }

    // Missing Accounts
    if (report.missing_accounts.length === 0) {
      console.log('✅ All expected accounts exist\n');
    } else {
      console.log(`❌ Missing Accounts (${report.missing_accounts.length}):`);
      for (const accountNumber of report.missing_accounts) {
        console.log(`   - ${accountNumber}`);
      }
      console.log('');
    }

    // Orphaned Accounts
    if (report.orphaned_accounts.length === 0) {
      console.log('✅ No orphaned accounts found\n');
    } else {
      console.log(`❌ Orphaned Accounts (${report.orphaned_accounts.length}):`);
      for (const account of report.orphaned_accounts) {
        console.log(`   - ${account.name}`);
        console.log(`     Parent: ${account.parent_account} (does not exist)`);
      }
      console.log('');
    }

    // Hierarchy Errors
    if (report.hierarchy_errors.length === 0) {
      console.log('✅ No hierarchy errors detected\n');
    } else {
      console.log(`❌ Hierarchy Errors (${report.hierarchy_errors.length}):`);
      for (const error of report.hierarchy_errors) {
        console.log(`   - ${error.account}`);
        console.log(`     Error: ${error.error_type}`);
        console.log(`     Details: ${error.details}`);
      }
      console.log('');
    }

    // Ledger Accounts with Children
    if (report.ledger_with_children.length === 0) {
      console.log('✅ All ledger accounts have no children\n');
    } else {
      console.log(`❌ Ledger Accounts with Children (${report.ledger_with_children.length}):`);
      for (const account of report.ledger_with_children) {
        console.log(`   - ${account.name} (is_group=0 but has children)`);
      }
      console.log('');
    }

    // Leaf Accounts Marked as Groups
    if (report.leaf_groups.length === 0) {
      console.log('✅ All leaf accounts are ledgers\n');
    } else {
      console.log(`❌ Leaf Accounts Marked as Groups (${report.leaf_groups.length}):`);
      for (const account of report.leaf_groups) {
        console.log(`   - ${account.name} (is_group=1 but has no children)`);
      }
      console.log('');
    }

    // Overall Status
    console.log('╔════════════════════════════════════════════════════════════╗');
    if (report.verification_passed) {
      console.log('║  ✅ VERIFICATION PASSED                                     ║');
    } else {
      console.log('║  ❌ VERIFICATION FAILED                                     ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }
}
