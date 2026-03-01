# Requirements Document

## Introduction

This document specifies requirements for the Complete Chart of Accounts (COA) Replacement feature. The feature enables safe replacement and updating of the entire Chart of Accounts for Berkat Abadi Cirebon (BAC) company in the ERPNext system, migrating from existing accounts to 143 properly structured accounts while maintaining data integrity and avoiding deletion of accounts linked to critical system components.

## Glossary

- **COA_Manager**: The system component responsible for managing Chart of Accounts operations
- **Account**: A financial account in the Chart of Accounts with properties like account_number, account_name, account_type, is_group, parent_account
- **Group_Account**: An account with is_group=1 that can have child accounts
- **Ledger_Account**: An account with is_group=0 that cannot have children and is used for transactions
- **Root_Type**: Top-level account classification (Asset, Liability, Equity, Income, Expense)
- **Account_Type**: Specific classification within root type (e.g., Bank, Cash, Receivable, Payable, Stock)
- **Company_Default_Account**: Accounts referenced by Company doctype for default operations
- **Payment_Mode_Account**: Accounts linked to payment methods
- **Tax_Template_Account**: Accounts linked to tax calculation templates
- **Account_Number**: Unique numeric identifier for an account (e.g., 1128000, 2150.0001)
- **Account_Name**: Human-readable name for an account (ERPNext automatically appends " - {company_abbr}")
- **Parent_Child_Relationship**: Hierarchical structure where Group_Accounts contain child accounts
- **Special_Account**: Accounts with unique business logic (Hutang Komisi Sales)
- **ERPNext_API**: REST API interface to ERPNext backend
- **Account_Hierarchy**: The tree structure of accounts from root types down to leaf ledger accounts
- **Multi_Currency_Account**: Accounts that support foreign currencies (USD, SGD) in addition to IDR
- **Company_Abbreviation**: The suffix automatically appended by ERPNext to account names (e.g., " - BAC")

## Requirements

### Requirement 1: Safe Account Update Strategy

**User Story:** As a system administrator, I want to update existing accounts instead of deleting them, so that I avoid breaking references to Company defaults, Payment Modes, and Tax Templates.

#### Acceptance Criteria

1. WHEN an account exists in both current COA and new COA data, THE COA_Manager SHALL update the existing account properties
2. THE COA_Manager SHALL NOT delete any existing accounts during the replacement process
3. WHEN updating an account, THE COA_Manager SHALL preserve the account's name field in ERPNext
4. FOR ALL accounts being updated, THE COA_Manager SHALL verify the account is not linked to critical system components before modifying is_group property
5. WHEN an account cannot be safely updated, THE COA_Manager SHALL log a warning and skip that account

### Requirement 2: New Account Creation

**User Story:** As a system administrator, I want to create new accounts from the 143-account dataset, so that the COA includes all required financial accounts.

#### Acceptance Criteria

1. WHEN an account exists in new COA data but not in current COA, THE COA_Manager SHALL create the new account
2. THE COA_Manager SHALL create parent Group_Accounts before creating their child accounts
3. WHEN creating an account, THE COA_Manager SHALL NOT append " - BAC" suffix to account_name because ERPNext adds Company_Abbreviation automatically
4. THE COA_Manager SHALL set account_number, account_name, account_type, root_type, is_group, parent_account, and account_currency properties for each new account
5. WHEN creating a Ledger_Account, THE COA_Manager SHALL set is_group to 0
6. WHEN creating a Group_Account, THE COA_Manager SHALL set is_group to 1
7. WHERE an account specifies account_currency other than IDR, THE COA_Manager SHALL set the currency property to support multi-currency transactions

### Requirement 3: Account Naming Convention

**User Story:** As a system administrator, I want accounts to follow ERPNext naming conventions, so that account names are consistent and avoid duplication issues.

#### Acceptance Criteria

