/**
 * Accounting Period Closing Utilities
 * 
 * This module provides functions for:
 * - Identifying nominal accounts (Income and Expense)
 * - Creating closing journal entries
 * - Calculating net income/loss
 */

import { erpnextClient } from './erpnext';

export interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  is_group: boolean;
  debit: number;
  credit: number;
  balance: number;
  is_nominal: boolean;
}

export interface ClosingJournalAccount {
  account: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  user_remark?: string;
}

export interface ClosingJournalEntry {
  doctype: 'Journal Entry';
  voucher_type: 'Closing Entry';
  posting_date: string;
  company: string;
  accounts: ClosingJournalAccount[];
  user_remark: string;
  is_closing_entry: number;
  accounting_period?: string;
}

export interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * Get nominal account balances for a period
 * Identifies all Income and Expense accounts with non-zero balances
 * 
 * @param period - The accounting period
 * @returns Array of nominal account balances
 */
export async function getNominalAccountBalances(
  period: AccountingPeriod
): Promise<AccountBalance[]> {
  // Get all GL entries for the period
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '>=', period.start_date],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0]
  ];
  
  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999
  });
  
  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();
  
  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + (entry.debit || 0),
      credit: existing.credit + (entry.credit || 0)
    });
  }
  
  // Get account details for accounts with balances
  const accountNames = Array.from(accountMap.keys());
  if (accountNames.length === 0) {
    return [];
  }
  
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', accountNames],
      ['root_type', 'in', ['Income', 'Expense']],
      ['is_group', '=', 0]
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999
  });
  
  // Build result with only non-zero balances
  const result: AccountBalance[] = [];
  
  for (const account of accounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;
    
    // Calculate balance based on account type
    // Income has credit balance (credit - debit)
    // Expense has debit balance (debit - credit)
    const balance = account.root_type === 'Income'
      ? totals.credit - totals.debit
      : totals.debit - totals.credit;
    
    // Only include accounts with non-zero balance
    if (Math.abs(balance) > 0.01) {
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type,
        is_group: account.is_group,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: true
      });
    }
  }
  
  return result;
}

/**
 * Create closing journal entry for a period
 * 
 * Algorithm:
 * 1. Get all nominal accounts with non-zero balances
 * 2. Debit all income accounts (to zero them out)
 * 3. Credit all expense accounts (to zero them out)
 * 4. Calculate net income = total income - total expense
 * 5. Create balancing entry to retained earnings
 * 6. Submit the journal entry
 * 
 * @param period - The accounting period
 * @param retainedEarningsAccount - The retained earnings account
 * @returns The created and submitted journal entry
 */
export async function createClosingJournalEntry(
  period: AccountingPeriod,
  retainedEarningsAccount: string
): Promise<any> {
  // Step 1: Get all nominal accounts with non-zero balances
  const nominalAccounts = await getNominalAccountBalances(period);
  
  if (nominalAccounts.length === 0) {
    throw new Error('No nominal accounts with non-zero balances found');
  }
  
  // Step 2: Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  
  for (const account of nominalAccounts) {
    if (account.root_type === 'Income') {
      totalIncome += account.balance;
    } else if (account.root_type === 'Expense') {
      totalExpense += account.balance;
    }
  }
  
  const netIncome = totalIncome - totalExpense;
  
  // Step 3: Build journal entry accounts
  const journalAccounts: ClosingJournalAccount[] = [];
  
  // Close income accounts (debit income to zero it out)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Income' && Math.abs(account.balance) > 0.01) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: Math.abs(account.balance),
        credit_in_account_currency: 0,
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`
      });
    }
  }
  
  // Close expense accounts (credit expense to zero it out)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Expense' && Math.abs(account.balance) > 0.01) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: 0,
        credit_in_account_currency: Math.abs(account.balance),
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`
      });
    }
  }
  
  // Add retained earnings entry (balancing entry)
  if (Math.abs(netIncome) > 0.01) {
    if (netIncome > 0) {
      // Profit: Credit retained earnings
      journalAccounts.push({
        account: retainedEarningsAccount,
        debit_in_account_currency: 0,
        credit_in_account_currency: netIncome,
        user_remark: `Net income for period ${period.period_name}`
      });
    } else {
      // Loss: Debit retained earnings
      journalAccounts.push({
        account: retainedEarningsAccount,
        debit_in_account_currency: Math.abs(netIncome),
        credit_in_account_currency: 0,
        user_remark: `Net loss for period ${period.period_name}`
      });
    }
  }
  
  // Step 4: Create journal entry
  const journalEntry = await erpnextClient.insert('Journal Entry', {
    voucher_type: 'Closing Entry',
    posting_date: period.end_date,
    company: period.company,
    accounts: journalAccounts,
    user_remark: `Closing entry for accounting period ${period.period_name}`,
    is_closing_entry: 1,
    accounting_period: period.name
  });
  
  // Step 5: Submit the journal entry
  await erpnextClient.submit('Journal Entry', journalEntry.name);
  
  return journalEntry;
}

