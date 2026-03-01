/**
 * Name Utility Functions for COA Replacement
 * 
 * This module provides utilities for processing account names and handling
 * ERPNext's automatic company abbreviation suffix (" - BAC").
 * 
 * Requirements: 2.3, 3.1, 3.2, 3.3, 3.5, 3.6
 */

/**
 * Maximum length for ERPNext account name field (including company suffix)
 * ERPNext Account.account_name field limit is 140 characters
 */
const ERPNEXT_ACCOUNT_NAME_MAX_LENGTH = 140;

/**
 * Company abbreviation that ERPNext automatically appends to account names
 */
const COMPANY_ABBREVIATION = " - BAC";

/**
 * Strip " - BAC" suffix from account name
 * 
 * ERPNext automatically appends the company abbreviation to account names.
 * This function removes the suffix to avoid duplication (e.g., "Kas - BAC - BAC").
 * 
 * @param name - Account name that may contain " - BAC" suffix
 * @returns Account name without " - BAC" suffix
 * 
 * @example
 * stripBacSuffix("Kas - BAC") // Returns: "Kas"
 * stripBacSuffix("Kas") // Returns: "Kas"
 * stripBacSuffix("Kas - BAC - BAC") // Returns: "Kas - BAC"
 * stripBacSuffix("  Kas - BAC  ") // Returns: "Kas"
 * 
 * Requirements: 2.3, 3.1, 3.2, 3.3, 3.6
 */
export function stripBacSuffix(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  // Remove " - BAC" suffix (case-insensitive) and trim whitespace
  return name.replace(/\s*-\s*BAC\s*$/i, '').trim();
}

/**
 * Extract account number from parent account reference
 * 
 * Parent account references in the COA data include the full account name
 * with company suffix (e.g., "1110.000 - Kas dan Bank - BAC").
 * This function extracts just the account number portion.
 * 
 * @param parentReference - Full parent account reference string
 * @returns Account number or null if not found
 * 
 * @example
 * extractAccountNumber("1110.000 - Kas dan Bank - BAC") // Returns: "1110.000"
 * extractAccountNumber("2150 - Hutang Komisi Sales - BAC") // Returns: "2150"
 * extractAccountNumber("1000 - Aktiva - BAC") // Returns: "1000"
 * extractAccountNumber("Invalid") // Returns: null
 * extractAccountNumber("") // Returns: null
 * 
 * Requirements: 2.3, 3.1, 3.2, 3.3, 3.5, 3.6
 */
export function extractAccountNumber(parentReference: string): string | null {
  if (!parentReference || typeof parentReference !== 'string') {
    return null;
  }
  
  // Match account number at the start of the string
  // Account numbers can be integers (e.g., "1000") or decimals (e.g., "1110.001")
  const match = parentReference.match(/^([\d.]+)/);
  return match ? match[1] : null;
}

/**
 * Validate that account name length is within ERPNext field limits
 * 
 * ERPNext automatically appends " - BAC" to account names, so we need to ensure
 * the combined length (account_name + " - BAC") doesn't exceed the field limit.
 * 
 * @param accountName - Account name to validate (without " - BAC" suffix)
 * @returns Object with validation result and details
 * 
 * @example
 * validateAccountNameLength("Kas") 
 * // Returns: { valid: true, length: 9, maxLength: 140 }
 * 
 * validateAccountNameLength("A".repeat(135))
 * // Returns: { valid: true, length: 140, maxLength: 140 }
 * 
 * validateAccountNameLength("A".repeat(136))
 * // Returns: { valid: false, length: 141, maxLength: 140, error: "..." }
 * 
 * Requirements: 3.5
 */
export function validateAccountNameLength(accountName: string): {
  valid: boolean;
  length: number;
  maxLength: number;
  error?: string;
} {
  if (!accountName || typeof accountName !== 'string') {
    return {
      valid: false,
      length: 0,
      maxLength: ERPNEXT_ACCOUNT_NAME_MAX_LENGTH,
      error: 'Account name is required and must be a string'
    };
  }
  
  // Calculate total length including company suffix
  const totalLength = accountName.length + COMPANY_ABBREVIATION.length;
  
  if (totalLength > ERPNEXT_ACCOUNT_NAME_MAX_LENGTH) {
    return {
      valid: false,
      length: totalLength,
      maxLength: ERPNEXT_ACCOUNT_NAME_MAX_LENGTH,
      error: `Account name "${accountName}" with company suffix would be ${totalLength} characters, exceeding the maximum of ${ERPNEXT_ACCOUNT_NAME_MAX_LENGTH} characters`
    };
  }
  
  return {
    valid: true,
    length: totalLength,
    maxLength: ERPNEXT_ACCOUNT_NAME_MAX_LENGTH
  };
}
