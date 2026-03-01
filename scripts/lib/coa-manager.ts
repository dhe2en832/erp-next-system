/**
 * COA Manager for Complete Chart of Accounts Replacement
 * 
 * This module provides the COAManager class that orchestrates the complete
 * COA replacement process. It loads data from JSON, validates it, processes
 * accounts in correct hierarchy order, handles errors gracefully, and generates
 * comprehensive processing summaries.
 * 
 * Requirements: 1.1, 1.2, 8.3, 8.4, 9.1, 9.4, 12.1, 12.3
 */

import { promises as fs } from 'fs';
import { ERPNextClient } from '@/lib/erpnext';
import { HierarchyValidator, type COAAccount } from './hierarchy-validator';
import { AccountProcessor, type AccountOperationResult } from './account-processor';

/**
 * Summary of the complete replacement operation
 */
export interface ReplacementSummary {
  total_accounts: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: AccountOperationResult[];
  duration_ms: number;
}

/**
 * Detailed results from account processing
 */
export interface ProcessingResult {
  results: AccountOperationResult[];
  summary: ReplacementSummary;
  processing_order: string[];  // Account numbers in order processed
}

/**
 * COAManager class for orchestrating complete COA replacement
 * 
 * Provides methods for:
 * - Loading and validating COA data from JSON file
 * - Processing all accounts in correct hierarchy order
 * - Progress logging every 10 accounts
 * - Error handling with continuation (doesn't stop on individual failures)
 * - Generating comprehensive processing summaries
 */
export class COAManager {
  private client: ERPNextClient;
  private hierarchyValidator: HierarchyValidator;
  private accountProcessor: AccountProcessor;
  
  /**
   * Create a new COAManager instance
   * 
   * @param client - ERPNext API client instance
   */
  constructor(client: ERPNextClient) {
    this.client = client;
    this.hierarchyValidator = new HierarchyValidator();
    this.accountProcessor = new AccountProcessor(client);
  }
  
  /**
   * Execute the complete COA replacement process
   * 
   * Main entry point that orchestrates the entire replacement workflow:
   * 1. Load COA data from JSON file
   * 2. Validate and sort accounts by hierarchy
   * 3. Process each account (create or update)
   * 4. Generate and return summary
   * 
   * @param filePath - Path to new-coa-data.json file
   * @returns Processing summary with counts and errors
   * 
   * @example
   * const manager = new COAManager(erpnextClient);
   * const summary = await manager.execute('scripts/new-coa-data.json');
   * console.log(`Created: ${summary.created}, Updated: ${summary.updated}`);
   * 
   * Requirements: 1.1, 1.2, 8.3, 8.4, 9.1, 9.4, 12.1, 12.3
   */
  async execute(filePath: string): Promise<ReplacementSummary> {
    const startTime = Date.now();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  COA Replacement Process Starting                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    try {
      // Step 1: Load and validate COA data
      console.log('📂 Loading COA data from:', filePath);
      const accounts = await this.loadCOAData(filePath);
      console.log(`✅ Loaded ${accounts.length} accounts`);
      console.log('');
      
      // Step 2: Process all accounts
      const processingResult = await this.processAccounts(accounts);
      
      // Step 3: Calculate duration
      const duration_ms = Date.now() - startTime;
      processingResult.summary.duration_ms = duration_ms;
      
      // Step 4: Display summary
      this.displaySummary(processingResult.summary);
      
      return processingResult.summary;
      
    } catch (error: any) {
      const duration_ms = Date.now() - startTime;
      
      console.error('');
      console.error('❌ CRITICAL ERROR - COA replacement failed');
      console.error('Error:', error.message);
      console.error('');
      
      // Return error summary
      return {
        total_accounts: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        duration_ms
      };
    }
  }
  