1. THE COA_Manager SHALL provide account_name without " - BAC" suffix when creating or updating accounts
2. THE COA_Manager SHALL NOT create accounts with duplicate "BAC - BAC" patterns in the name
3. WHEN reading account names from new COA data, THE COA_Manager SHALL strip any existing " - BAC" suffix before sending to ERPNext_API
4. FOR ALL accounts, THE COA_Manager SHALL use account_number as the primary identifier for matching existing accounts
5. THE COA_Manager SHALL validate that account_name combined with Company_Abbreviation does not exceed ERPNext field length limits
6. THE COA_Manager SHALL ensure account_name field contains only the base name without company suffix

### Requirement 4: Parent-Child Relationship Management

**User Story:** As a system administrator, I want proper parent-child relationships established, so that the account hierarchy is correctly structured and navigable.

#### Acceptance Criteria

1. THE COA_Manager SHALL create parent accounts before their children in the hierarchy
2. WHEN an account has a parent_account specified, THE COA_Manager SHALL verify the parent exists before creating the child
3. IF a parent account does not exist, THEN THE COA_Manager SHALL create the parent account first
4. THE COA_Manager SHALL NOT allow Ledger_Accounts (is_group=0) to have child accounts
5. WHEN converting an account from Ledger to Group, THE COA_Manager SHALL verify no transactions exist for that account
6. THE COA_Manager SHALL maintain the complete hierarchy from Root_Type down to leaf Ledger_Accounts

### Requirement 5: Special Account Handling

**User Story:** As a system administrator, I want special accounts like Hutang Komisi Sales properly configured, so that business-specific financial operations work correctly.

#### Acceptance Criteria

1. THE COA_Manager SHALL create Hutang Komisi Sales account with account_number 2150 as a Ledger_Account (is_group=0)
2. THE COA_Manager SHALL set Hutang Komisi Sales parent_account to "2100.000 - Liabilitas Jangka Pendek - BAC"
3. THE COA_Manager SHALL set Hutang Komisi Sales account_type to "Payable"
4. THE COA_Manager SHALL NOT create Warkat Masuk or Warkat Keluar accounts as these are removed from the new COA structure
5. FOR ALL special accounts, THE COA_Manager SHALL set appropriate root_type properties

### Requirement 6: Account Type Classification

**User Story:** As a system administrator, I want accounts properly classified by type, so that financial reports and operations use the correct account categories.

#### Acceptance Criteria

1. THE COA_Manager SHALL set root_type to one of: Asset, Liability, Equity, Income, or Expense for each account
2. WHEN account_type is specified in new COA data, THE COA_Manager SHALL set it on the account
3. THE COA_Manager SHALL validate that account_type is compatible with root_type according to ERPNext rules
4. FOR ALL bank and cash accounts, THE COA_Manager SHALL set appropriate account_type (Bank, Cash)
5. FOR ALL receivable and payable accounts, THE COA_Manager SHALL set appropriate account_type (Receivable, Payable)
6. FOR ALL accounts with multi-currency support, THE COA_Manager SHALL set account_currency to the specified currency (IDR, USD, or SGD)

### Requirement 7: Multi-Currency Account Support

**User Story:** As a system administrator, I want accounts to support multiple currencies, so that foreign currency transactions can be properly recorded.

#### Acceptance Criteria

1. THE COA_Manager SHALL set account_currency property for each account based on new COA data
2. WHEN account_currency is IDR, THE COA_Manager SHALL set it as the default currency
3. WHERE account_currency is USD or SGD, THE COA_Manager SHALL enable multi-currency support for that account
4. THE COA_Manager SHALL validate that currency codes are valid ISO currency codes
5. FOR ALL multi-currency accounts, THE COA_Manager SHALL verify ERPNext supports the specified currency

### Requirement 8: Data Validation and Error Handling

**User Story:** As a system administrator, I want comprehensive validation and error reporting, so that I can identify and fix issues during the COA replacement process.

#### Acceptance Criteria

