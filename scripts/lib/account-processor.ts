/**
 * Account Processor for COA Replacement
 * 
 * This module provides the AccountProcessor class for creating and updating
 * individual accounts in ERPNext. It handles account lookup, creation, updates,
 * transaction safety checks, and retry logic with exponential backoff.
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 2.6, 2.7, 3.4, 9.2, 9.3, 12.2
 */

import { ERPNextClient } from '@/lib/erpnext';
import { stripBacSuffix } from './name-utils';
import type { COAAccount } from './hierarchy-validator';

/**
 * Validate and normalize account type
 * 
 * ERPNext stores account types in ENGLISH internally, even in Indonesian installations.
 * The UI may show Indonesian translations, but the database values are English.
 * 
 * Some account types can only be used for group accounts in ERPNext.
 * For leaf accounts (is_group = 0), we use empty string for these types.
 * 
 * Special mappings:
 * - "Prepaid Expenses" → "Current Asset" (ERPNext doesn't have Prepaid Expenses type)
 * - "Long Term Liability" → "" (Not valid for leaf accounts, use empty string)
 * 
 * @param accountType - English account type from COA data
 * @param isGroup - Whether this is a group account (1) or leaf account (0)
 * @returns Validated account type for ERPNext (in English)
 */
function validateAccountType(accountType: string, isGroup: number = 0): string {
  if (!accountType || accountType.trim() === '') {
    return '';
  }
  
  // Normalize the account type (trim whitespace)
  let normalized = accountType.trim();
  
  // Special mapping: Prepaid Expenses → Current Asset
  // ERPNext doesn't have a "Prepaid Expenses" account type
  if (normalized === 'Prepaid Expenses') {
    normalized = 'Current Asset';
  }
  
  // These types can only be used for group accounts in ERPNext
  // For leaf accounts, use empty string
  const groupOnlyTypes = [
    'Cost of Goods Sold',
    'Stock Adjustment',
    'Depreciation',
    'Expense Account',
    'Round Off',
    'Long Term Liability'  // Not valid for leaf accounts in this ERPNext installation
  ];
  
  if (!isGroup && groupOnlyTypes.includes(normalized)) {
    console.log(`  ℹ️  Account type "${normalized}" can only be used for group accounts - using empty string for leaf account`);
    return '';
  }
  
  // Return the English account type as-is
  // ERPNext will validate it against its internal list
  return normalized;
}

/**
 * ERPNext Account document structure (API response)
 */
export interface ERPNextAccount {
  name: string;                  // Full name: "1110.001 - Kas - BAC"
  account_name: string;          // Display name
  account_number: string;        // Unique identifier
  company: string;
  parent_account?: string;
  is_group: 0 | 1;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  report_type: 'Balance Sheet' | 'Profit and Loss';
  account_type?: string;
  account_currency: string;
  lft?: number;                  // Nested set left value
  rgt?: number;                  // Nested set right value
  disabled?: 0 | 1;
  [key: string]: any;
}

/**
 * Result of processing a single account
 */
export interface AccountOperationResult {
  account_number: string;
  account_name: string;
  operation: 'created' | 'updated' | 'skipped' | 'failed';
  reason?: string;
  error?: string;
}

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2
};

/**
 * AccountProcessor class for managing individual account operations
 * 
 * Provides methods for:
 * - Creating new accounts in ERPNext
 * - Updating existing account properties
 * - Finding accounts by account_number
 * - Checking for GL Entry transactions
 * - Retry logic with exponential backoff
 */
export class AccountProcessor {
  private client: ERPNextClient;
  private retryConfig: RetryConfig;
  
  /**
   * Create a new AccountProcessor instance
   * 
   * @param client - ERPNext API client instance
   * @param retryConfig - Optional retry configuration (uses defaults if not provided)
   */
  constructor(client: ERPNextClient, retryConfig?: Partial<RetryConfig>) {
    this.client = client;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }
  