  /**
   * Load and validate COA data from JSON file
   * 
   * Reads the JSON file, validates structure, checks for circular references,
   * and returns validated account data ready for processing.
   * 
   * @param filePath - Path to new-coa-data.json file
   * @returns Validated array of COA accounts
   * @throws Error if file cannot be read or data is invalid
   * 
   * @example
   * const accounts = await manager.loadCOAData('scripts/new-coa-data.json');
   * 
   * Requirements: 8.1, 8.2, 8.6
   */
  async loadCOAData(filePath: string): Promise<COAAccount[]> {
    try {
      // Read file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Parse JSON
      let data: any;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError: any) {
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
      
      // Validate structure
      if (!Array.isArray(data)) {
        throw new Error('COA data must be an array of accounts');
      }
      
      if (data.length === 0) {
        throw new Error('COA data is empty');
      }
      
      // Validate each account has required fields
      const requiredFields = [
        'account_number',
        'account_name',
        'company',
        'is_group',
        'root_type',
        'report_type',
        'account_currency'
      ];
      
      for (let i = 0; i < data.length; i++) {
        const account = data[i];
        
        for (const field of requiredFields) {
          if (account[field] === undefined || account[field] === null) {
            throw new Error(
              `Account at index ${i} (${account.account_number || 'unknown'}) missing required field: ${field}`
            );
          }
        }
      }
      
      // Check for duplicate account numbers
      const accountNumbers = new Set<string>();
      for (const account of data) {
        const accountNumber = String(account.account_number);
        
        if (accountNumbers.has(accountNumber)) {
          throw new Error(`Duplicate account_number found: ${accountNumber}`);
        }
        
        accountNumbers.add(accountNumber);
      }
      
      // Check for circular references
      const circularErrors = this.hierarchyValidator.detectCircularReferences(data);
      if (circularErrors.length > 0) {
        throw new Error(
          `Circular references detected:\n${circularErrors.map(e => e.message).join('\n')}`
        );
      }
      
      return data as COAAccount[];
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`COA data file not found: ${filePath}`);
      }
      throw error;
    }
  }
  
  /**
   * Process all accounts in correct hierarchy order
   * 
   * Sorts accounts by hierarchy (parents before children), then processes
   * each account sequentially. Continues processing even if individual
   * accounts fail. Logs progress every 10 accounts.
   * 
   * @param accounts - Array of accounts to process
   * @returns Processing results with summary and details
   * 
   * @example
   * const result = await manager.processAccounts(accounts);
   * console.log(`Processed ${result.results.length} accounts`);
   * 
   * Requirements: 1.1, 1.2, 8.3, 8.4, 9.1, 9.4, 12.3
   */
  async processAccounts(accounts: COAAccount[]): Promise<ProcessingResult> {
    console.log('🔄 Sorting accounts by hierarchy...');
    
    // Sort accounts by hierarchy (parents before children)
    let sortedAccounts: COAAccount[];
    try {
      sortedAccounts = this.hierarchyValidator.sortByHierarchy(accounts);
      console.log('✅ Accounts sorted successfully');
    } catch (error: any) {
      throw new Error(`Failed to sort accounts by hierarchy: ${error.message}`);
    }
    
    console.log('');
    console.log('📝 Processing accounts...');
    console.log('');
    
    // Process each account
    const results: AccountOperationResult[] = [];
    const processedNumbers = new Set<string>();
    
    for (let i = 0; i < sortedAccounts.length; i++) {
      const account = sortedAccounts[i];
      const accountNumber = String(account.account_number);
      
      try {
        // Process the account
        const result = await this.accountProcessor.processAccount(account);
        results.push(result);
        
        // Track successfully processed accounts
        if (result.operation === 'created' || result.operation === 'updated') {
          processedNumbers.add(accountNumber);
        }
        
        // Log individual result
        this.logAccountResult(result, i + 1, sortedAccounts.length);
        
        // Progress logging every 10 accounts
        if ((i + 1) % 10 === 0) {
          console.log('');
          console.log(`📊 Progress: ${i + 1}/${sortedAccounts.length} accounts processed`);
          console.log('');
        }
        
      } catch (error: any) {
        // Error handling with continuation - don't stop processing
        const errorResult: AccountOperationResult = {
          account_number: accountNumber,
          account_name: account.account_name,
          operation: 'failed',
          error: error.message || 'Unknown error'
        };
        
        results.push(errorResult);
        this.logAccountResult(errorResult, i + 1, sortedAccounts.length);
        
        // Continue processing remaining accounts
        console.log(`⚠️  Continuing with remaining accounts...`);
      }
    }
    
    console.log('');
    console.log('✅ Account processing complete');
    console.log('');
    
    // Generate summary
    const summary = this.generateSummary(results);
    
    return {
      results,
      summary,
      processing_order: Array.from(processedNumbers)
    };
  }
  
  /**
   * Generate processing summary from results
   * 
   * Counts operations by type and collects error details.
   * 
   * @param results - Array of account operation results
   * @returns Summary with counts and error list
   */
  private generateSummary(results: AccountOperationResult[]): ReplacementSummary {
    const summary: ReplacementSummary = {
      total_accounts: results.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration_ms: 0  // Will be set by execute()
    };
    
    for (const result of results) {
      switch (result.operation) {
        case 'created':
          summary.created++;
          break;
        case 'updated':
          summary.updated++;
          break;
        case 'skipped':
          summary.skipped++;
          break;
        case 'failed':
          summary.failed++;
          summary.errors.push(result);
          break;
      }
    }
    
    return summary;
  }
  
  /**
   * Log individual account processing result
   * 
   * @param result - Account operation result
   * @param current - Current account number (1-indexed)
   * @param total - Total number of accounts
   */
  private logAccountResult(
    result: AccountOperationResult,
    current: number,
    total: number
  ): void {
    const prefix = `[${current}/${total}]`;
    const accountInfo = `${result.account_number} - ${result.account_name}`;
    
    switch (result.operation) {
      case 'created':
        console.log(`${prefix} ✅ CREATED: ${accountInfo}`);
        break;
      case 'updated':
        console.log(`${prefix} 🔄 UPDATED: ${accountInfo}`);
        if (result.reason) {
          console.log(`           ${result.reason}`);
        }
        break;
      case 'skipped':
        console.log(`${prefix} ⏭️  SKIPPED: ${accountInfo}`);
        if (result.reason) {
          console.log(`           ${result.reason}`);
        }
        break;
      case 'failed':
        console.log(`${prefix} ❌ FAILED: ${accountInfo}`);
        if (result.error) {
          console.log(`           Error: ${result.error}`);
        }
        break;
    }
  }
  
  /**
   * Display final processing summary
   * 
   * @param summary - Processing summary to display
   */
  private displaySummary(summary: ReplacementSummary): void {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  COA Replacement Summary                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Total accounts processed: ${summary.total_accounts}`);
    console.log(`   ✅ Created: ${summary.created}`);
    console.log(`   🔄 Updated: ${summary.updated}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log('');
    console.log(`⏱️  Duration: ${(summary.duration_ms / 1000).toFixed(2)}s`);
    console.log('');
    
    if (summary.errors.length > 0) {
      console.log('❌ Errors encountered:');
      console.log('');
      
      for (const error of summary.errors) {
        console.log(`   • ${error.account_number} - ${error.account_name}`);
        console.log(`     ${error.error}`);
      }
      
      console.log('');
    }
    
    if (summary.failed === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ COA REPLACEMENT COMPLETED SUCCESSFULLY                  ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  COA REPLACEMENT COMPLETED WITH ERRORS                  ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    }
    
    console.log('');
  }
}