1. WHEN new COA data is loaded, THE COA_Manager SHALL validate JSON structure and required fields
2. THE COA_Manager SHALL validate that all account_numbers are unique within the dataset
3. WHEN an API error occurs, THE COA_Manager SHALL log the error with account details and continue processing remaining accounts
4. THE COA_Manager SHALL generate a summary report showing: accounts created, accounts updated, accounts skipped, and errors encountered
5. IF a parent account reference is invalid, THEN THE COA_Manager SHALL log an error and skip that account
6. THE COA_Manager SHALL validate that account hierarchy does not create circular references

### Requirement 8: Company Default Account Updates

**User Story:** As a system administrator, I want company default accounts updated to reference new COA accounts, so that default financial operations use the correct accounts.

#### Acceptance Criteria

1. WHEN COA replacement completes, THE COA_Manager SHALL identify which company default accounts need updating
2. THE COA_Manager SHALL provide a report of current company default accounts and recommended new values based on the 143-account structure
3. WHERE company default account updates are requested, THE COA_Manager SHALL update Company doctype default account fields
4. THE COA_Manager SHALL validate that new default accounts exist before updating company references
5. THE COA_Manager SHALL preserve existing default account references if corresponding accounts are not in new COA data

### Requirement 9: Idempotent Execution

**User Story:** As a system administrator, I want to run the COA replacement script multiple times safely, so that I can recover from partial failures or make incremental updates.

#### Acceptance Criteria

1. WHEN the COA replacement script runs multiple times with same data, THE COA_Manager SHALL produce the same final state
2. THE COA_Manager SHALL detect already-created accounts and skip recreation
3. THE COA_Manager SHALL detect already-updated accounts and skip re-updating if properties match
4. THE COA_Manager SHALL handle partial completion gracefully and resume from where it stopped
5. FOR ALL operations, THE COA_Manager SHALL use account_number as the idempotency key

### Requirement 10: Verification and Reporting

**User Story:** As a system administrator, I want detailed verification of the COA replacement results, so that I can confirm all 143 accounts are correctly configured.

#### Acceptance Criteria

1. WHEN COA replacement completes, THE COA_Manager SHALL generate a verification report
2. THE verification report SHALL include: total accounts in system, accounts by root_type, accounts by account_type, accounts by currency, orphaned accounts, and hierarchy validation results
3. THE COA_Manager SHALL verify that all 143 accounts from new COA data exist in the system
4. THE COA_Manager SHALL identify any accounts in the system not present in new COA data
5. THE COA_Manager SHALL validate that Parent_Child_Relationships match the new COA data structure
6. THE COA_Manager SHALL verify that no Ledger_Accounts have children
7. THE COA_Manager SHALL verify that all leaf accounts are Ledger_Accounts (is_group=0)
8. THE COA_Manager SHALL verify that multi-currency accounts have correct currency settings

### Requirement 11: Transaction Preservation

**User Story:** As a system administrator, I want existing financial transactions preserved during COA updates, so that historical financial data remains intact and accurate.

#### Acceptance Criteria

1. THE COA_Manager SHALL NOT modify accounts that have existing GL Entry transactions without explicit confirmation
2. WHEN an account with transactions needs property changes, THE COA_Manager SHALL log a warning
3. THE COA_Manager SHALL preserve all existing GL Entry, Journal Entry, and other transaction references to accounts
4. THE COA_Manager SHALL verify transaction integrity after COA replacement completes
5. IF transaction integrity issues are detected, THEN THE COA_Manager SHALL report affected accounts and transaction counts

### Requirement 12: Batch Processing and Performance

**User Story:** As a system administrator, I want efficient processing of 143 accounts, so that the COA replacement completes in reasonable time.

#### Acceptance Criteria

1. THE COA_Manager SHALL process accounts in batches to optimize API calls
2. THE COA_Manager SHALL implement retry logic for transient API failures
3. WHEN processing large account sets, THE COA_Manager SHALL provide progress updates every 10 accounts
4. THE COA_Manager SHALL complete processing of 143 accounts within 3 minutes under normal conditions
5. THE COA_Manager SHALL implement rate limiting to avoid overwhelming ERPNext_API

