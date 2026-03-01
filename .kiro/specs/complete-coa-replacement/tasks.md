# Implementation Plan: Complete COA Replacement

## Overview

This implementation plan covers the development of a safe, idempotent Chart of Accounts replacement system for Berkat Abadi Cirebon. The system will process 143 accounts using a safe update strategy (no deletions), maintain hierarchy integrity, and provide comprehensive verification. Implementation uses TypeScript with tsx runner, ERPNext REST API client, and fast-check for property-based testing.

## Tasks

- [x] 1. Prepare COA data file
  - Create `scripts/new-coa-data.json` with 143 accounts from requirements
  - Include all required fields: account_number, account_name, company, parent_account, is_group, root_type, report_type, account_type, account_currency
  - Ensure special accounts included: Hutang Komisi Sales (2150), multi-currency accounts
  - Validate JSON structure is valid
  - _Requirements: 2.1, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 8.1_

- [-] 2. Implement data validation utilities
  - [x] 2.1 Create `scripts/lib/coa-validation.ts` with validation functions
    - Implement `validateCOAData()` to check JSON structure and required fields
    - Implement `validateAccountNumber()` to ensure uniqueness
    - Implement `validateCurrency()` to check ISO 4217 codes
    - Implement `validateRootType()` to verify valid root types
    - Implement `validateAccountTypeCompatibility()` to check root_type/account_type compatibility
    - _Requirements: 6.1, 6.3, 7.4, 8.1, 8.2, 9.1_
  
  - [ ]* 2.2 Write property test for data validation
    - **Property 19: Valid JSON Structure**
    - **Validates: Requirements 8.1**
  
  - [ ]* 2.3 Write property test for account number uniqueness
    - **Property 2: Account Number Uniqueness**
    - **Validates: Requirements 8.2**
  
  - [ ]* 2.4 Write property test for valid root types
    - **Property 9: Valid Root Type**
    - **Validates: Requirements 6.1**
  
  - [ ]* 2.5 Write property test for valid currency codes
    - **Property 12: Valid Currency Codes**
    - **Validates: Requirements 7.4**

- [x] 3. Implement name handling utilities
  - [x] 3.1 Create `scripts/lib/name-utils.ts` with name processing functions
    - Implement `stripBacSuffix()` to remove " - BAC" from account names
    - Implement `extractAccountNumber()` to parse account number from parent references
    - Implement `validateAccountNameLength()` to check ERPNext field limits
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.5, 3.6_
  
  - [ ]* 3.2 Write property test for BAC suffix stripping
    - **Property 3: BAC Suffix Stripping**
    - **Validates: Requirements 2.3, 3.1, 3.2, 3.3, 3.6_
  
  - [ ]* 3.3 Write property test for account name length validation
    - **Property 18: Account Name Length Validation**
    - **Validates: Requirements 3.5**

