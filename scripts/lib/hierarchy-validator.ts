/**
 * Hierarchy Validator for COA Replacement
 * 
 * This module provides utilities for validating and managing account hierarchy
 * relationships, including topological sorting, circular reference detection,
 * and transaction safety checks.
 * 
 * Requirements: 2.2, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6
 */

import { extractAccountNumber } from './name-utils';

/**
 * Account data structure from new-coa-data.json
 */
export interface COAAccount {
  doctype: string;
  account_number: string | number;
  account_name: string;
  company: string;
  parent_account: string;
  is_group: 0 | 1;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  report_type: 'Balance Sheet' | 'Profit and Loss';
  account_type: string;
  account_currency: string;
}

/**
 * Circular reference error details
 */
export interface CircularReferenceError {
  accounts: string[];
  message: string;
}

/**
 * HierarchyValidator class for managing account hierarchy operations
 * 
 * Provides methods for:
 * - Sorting accounts by hierarchy (parents before children)
 * - Validating parent account existence
 * - Detecting circular references
 * - Checking transaction safety for group conversions
 */
export class HierarchyValidator {
  /**
   * Sort accounts by hierarchy using topological sort (Kahn's algorithm)
   * 
   * Ensures parent accounts are created before their children by performing
   * a topological sort on the account dependency graph. Uses Kahn's algorithm
   * which processes nodes with no dependencies first, then removes those
   * dependencies from remaining nodes.
   * 
   * @param accounts - Unsorted array of accounts
   * @returns Sorted array with parents before children
   * @throws Error if circular dependencies are detected
   * 
   * @example
   * const sorted = validator.sortByHierarchy(accounts);
   * // Returns accounts in order: root -> parent -> child
   * 
   * Requirements: 2.2, 4.1, 4.2, 4.3
   */
  sortByHierarchy(accounts: COAAccount[]): COAAccount[] {
    // Build account map for quick lookups
    const accountMap = new Map<string, COAAccount>();
    const dependencyGraph = new Map<string, Set<string>>();
    
    // Normalize account numbers to strings
    for (const account of accounts) {
      const accountNumber = String(account.account_number);
      accountMap.set(accountNumber, account);
      dependencyGraph.set(accountNumber, new Set());
    }
    
    // Build dependency graph (child depends on parent)
    for (const account of accounts) {
      const accountNumber = String(account.account_number);
      
      if (account.parent_account && account.parent_account.trim() !== '') {
        const parentNumber = extractAccountNumber(account.parent_account);
        
        // Only add dependency if parent is in our dataset
        if (parentNumber && accountMap.has(parentNumber)) {
          dependencyGraph.get(accountNumber)!.add(parentNumber);
        }
      }
    }
    
    // Topological sort using Kahn's algorithm
    const sorted: COAAccount[] = [];
    const inDegree = new Map<string, number>();
    
    // Calculate in-degrees (number of dependencies)
    for (const [node, deps] of dependencyGraph) {
      inDegree.set(node, deps.size);
    }
    
    // Find nodes with no dependencies (root accounts)
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }
    
