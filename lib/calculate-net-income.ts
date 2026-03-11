import type { AccountBalance } from '@/types/accounting-period';

/**
 * Calculate net income from nominal accounts
 * 
 * Formula (consistent with financial reports):
 * - Total Income = SUM(balance for all Income accounts) where balance = Cr - Dr
 * - Total Expense = SUM(balance for all Expense accounts) where balance = Dr - Cr
 * - Net Income = Total Income - Total Expense
 * 
 * Note: Balance calculation in closing-summary route:
 * - Income: balance = credit - debit (positive = income)
 * - Expense: balance = debit - credit (positive = expense)
 * 
 * @param nominalAccounts - Array of Income and Expense accounts
 * @returns Object with totalIncome, totalExpense, and netIncome
 */
export function calculateNetIncome(nominalAccounts: AccountBalance[]) {
  // Calculate total income (sum of balances where balance = Cr - Dr)
  // Positive balance = income
  const totalIncome = nominalAccounts
    .filter(a => a.root_type === 'Income')
    .reduce((sum, a) => sum + a.balance, 0);

  // Calculate total expense (sum of balances where balance = Dr - Cr)
  // Note: Expense balance can be negative if there are credits (e.g., stock opname adjustments)
  // In that case, negative expense means expense reduction, which increases profit
  const expenseSum = nominalAccounts
    .filter(a => a.root_type === 'Expense')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // For display purposes, we show absolute value
  const totalExpense = Math.abs(expenseSum);

  // Calculate net income
  // If expenseSum is negative (credit balance), it increases profit
  const netIncome = totalIncome - expenseSum;

  return {
    totalIncome,
    totalExpense,
    netIncome,
  };
}

/**
 * Get breakdown of income and expense accounts
 * 
 * @param nominalAccounts - Array of Income and Expense accounts
 * @returns Object with income and expense account arrays
 */
export function getIncomeExpenseBreakdown(nominalAccounts: AccountBalance[]) {
  const incomeAccounts = nominalAccounts.filter(a => a.root_type === 'Income');
  const expenseAccounts = nominalAccounts.filter(a => a.root_type === 'Expense');

  return {
    incomeAccounts,
    expenseAccounts,
  };
}

/**
 * Validate that income and expense calculations are consistent
 * across different data sources
 * 
 * @param calculation1 - First calculation result
 * @param calculation2 - Second calculation result
 * @param tolerance - Allowed difference (default: 0)
 * @returns true if calculations match within tolerance
 */
export function validateNetIncomeConsistency(
  calculation1: ReturnType<typeof calculateNetIncome>,
  calculation2: ReturnType<typeof calculateNetIncome>,
  tolerance: number = 0
): boolean {
  return (
    Math.abs(calculation1.totalIncome - calculation2.totalIncome) <= tolerance &&
    Math.abs(calculation1.totalExpense - calculation2.totalExpense) <= tolerance &&
    Math.abs(calculation1.netIncome - calculation2.netIncome) <= tolerance
  );
}