- [x] 4. Implement hierarchy validation
  - [x] 4.1 Create `scripts/lib/hierarchy-validator.ts` with HierarchyValidator class
    - Implement `sortByHierarchy()` using topological sort (Kahn's algorithm)
    - Implement `validateParentExists()` to check parent account availability
    - Implement `detectCircularReferences()` to find circular dependencies
    - Implement `canConvertToGroup()` to check transaction safety
    - _Requirements: 2.2, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6_
  
  - [ ]* 4.2 Write property test for parent-before-child ordering
    - **Property 4: Parent Before Child Ordering**
    - **Validates: Requirements 2.2, 4.1, 4.2, 4.3**
  
  - [ ]* 4.3 Write property test for circular reference detection
    - **Property 23: Circular Reference Detection**
    - **Validates: Requirements 8.6**
  
  - [ ]* 4.4 Write unit tests for hierarchy validator
    - Test 3-level deep hierarchies
    - Test invalid parent references
    - Test edge cases with empty parent_account fields

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement account processor
  - [x] 6.1 Create `scripts/lib/account-processor.ts` with AccountProcessor class
    - Implement `processAccount()` to create or update single account
    - Implement `findExistingAccount()` to lookup by account_number
    - Implement `createAccount()` to create new account via API
    - Implement `updateAccount()` to update existing account properties
    - Implement `hasTransactions()` to check GL Entry existence
    - Implement retry logic with exponential backoff
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 2.6, 2.7, 3.4, 9.2, 9.3, 12.2_
  
  - [ ]* 6.2 Write property test for account creation
    - **Property 7: Required Properties Set**
    - **Validates: Requirements 2.4**
  
  - [ ]* 6.3 Write property test for ledger account is_group value
    - **Property 5: Ledger Account is_group Value**
    - **Validates: Requirements 2.5**
  
  - [ ]* 6.4 Write property test for group account is_group value
    - **Property 6: Group Account is_group Value**
    - **Validates: Requirements 2.6**
  
  - [ ]* 6.5 Write property test for account number as idempotency key
    - **Property 8: Account Number as Idempotency Key**
    - **Validates: Requirements 3.4, 9.5**
  
  - [ ]* 6.6 Write property test for multi-currency account configuration
    - **Property 11: Multi-Currency Account Configuration**
    - **Validates: Requirements 2.7, 6.6, 7.1, 7.2, 7.3, 10.8**
  
  - [ ]* 6.7 Write property test for transaction safety
    - **Property 15: Transaction Safety for is_group Changes**
    - **Validates: Requirements 1.4, 4.5, 11.1**
  
  - [ ]* 6.8 Write property test for update skipping
    - **Property 16: Update Skipping for Unsafe Operations**
    - **Validates: Requirements 1.5**
  
  - [ ]* 6.9 Write property test for ERPNext name preservation
    - **Property 17: ERPNext Name Preservation**
    - **Validates: Requirements 1.3**
  
  - [ ]* 6.10 Write property test for retry logic
    - **Property 34: Retry Logic for Transient Failures**
    - **Validates: Requirements 12.2**
  
  - [ ]* 6.11 Write unit tests for account processor
    - Test specific account creation (Hutang Komisi Sales with account_number 2150)
    - Test API error responses
    - Test existing account detection

- [x] 7. Implement COA manager
  - [x] 7.1 Create `scripts/lib/coa-manager.ts` with COAManager class
    - Implement `execute()` to orchestrate complete replacement process
    - Implement `loadCOAData()` to load and validate JSON file
    - Implement `processAccounts()` to process all accounts in order
    - Implement progress logging every 10 accounts
    - Implement error handling with continuation
    - Generate processing summary with counts
    - _Requirements: 1.1, 1.2, 8.3, 8.4, 9.1, 9.4, 12.1, 12.3_
  
  - [ ]* 7.2 Write property test for no account deletion
    - **Property 1: No Account Deletion**
    - **Validates: Requirements 1.2, 11.3**
  
  - [ ]* 7.3 Write property test for idempotent execution
    - **Property 24: Idempotent Execution**
    - **Validates: Requirements 9.1**
  
  - [ ]* 7.4 Write property test for existing account detection
    - **Property 25: Existing Account Detection**
    - **Validates: Requirements 9.2**
  
  - [ ]* 7.5 Write property test for unnecessary update skipping
    - **Property 26: Unnecessary Update Skipping**
    - **Validates: Requirements 9.3**
  
  - [ ]* 7.6 Write property test for partial completion resumability
    - **Property 27: Partial Completion Resumability**
    - **Validates: Requirements 9.4**
  
  - [ ]* 7.7 Write property test for error handling continuity
    - **Property 20: Error Handling Continuity**
    - **Validates: Requirements 8.3**
  
  - [ ]* 7.8 Write property test for progress logging
    - **Property 35: Progress Logging**
    - **Validates: Requirements 12.3**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement verification reporter
  - [x] 9.1 Create `scripts/lib/verification-reporter.ts` with VerificationReporter class
    - Implement `generateReport()` to create comprehensive verification report
    - Implement `verifyAccountsExist()` to check all 143 accounts present
    - Implement `validateHierarchy()` to check parent-child relationships
    - Implement `findOrphanedAccounts()` to identify invalid parent references
    - Implement `checkLedgerAccounts()` to verify no ledger accounts have children
    - Implement `checkLeafAccounts()` to verify all leaf accounts are ledgers
    - Implement formatted report output with summary statistics
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.4, 11.5_
  
  - [ ]* 9.2 Write property test for complete account verification
    - **Property 28: Complete Account Verification**
    - **Validates: Requirements 10.3**
  
  - [ ]* 9.3 Write property test for extra account identification
    - **Property 29: Extra Account Identification**
    - **Validates: Requirements 10.4**
  
  - [ ]* 9.4 Write property test for hierarchy relationship validation
    - **Property 30: Hierarchy Relationship Validation**
    - **Validates: Requirements 10.5**
  
  - [ ]* 9.5 Write property test for no ledger accounts with children
    - **Property 13: No Ledger Accounts with Children**
    - **Validates: Requirements 4.4, 10.6**
  
  - [ ]* 9.6 Write property test for leaf accounts are ledgers
    - **Property 14: Leaf Accounts are Ledgers**
    - **Validates: Requirements 10.7**
  
  - [ ]* 9.7 Write property test for transaction integrity preservation
    - **Property 32: Transaction Integrity Preservation**
    - **Validates: Requirements 11.4**
  
  - [ ]* 9.8 Write property test for summary report completeness
    - **Property 21: Summary Report Completeness**
    - **Validates: Requirements 8.4, 10.1, 10.2**

- [x] 10. Create main update script
  - [x] 10.1 Create `scripts/update-coa.ts` main script
    - Import COAManager and initialize with ERPNext client
    - Load environment variables for API authentication
    - Execute COA replacement with error handling
    - Display processing summary
    - Save change log to file
    - Add --dry-run flag support for preview mode
    - _Requirements: 1.1, 1.2, 8.4, 9.1, 12.1_
  
  - [ ]* 10.2 Write integration test for update script
    - Test end-to-end execution with mock ERPNext API
    - Test dry-run mode
    - Test error recovery

- [x] 11. Create verification script
  - [x] 11.1 Create `scripts/verify-coa.ts` verification script
    - Import VerificationReporter and initialize with ERPNext client
    - Load environment variables for API authentication
    - Run verification and generate report
    - Display formatted report output
    - Exit with appropriate status code based on verification result
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ]* 11.2 Write integration test for verification script
    - Test verification with complete COA
    - Test verification with missing accounts
    - Test verification with hierarchy errors