  /**
   * Process a single account (create or update)
   * 
   * Main entry point for account processing. Determines if account exists
   * and either creates a new account or updates an existing one.
   * 
   * Special handling for root accounts (1000, 2000, 3000, 4000, 5000):
   * - ERPNext already has root accounts with .000 suffix (1000.000, 2000.000, etc.)
   * - We map our root accounts to the existing ones and update them
   * - Root accounts in ERPNext have parent_account = "null" (string, not empty)
   * 
   * @param account - Account data from new-coa-data.json
   * @returns Operation result with status and details
   * 
   * @example
   * const result = await processor.processAccount({
   *   account_number: "1110.001",
   *   account_name: "Kas Kecil",
   *   company: "Berkat Abadi Cirebon",
   *   is_group: 0,
   *   root_type: "Asset",
   *   // ... other fields
   * });
   * 
   * Requirements: 1.1, 9.2, 9.3
   */
  async processAccount(account: COAAccount): Promise<AccountOperationResult> {
    try {
      // Normalize account number to string
      const accountNumber = String(account.account_number);
      
      // Special handling for root accounts (1000, 2000, 3000, 4000, 5000)
      // These already exist in ERPNext with .000 suffix
      const rootAccountNumbers = ['1000', '2000', '3000', '4000', '5000'];
      if (rootAccountNumbers.includes(accountNumber)) {
        return await this.updateRootAccount(account);
      }
      
      // Check if account exists
      const existing = await this.findExistingAccount(accountNumber);
      
      if (existing) {
        // Account exists - determine if update is needed
        return await this.updateExistingAccount(existing, account);
      } else {
        // Account doesn't exist - create it
        return await this.createNewAccount(account);
      }
    } catch (error: any) {
      return {
        account_number: String(account.account_number),
        account_name: account.account_name,
        operation: 'failed',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Update existing root account (special handling)
   * 
   * Root accounts in ERPNext already exist with .000 suffix:
   * - 1000.000 - Aktiva (Asset)
   * - 2000.000 - Passiva (Liability)
   * - 3000.000 - Modal (Equity)
   * - 4000.000 - Penjualan (Income)
   * - 5000.000 - Beban (Expense)
   * 
   * ERPNext does NOT allow editing root accounts, so we just verify they exist
   * and skip any updates.
   * 
   * @param account - Root account data from COA file
   * @returns Operation result
   */
  private async updateRootAccount(account: COAAccount): Promise<AccountOperationResult> {
    try {
      const accountNumber = String(account.account_number);
      
      // Map to existing root account with .000 suffix
      const existingAccountNumber = `${accountNumber}.000`;
      
      // Find the existing root account
      const existing = await this.findExistingAccount(existingAccountNumber);
      
      if (!existing) {
        return {
          account_number: accountNumber,
          account_name: account.account_name,
          operation: 'failed',
          error: `Root account ${existingAccountNumber} not found in ERPNext`
        };
      }
      
      console.log(`\n✓ Root account exists: ${accountNumber} → ${existing.name}`);
      
      // ERPNext does not allow editing root accounts
      // Just verify it exists and skip
      return {
        account_number: accountNumber,
        account_name: account.account_name,
        operation: 'skipped',
        reason: `Root account exists (mapped to ${existingAccountNumber}) - cannot be edited`
      };
      
    } catch (error: any) {
      return {
        account_number: String(account.account_number),
        account_name: account.account_name,
        operation: 'failed',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Find existing account by account_number
   * 
   * Looks up an account in ERPNext using account_number as the unique identifier.
   * This is the idempotency key for account matching.
   * 
   * @param accountNumber - Unique account number (e.g., "1110.001")
   * @returns Existing account or null if not found
   * 
   * @example
   * const account = await processor.findExistingAccount("1110.001");
   * if (account) {
   *   console.log("Account exists:", account.name);
   * }
   * 
   * Requirements: 3.4, 9.2
   */
  async findExistingAccount(accountNumber: string): Promise<ERPNextAccount | null> {
    try {
      const accounts = await this.withRetry(async () => {
        return await this.client.getList<ERPNextAccount>('Account', {
          filters: [['account_number', '=', accountNumber]],
          fields: ['*'],
          limit: 1
        });
      });
      
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error: any) {
      // If error is not a "not found" error, rethrow
      if (!error.message?.includes('does not exist')) {
        throw error;
      }
      return null;
    }
  }
  
  /**
   * Create new account in ERPNext
   * 
   * Creates a new account with all required properties. Strips " - BAC" suffix
   * from account_name as ERPNext adds company abbreviation automatically.
   * 
   * @param account - Account data to create
   * @returns Created account
   * 
   * @example
   * const created = await processor.createAccount({
   *   account_number: "1110.001",
   *   account_name: "Kas Kecil",
   *   // ... other fields
   * });
   * 
   * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7
   */
  async createAccount(account: COAAccount): Promise<ERPNextAccount> {
    // Prepare account data for ERPNext API
    const accountData: any = {
      doctype: 'Account',
      account_number: String(account.account_number),
      account_name: stripBacSuffix(account.account_name),  // Strip " - BAC" suffix
      company: account.company,
      is_group: account.is_group,
      root_type: account.root_type,
      report_type: account.report_type,
      account_currency: account.account_currency
    };
    
    // Add parent if specified and not empty
    // CRITICAL: For root accounts, parent_account is empty string ""
    // ERPNext requires this field to be omitted entirely (not sent) for root accounts
    if (account.parent_account && account.parent_account.trim() !== '') {
      // Map parent references to existing root accounts
      // If parent is "1000 - Aktiva - BAC", map to "1000.000 - Aktiva - BAC"
      accountData.parent_account = this.mapParentAccountReference(account.parent_account);
    }
    // If parent_account is empty, we don't add it to accountData at all
    
    // Add account_type if specified
    if (account.account_type && account.account_type.trim() !== '') {
      accountData.account_type = validateAccountType(account.account_type, account.is_group);
    }
    
    // Debug logging for root accounts
    if (!account.parent_account || account.parent_account.trim() === '') {
      console.log(`\n🔍 Creating root account: ${account.account_number} - ${account.account_name}`);
      console.log(`   parent_account in source: "${account.parent_account}"`);
      console.log(`   parent_account in payload: ${accountData.parent_account === undefined ? 'UNDEFINED (not sent)' : `"${accountData.parent_account}"`}`);
      console.log(`   Payload keys: ${Object.keys(accountData).join(', ')}`);
    }
    
    // Create via API with retry logic
    return await this.withRetry(async () => {
      return await this.client.insert<ERPNextAccount>('Account', accountData);
    });
  }
  
  /**
   * Map parent account references to existing root accounts
   * 
   * Converts references like "1000 - Aktiva - BAC" to "1000.000 - Aktiva - BAC"
   * to match the existing root accounts in ERPNext.
   * 
   * CRITICAL: ERPNext root accounts have specific names that may differ from our COA:
   * - 1000.000 - Aktiva - BAC (Asset)
   * - 2000.000 - Passiva - BAC (Liability)  
   * - 3000.000 - Modal - BAC (Equity)
   * - 4000.000 - Penjualan - BAC (Income) <- Note: "Penjualan" not "Pendapatan"
   * - 5000.000 - Beban - BAC (Expense)
   * 
   * @param parentRef - Parent account reference from COA data
   * @returns Mapped parent account reference
   */
  private mapParentAccountReference(parentRef: string): string {
    // Extract account number from parent reference
    // Format: "1000 - Aktiva - BAC" or "1100 - Aktiva Lancar - BAC"
    const match = parentRef.match(/^(\d+)\s*-/);
    if (!match) {
      return parentRef; // Return as-is if format doesn't match
    }
    
    const accountNumber = match[1];
    
    // Check if this is a root account reference (1000, 2000, 3000, 4000, 5000)
    const rootAccountNumbers = ['1000', '2000', '3000', '4000', '5000'];
    if (rootAccountNumbers.includes(accountNumber)) {
      // Map to existing root account with .000 suffix
      // Use the ACTUAL root account names from ERPNext
      const rootAccountMap: Record<string, string> = {
        '1000': '1000.000 - Aktiva - BAC',
        '2000': '2000.000 - Passiva - BAC',
        '3000': '3000.000 - Modal - BAC',
        '4000': '4000.000 - Penjualan - BAC',  // Note: ERPNext uses "Penjualan" not "Pendapatan"
        '5000': '5000.000 - Beban - BAC'
      };
      
      return rootAccountMap[accountNumber] || parentRef;
    }
    
    return parentRef; // Return as-is for non-root accounts
  }
  
  /**
   * Update existing account properties
   * 
   * Updates an existing account's properties. Preserves the ERPNext name field
   * and only updates properties that have changed. Checks for transaction safety
   * before modifying is_group property.
   * 
   * @param existingName - ERPNext account name (full name with company suffix)
   * @param updates - Properties to update
   * @returns Updated account
   * 
   * @example
   * const updated = await processor.updateAccount(
   *   "1110.001 - Kas Kecil - BAC",
   *   { root_type: "Asset", account_currency: "IDR" }
   * );
   * 
   * Requirements: 1.3, 1.4, 1.5
   */
  async updateAccount(
    existingName: string,
    updates: Partial<ERPNextAccount>
  ): Promise<ERPNextAccount> {
    // Update via API with retry logic
    return await this.withRetry(async () => {
      return await this.client.update<ERPNextAccount>('Account', existingName, updates);
    });
  }
  
  /**
   * Check if account has GL Entry transactions
   * 
   * Verifies whether an account has any existing GL Entry records.
   * This is used to determine if it's safe to modify certain properties
   * like is_group (converting between ledger and group accounts).
   * 
   * @param accountName - ERPNext account name (full name with company suffix)
   * @returns True if account has transactions
   * 
   * @example
   * const hasTransactions = await processor.hasTransactions("1110.001 - Kas Kecil - BAC");
   * if (hasTransactions) {
   *   console.log("Cannot modify is_group - account has transactions");
   * }
   * 
   * Requirements: 1.4, 4.5, 11.1
   */
  async hasTransactions(accountName: string): Promise<boolean> {
    try {
      const glEntries = await this.withRetry(async () => {
        return await this.client.getList('GL Entry', {
          filters: [['account', '=', accountName]],
          fields: ['name'],
          limit: 1
        });
      });
      
      return glEntries.length > 0;
    } catch (error: any) {
      console.error(`Error checking transactions for ${accountName}:`, error);
      // Assume has transactions if check fails (safe default)
      return true;
    }
  }
  
  /**
   * Update existing account with change detection
   * 
   * Internal method that compares existing account properties with new data
   * and performs updates only when necessary. Handles transaction safety
   * checks for is_group changes.
   * 
   * @param existing - Existing account from ERPNext
   * @param newData - New account data from COA file
   * @returns Operation result
   * 
   * Requirements: 1.3, 1.4, 1.5, 9.3
   */
  private async updateExistingAccount(
    existing: ERPNextAccount,
    newData: COAAccount
  ): Promise<AccountOperationResult> {
    try {
      const accountNumber = String(newData.account_number);
      const updates: Partial<ERPNextAccount> = {};
      const changedFields: string[] = [];
      
      // Check root_type
      if (existing.root_type !== newData.root_type) {
        updates.root_type = newData.root_type;
        changedFields.push('root_type');
      }
      
      // Check report_type
      if (existing.report_type !== newData.report_type) {
        updates.report_type = newData.report_type;
        changedFields.push('report_type');
      }
      
      // Check account_currency
      if (existing.account_currency !== newData.account_currency) {
        updates.account_currency = newData.account_currency;
        changedFields.push('account_currency');
      }
      
      // Check account_type
      if (newData.account_type && newData.account_type.trim() !== '') {
        const validatedAccountType = validateAccountType(newData.account_type, newData.is_group);
        if (existing.account_type !== validatedAccountType) {
          updates.account_type = validatedAccountType;
          changedFields.push('account_type');
        }
      }
      
      // Check parent_account
      if (newData.parent_account && newData.parent_account.trim() !== '') {
        const mappedParent = this.mapParentAccountReference(newData.parent_account);
        if (existing.parent_account !== mappedParent) {
          updates.parent_account = mappedParent;
          changedFields.push('parent_account');
        }
      }
      
      // Check is_group (DANGEROUS - requires transaction check)
      if (existing.is_group !== newData.is_group) {
        const hasTransactions = await this.hasTransactions(existing.name);
        if (hasTransactions) {
          return {
            account_number: accountNumber,
            account_name: newData.account_name,
            operation: 'skipped',
            reason: 'Cannot change is_group - account has transactions'
          };
        }
        updates.is_group = newData.is_group;
        changedFields.push('is_group');
      }
      
      // If no changes needed, skip update
      if (changedFields.length === 0) {
        return {
          account_number: accountNumber,
          account_name: newData.account_name,
          operation: 'skipped',
          reason: 'No changes needed'
        };
      }
      
      // Perform update
      await this.updateAccount(existing.name, updates);
      
      return {
        account_number: accountNumber,
        account_name: newData.account_name,
        operation: 'updated',
        reason: `Updated: ${changedFields.join(', ')}`
      };
      
    } catch (error: any) {
      return {
        account_number: String(newData.account_number),
        account_name: newData.account_name,
        operation: 'failed',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Create new account with proper error handling
   * 
   * Internal method that creates a new account and returns a formatted result.
   * 
   * @param account - Account data to create
   * @returns Operation result
   * 
   * Requirements: 2.1, 2.4, 2.5, 2.6, 2.7
   */
  private async createNewAccount(account: COAAccount): Promise<AccountOperationResult> {
    try {
      await this.createAccount(account);
      
      return {
        account_number: String(account.account_number),
        account_name: account.account_name,
        operation: 'created'
      };
      
    } catch (error: any) {
      return {
        account_number: String(account.account_number),
        account_name: account.account_name,
        operation: 'failed',
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Execute operation with retry logic and exponential backoff
   * 
   * Wraps an async operation with retry logic. Retries transient failures
   * (network errors, timeouts) with exponential backoff. Does not retry
   * validation errors or other non-transient failures.
   * 
   * @param operation - Async operation to execute
   * @returns Result of the operation
   * @throws Error if all retries are exhausted
   * 
   * @example
   * const result = await processor.withRetry(async () => {
   *   return await client.getList('Account', { filters: [...] });
   * });
   * 
   * Requirements: 12.2
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    let delayMs = this.retryConfig.initialDelayMs;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry validation errors or client errors (4xx)
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt >= this.retryConfig.maxRetries) {
          throw error;
        }
        
        // Log retry attempt
        console.log(
          `Attempt ${attempt} failed: ${error.message}. Retrying in ${delayMs}ms...`
        );
        
        // Wait before retrying
        await this.sleep(delayMs);
        
        // Exponential backoff with max delay cap
        delayMs = Math.min(
          delayMs * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );
      }
    }
    
    throw lastError;
  }
  
  /**
   * Determine if an error should not be retried
   * 
   * @param error - Error to check
   * @returns True if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Don't retry validation errors
    if (message.includes('validation')) {
      return true;
    }
    
    // Don't retry "already exists" errors
    if (message.includes('already exists')) {
      return true;
    }
    
    // Don't retry "duplicate" errors
    if (message.includes('duplicate')) {
      return true;
    }
    
    // Don't retry permission errors
    if (message.includes('permission') || message.includes('not permitted')) {
      return true;
    }
    
    // Retry network errors, timeouts, and server errors (5xx)
    return false;
  }
  
  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