    // Process queue
    while (queue.length > 0) {
      // Sort queue by account number for deterministic ordering
      queue.sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        return numA - numB;
      });
      
      const current = queue.shift()!;
      sorted.push(accountMap.get(current)!);
      
      // Reduce in-degree for accounts that depend on this one
      for (const [node, deps] of dependencyGraph) {
        if (deps.has(current)) {
          deps.delete(current);
          const newDegree = deps.size;
          inDegree.set(node, newDegree);
          
          if (newDegree === 0) {
            queue.push(node);
          }
        }
      }
    }
    
    // Check for circular dependencies
    if (sorted.length !== accounts.length) {
      const missing = accounts.filter(a => 
        !sorted.find(s => String(s.account_number) === String(a.account_number))
      );
      
      throw new Error(
        `Circular dependency detected in accounts: ${missing.map(a => a.account_number).join(', ')}`
      );
    }
    
    return sorted;
  }
  
  /**
   * Validate that parent account exists or will be created
   * 
   * Checks if a parent account reference is valid by verifying it exists
   * in the set of already processed accounts. This ensures we don't try
   * to create child accounts before their parents.
   * 
   * @param parentAccount - Parent account reference (e.g., "1110.000 - Kas dan Bank - BAC")
   * @param processedAccounts - Set of account numbers already processed
   * @returns True if parent exists or will be created
   * 
   * @example
   * const isValid = validator.validateParentExists(
   *   "1110.000 - Kas dan Bank - BAC",
   *   new Set(["1000", "1100", "1110.000"])
   * );
   * // Returns: true
   * 
   * Requirements: 4.2, 4.3
   */
  validateParentExists(
    parentAccount: string,
    processedAccounts: Set<string>
  ): boolean {
    if (!parentAccount || parentAccount.trim() === '') {
      // No parent specified (root account)
      return true;
    }
    
    const parentNumber = extractAccountNumber(parentAccount);
    
    if (!parentNumber) {
      // Invalid parent reference format
      return false;
    }
    
    // Check if parent has been processed
    return processedAccounts.has(parentNumber);
  }
  
  /**
   * Detect circular references in account hierarchy
   * 
   * Performs a depth-first search to detect cycles in the parent-child
   * relationships. A circular reference occurs when following parent
   * relationships leads back to the starting account (e.g., A → B → C → A).
   * 
   * @param accounts - All accounts to check
   * @returns Array of circular reference errors (empty if none found)
   * 
   * @example
   * const errors = validator.detectCircularReferences(accounts);
   * if (errors.length > 0) {
   *   console.error("Circular references found:", errors);
   * }
   * 
   * Requirements: 8.6
   */
  detectCircularReferences(accounts: COAAccount[]): CircularReferenceError[] {
    const errors: CircularReferenceError[] = [];
    const accountMap = new Map<string, COAAccount>();
    
    // Build account map
    for (const account of accounts) {
      const accountNumber = String(account.account_number);
      accountMap.set(accountNumber, account);
    }
    
    // Track visited nodes for cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    /**
     * DFS helper to detect cycles
     */
    const detectCycle = (accountNumber: string, path: string[]): boolean => {
      visited.add(accountNumber);
      recursionStack.add(accountNumber);
      path.push(accountNumber);
      
      const account = accountMap.get(accountNumber);
      if (!account) {
        path.pop();
        recursionStack.delete(accountNumber);
        return false;
      }
      
      // Check parent
      if (account.parent_account && account.parent_account.trim() !== '') {
        const parentNumber = extractAccountNumber(account.parent_account);
        
        if (parentNumber && accountMap.has(parentNumber)) {
          if (recursionStack.has(parentNumber)) {
            // Cycle detected
            const cycleStart = path.indexOf(parentNumber);
            const cycle = path.slice(cycleStart);
            cycle.push(parentNumber); // Complete the cycle
            
            errors.push({
              accounts: cycle,
              message: `Circular reference detected: ${cycle.join(' → ')}`
            });
            
            path.pop();
            recursionStack.delete(accountNumber);
            return true;
          }
          
          if (!visited.has(parentNumber)) {
            if (detectCycle(parentNumber, path)) {
              path.pop();
              recursionStack.delete(accountNumber);
              return true;
            }
          }
        }
      }
      
      path.pop();
      recursionStack.delete(accountNumber);
      return false;
    };
    
    // Check each account
    for (const account of accounts) {
      const accountNumber = String(account.account_number);
      if (!visited.has(accountNumber)) {
        detectCycle(accountNumber, []);
      }
    }
    
    return errors;
  }
  
  /**
   * Check if account can be safely converted from ledger to group
   * 
   * Verifies that an account has no existing GL Entry transactions before
   * allowing conversion from ledger (is_group=0) to group (is_group=1).
   * This is a placeholder that returns true - actual implementation will
   * require ERPNext API access to check transactions.
   * 
   * @param accountName - ERPNext account name (full name with company suffix)
   * @returns Promise resolving to true if safe to convert
   * 
   * @example
   * const canConvert = await validator.canConvertToGroup("1110.001 - Kas Kecil - BAC");
   * if (canConvert) {
   *   // Safe to change is_group property
   * }
   * 
   * Requirements: 4.5, 8.5
   */
  async canConvertToGroup(accountName: string): Promise<boolean> {
    // Placeholder implementation
    // In actual usage, this would check for GL Entry transactions via ERPNext API:
    // 
    // const glEntries = await erpnextClient.getList("GL Entry", {
    //   filters: [["account", "=", accountName]],
    //   fields: ["name"],
    //   limit: 1
    // });
    // 
    // return glEntries.length === 0;
    
    // For now, return true to allow conversions
    // This will be implemented when integrated with ERPNext API client
    return true;
  }
}