- [x] 12. Create data validation script
  - [x] 12.1 Create `scripts/validate-coa-data.ts` pre-flight validation script
    - Load new-coa-data.json file
    - Run all validation checks (structure, uniqueness, circular references)
    - Display validation results
    - Exit with appropriate status code
    - _Requirements: 8.1, 8.2, 8.5, 8.6_
  
  - [ ]* 12.2 Write unit tests for validation script
    - Test with valid COA data
    - Test with invalid JSON structure
    - Test with duplicate account numbers
    - Test with circular references

- [x] 13. Add package.json scripts
  - Add `"update-coa": "tsx scripts/update-coa.ts"` to package.json scripts
  - Add `"verify-coa": "tsx scripts/verify-coa.ts"` to package.json scripts
  - Add `"validate-coa-data": "tsx scripts/validate-coa-data.ts"` to package.json scripts
  - _Requirements: 12.1_

- [x] 14. Create documentation
  - [x] 14.1 Create `docs/coa-replacement-guide.md` user guide
    - Document prerequisites and setup
    - Document execution steps with examples
    - Document safety measures and rollback procedures
    - Document verification process
    - Include troubleshooting section
    - _Requirements: 1.1, 1.2, 8.4, 9.1, 10.1_
  
  - [x] 14.2 Add inline code documentation
    - Add JSDoc comments to all public functions and classes
    - Document parameters, return types, and error conditions
    - Add usage examples in comments

- [x] 15. Final checkpoint - Complete verification
  - Run `pnpm validate-coa-data` to verify data file
  - Run `pnpm update-coa --dry-run` to preview changes
  - Run `pnpm verify-coa` to check current COA state
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript with tsx runner for script execution
- All scripts use the ERPNext API client from `lib/erpnext.ts`
- The safe update strategy ensures no accounts are deleted during replacement
- Idempotency is guaranteed through account_number-based matching
