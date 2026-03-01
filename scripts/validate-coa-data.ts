#!/usr/bin/env tsx
/**
 * Pre-flight COA Data Validation Script
 * 
 * This script validates the new-coa-data.json file before running the COA
 * replacement process. It performs comprehensive validation checks without
 * requiring an ERPNext connection.
 * 
 * Validation checks:
 * 1. Valid JSON structure
 * 2. All required fields present
 * 3. No duplicate account numbers
 * 4. No circular references in hierarchy
 * 5. Valid root types
 * 6. Valid currency codes (ISO 4217)
 * 7. Valid account_type compatibility with root_type
 * 
 * Usage:
 *   pnpm tsx scripts/validate-coa-data.ts
 * 
 * Exit codes:
 *   0 - Validation passed
 *   1 - Validation failed
 * 
 * Requirements: 8.1, 8.2, 8.5, 8.6
 */

import { promises as fs } from 'fs';
import { HierarchyValidator, type COAAccount } from './lib/hierarchy-validator';

/**
 * Valid root types according to ERPNext
 */
const VALID_ROOT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

/**
 * Valid ISO 4217 currency codes (common ones)
 */
const VALID_CURRENCY_CODES = [
  'IDR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR', 'THB', 'AUD', 'CAD'
];

/**
 * Account type compatibility with root types
 */
const ACCOUNT_TYPE_COMPATIBILITY: Record<string, string[]> = {
  'Bank': ['Asset'],
  'Cash': ['Asset'],
  'Receivable': ['Asset'],
  'Payable': ['Liability'],
  'Stock': ['Asset'],
  'Tax': ['Asset', 'Liability'],
  'Fixed Asset': ['Asset'],
  'Accumulated Depreciation': ['Asset'],
  'Income Account': ['Income'],
  'Expense Account': ['Expense'],
  'Cost of Goods Sold': ['Expense'],
  'Depreciation': ['Expense']
};

/**
 * Validation result
 */
interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  accountCount: number;
}

/**
 * Main validation function
 */