/**
 * Calculate net income for a period
 * Net Income = Total Income - Total Expense
 * 
 * @param nominalAccounts - Array of nominal account balances
 * @returns Net income (positive = profit, negative = loss)
 */
export function calculateNetIncome(nominalAccounts: AccountBalance[]): number {
  let totalIncome = 0;
  let totalExpense = 0;
  
  for (const account of nominalAccounts) {
    if (account.root_type === 'Income') {
      totalIncome += account.balance;
    } else if (account.root_type === 'Expense') {
      totalExpense += account.balance;
    }
  }
  
  return totalIncome - totalExpense;
}

/**
 * Calculate all account balances as of period end date
 * Includes all accounts (Asset, Liability, Equity, Income, Expense)
 * 
 * @param period - The accounting period
 * @returns Array of all account balances
 */
export async function calculateAllAccountBalances(
  period: AccountingPeriod
): Promise<AccountBalance[]> {
  // Get all GL entries up to period end date
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0]
  ];
  
  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999
  });
  
  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();
  
  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + (entry.debit || 0),
      credit: existing.credit + (entry.credit || 0)
    });
  }
  
  // Get account details
  const accountNames = Array.from(accountMap.keys());
  if (accountNames.length === 0) {
    return [];
  }
  
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', accountNames],
      ['company', '=', period.company],
      ['is_group', '=', 0]
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999
  });
  
  const result: AccountBalance[] = [];
  
  for (const account of accounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;
    
    // Calculate balance based on account type
    // Asset and Expense: debit - credit
    // Liability, Equity, Income: credit - debit
    const balance = ['Asset', 'Expense'].includes(account.root_type)
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;
    
    result.push({
      account: account.name,
      account_name: account.account_name,
      account_type: account.account_type,
      root_type: account.root_type,
      is_group: account.is_group,
      debit: totals.debit,
      credit: totals.credit,
      balance: balance,
      is_nominal: ['Income', 'Expense'].includes(account.root_type)
    });
  }
  
  return result;
}

/**
 * Create audit log entry for period closing actions
 * 
 * @param logData - Audit log data
 * @returns Created audit log entry
 */
export async function createAuditLog(logData: {
  accounting_period: string;
  action_type: 'Created' | 'Closed' | 'Reopened' | 'Permanently Closed' | 'Transaction Modified';
  action_by: string;
  action_date: string;
  reason?: string;
  before_snapshot?: string;
  after_snapshot?: string;
  affected_transaction?: string;
  transaction_doctype?: string;
}): Promise<any> {
  return await erpnextClient.insert('Period Closing Log', {
    accounting_period: logData.accounting_period,
    action_type: logData.action_type,
    action_by: logData.action_by,
    action_date: logData.action_date,
    reason: logData.reason,
    before_snapshot: logData.before_snapshot,
    after_snapshot: logData.after_snapshot,
    affected_transaction: logData.affected_transaction,
    transaction_doctype: logData.transaction_doctype,
  });
}

/**
 * Send notifications for period closing
 * Stub implementation - can be enhanced with actual email/notification service
 * 
 * @param period - The closed period
 */
export async function sendClosingNotifications(period: AccountingPeriod): Promise<void> {
  // TODO: Implement actual notification sending
  // For now, just log
  console.log(`Notification: Period ${period.period_name} has been closed`);
  
  // In production, this would:
  // 1. Get users with 'Accounts Manager' role
  // 2. Send email/in-app notification
  // 3. Log notification sent
}
