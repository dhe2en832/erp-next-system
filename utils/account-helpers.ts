/**
 * Account Helper Utilities
 * 
 * Helper functions for account filtering and categorization in financial reports.
 * These functions provide flexible account identification based on account_type
 * and parent_account instead of hardcoded account numbers.
 */

export interface AccountMaster {
  name: string;
  account_name: string;
  account_type: string;
  root_type: string;
  parent_account: string;
  is_group: number;
  account_number?: string;
}

/**
 * Identifies discount accounts based on account name or parent account.
 * 
 * Discount accounts are contra accounts:
 * - Sales Discount: contra to Income (debit balance)
 * - Purchase Discount: contra to COGS (credit balance)
 * 
 * @param account - The account master record to check
 * @returns true if the account is a discount account
 */
export function isDiscountAccount(account: AccountMaster): boolean {
  const name = account.account_name.toLowerCase();
  const parent = account.parent_account?.toLowerCase() || '';
  
  return (
    name.includes('potongan') ||
    name.includes('discount') ||
    parent.includes('potongan') ||
    parent.includes('discount')
  );
}

/**
 * Determines if an account is a Current Asset.
 * 
 * Current Assets are assets that can be converted to cash within one year:
 * - Cash and Bank accounts
 * - Accounts Receivable
 * - Stock/Inventory
 * - Tax assets (prepaid taxes, tax receivables)
 * 
 * @param account - The account master record to check
 * @returns true if the account is a current asset
 */
export function isCurrentAsset(account: AccountMaster): boolean {
  const currentTypes = ['Cash', 'Bank', 'Receivable', 'Stock', 'Tax'];
  return currentTypes.includes(account.account_type);
}

/**
 * Determines if an account is a Current Liability.
 * 
 * Current Liabilities are obligations due within one year:
 * - Accounts Payable
 * - Tax liabilities (VAT payable, income tax payable)
 * 
 * @param account - The account master record to check
 * @returns true if the account is a current liability
 */
export function isCurrentLiability(account: AccountMaster): boolean {
  const currentTypes = ['Payable', 'Tax'];
  return currentTypes.includes(account.account_type);
}