async function validateCOAData(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    accountCount: 0
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  COA Data Pre-flight Validation                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📂 Validating file: ${filePath}`);
  console.log('');
  
  try {
    // Step 1: Check file exists and read it
    console.log('1️⃣  Checking file exists...');
    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
      console.log('   ✅ File found');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        result.errors.push(`File not found: ${filePath}`);
        result.passed = false;
        return result;
      }
      throw error;
    }
    
    // Step 2: Parse JSON
    console.log('2️⃣  Parsing JSON...');
    let data: any;
    try {
      data = JSON.parse(fileContent);
      console.log('   ✅ Valid JSON structure');
    } catch (parseError: any) {
      result.errors.push(`Invalid JSON format: ${parseError.message}`);
      result.passed = false;
      return result;
    }
    
    // Step 3: Validate array structure
    console.log('3️⃣  Validating data structure...');
    if (!Array.isArray(data)) {
      result.errors.push('COA data must be an array of accounts');
      result.passed = false;
      return result;
    }
    
    if (data.length === 0) {
      result.errors.push('COA data is empty');
      result.passed = false;
      return result;
    }
    
    result.accountCount = data.length;
    console.log(`   ✅ Found ${data.length} accounts`);
    
    // Step 4: Validate required fields
    console.log('4️⃣  Validating required fields...');
    const requiredFields = [
      'account_number',
      'account_name',
      'company',
      'is_group',
      'root_type',
      'report_type',
      'account_currency'
    ];
    
    let missingFieldsCount = 0;
    for (let i = 0; i < data.length; i++) {
      const account = data[i];
      const missingFields: string[] = [];
      
      for (const field of requiredFields) {
        if (account[field] === undefined || account[field] === null) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        result.errors.push(
          `Account at index ${i} (${account.account_number || 'unknown'}) missing fields: ${missingFields.join(', ')}`
        );
        missingFieldsCount++;
      }
    }
    
    if (missingFieldsCount > 0) {
      console.log(`   ❌ ${missingFieldsCount} accounts with missing fields`);
      result.passed = false;
    } else {
      console.log('   ✅ All required fields present');
    }
    
    // Step 5: Check for duplicate account numbers
    console.log('5️⃣  Checking for duplicate account numbers...');
    const accountNumbers = new Map<string, number[]>();
    
    for (let i = 0; i < data.length; i++) {
      const account = data[i];
      const accountNumber = String(account.account_number);
      
      if (!accountNumbers.has(accountNumber)) {
        accountNumbers.set(accountNumber, []);
      }
      accountNumbers.get(accountNumber)!.push(i);
    }
    
    const duplicates = Array.from(accountNumbers.entries())
      .filter(([_, indices]) => indices.length > 1);
    
    if (duplicates.length > 0) {
      for (const [accountNumber, indices] of duplicates) {
        result.errors.push(
          `Duplicate account_number "${accountNumber}" found at indices: ${indices.join(', ')}`
        );
      }
      console.log(`   ❌ ${duplicates.length} duplicate account numbers found`);
      result.passed = false;
    } else {
      console.log('   ✅ All account numbers are unique');
    }
    
    // Step 6: Validate root types
    console.log('6️⃣  Validating root types...');
    let invalidRootTypeCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const account = data[i];
      
      if (account.root_type && !VALID_ROOT_TYPES.includes(account.root_type)) {
        result.errors.push(
          `Account ${account.account_number} has invalid root_type: "${account.root_type}". Must be one of: ${VALID_ROOT_TYPES.join(', ')}`
        );
        invalidRootTypeCount++;
      }
    }
    
    if (invalidRootTypeCount > 0) {
      console.log(`   ❌ ${invalidRootTypeCount} accounts with invalid root_type`);
      result.passed = false;
    } else {
      console.log('   ✅ All root types are valid');
    }
    
    // Step 7: Validate currency codes
    console.log('7️⃣  Validating currency codes...');
    let invalidCurrencyCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const account = data[i];
      
      if (account.account_currency && !VALID_CURRENCY_CODES.includes(account.account_currency)) {
        result.warnings.push(
          `Account ${account.account_number} has uncommon currency code: "${account.account_currency}"`
        );
        invalidCurrencyCount++;
      }
    }
    
    if (invalidCurrencyCount > 0) {
      console.log(`   ⚠️  ${invalidCurrencyCount} accounts with uncommon currency codes (warnings only)`);
    } else {
      console.log('   ✅ All currency codes are valid');
    }
    
    // Step 8: Validate account_type compatibility
    console.log('8️⃣  Validating account_type compatibility...');
    let incompatibleTypeCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const account = data[i];
      
      if (account.account_type && account.root_type) {
        const compatibleRootTypes = ACCOUNT_TYPE_COMPATIBILITY[account.account_type];
        
        if (compatibleRootTypes && !compatibleRootTypes.includes(account.root_type)) {
          result.errors.push(
            `Account ${account.account_number} has incompatible account_type "${account.account_type}" with root_type "${account.root_type}". Expected root_type: ${compatibleRootTypes.join(' or ')}`
          );
          incompatibleTypeCount++;
        }
      }
    }
    
    if (incompatibleTypeCount > 0) {
      console.log(`   ❌ ${incompatibleTypeCount} accounts with incompatible account_type`);
      result.passed = false;
    } else {
      console.log('   ✅ All account_type values are compatible with root_type');
    }
    
    // Step 9: Check for circular references
    console.log('9️⃣  Checking for circular references...');
    const hierarchyValidator = new HierarchyValidator();
    const circularErrors = hierarchyValidator.detectCircularReferences(data as COAAccount[]);
    
    if (circularErrors.length > 0) {
      for (const error of circularErrors) {
        result.errors.push(error.message);
      }
      console.log(`   ❌ ${circularErrors.length} circular references detected`);
      result.passed = false;
    } else {
      console.log('   ✅ No circular references found');
    }
    
    // Step 10: Validate hierarchy can be sorted
    console.log('🔟 Validating hierarchy sorting...');
    try {
      hierarchyValidator.sortByHierarchy(data as COAAccount[]);
      console.log('   ✅ Hierarchy can be sorted successfully');
    } catch (error: any) {
      result.errors.push(`Hierarchy sorting failed: ${error.message}`);
      console.log('   ❌ Hierarchy sorting failed');
      result.passed = false;
    }
    
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    result.passed = false;
  }
  
  return result;
}

/**
 * Display validation results
 */
function displayResults(result: ValidationResult): void {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Validation Results                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Total accounts: ${result.accountCount}`);
  console.log(`   ❌ Errors: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  console.log('');
  
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    console.log('');
    for (const warning of result.warnings) {
      console.log(`   • ${warning}`);
    }
    console.log('');
  }
  
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    console.log('');
    for (const error of result.errors) {
      console.log(`   • ${error}`);
    }
    console.log('');
  }
  
  if (result.passed) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ VALIDATION PASSED                                       ║');
    console.log('║                                                            ║');
    console.log('║  The COA data file is valid and ready for use.             ║');
    console.log('║  You can now run: pnpm update-coa                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ VALIDATION FAILED                                       ║');
    console.log('║                                                            ║');
    console.log('║  Please fix the errors above before running COA update.    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  const filePath = 'scripts/new-coa-data.json';
  
  try {
    const result = await validateCOAData(filePath);
    displayResults(result);
    
    // Exit with appropriate status code
    process.exit(result.passed ? 0 : 1);
    
  } catch (error: any) {
    console.error('');
    console.error('❌ CRITICAL ERROR');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
