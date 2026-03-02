# Implementation Plan - Financial Reports Comprehensive Fix

## Phase 1: Exploratory Testing (BEFORE Fix)

- [ ] 1. Write bug condition exploration tests for all 10 bugs
  - **Property 1: Fault Condition** - Financial Reports Bug Exploration
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope properties to concrete failing cases to ensure reproducibility
  - Test implementation details from Fault Condition in design
  - The test assertions should match the Expected Behavior Properties from design
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1-1.20_

  - [ ] 1.1 Bug #1 - Balance Sheet Missing Net P/L
    - Create test company with Income and Expense GL entries for current period
    - Request Balance Sheet with as_of_date = current period end
    - Assert: Total Assets ≠ Total Liabilities + Total Equity (will fail - proves imbalance)
    - Calculate expected Net P/L manually, verify it's missing from equity
    - Document counterexample: Assets = X, Liabilities + Equity = Y, difference = Net P/L

  - [ ] 1.2 Bug #2 - AR Report Missing Sales Returns
    - Create Sales Invoice with outstanding amount
    - Create Sales Return (is_return = 1) against the invoice
    - Request AR report
    - Assert: Outstanding amount doesn't reflect the return (will fail)
    - Document counterexample: Shows 50M outstanding when actual is 45M (5M overstatement)

  - [ ] 1.3 Bug #3 - AP Report Missing Purchase Returns
    - Create Purchase Invoice with outstanding amount
    - Create Purchase Return (is_return = 1) against the invoice
    - Request AP report
    - Assert: Outstanding amount doesn't reflect the return (will fail)
    - Document counterexample: Shows 30M outstanding when actual is 28M (2M overstatement)

  - [ ] 1.4 Bug #4 - Date Validation Missing
    - Request any report with from_date = '2024-12-31', to_date = '2024-01-01'
    - Assert: No error returned, empty or incorrect data (will fail)
    - Document counterexample: Returns 200 OK with empty data instead of 400 error

  - [ ] 1.5 Bug #5 - VAT Report Hardcoded Tax Rate
    - Create Sales Invoice with 5% tax rate (not 11%)
    - Request VAT report
    - Assert: DPP calculated incorrectly using 0.11 instead of 0.05 (will fail)
    - Document counterexample: DPP = 20M calculated as 9.09M (incorrect)

  - [ ] 1.6 Bug #6 - Cash Flow Name-Based Filter
    - Create Cash account named "1110 - Petty Cash" (no "Kas" or "Bank" keyword)
    - Set account_type = 'Cash'
    - Request Cash Flow report
    - Assert: Account not included in report (will fail)
    - Document counterexample: Valid cash account missing from report

  - [ ] 1.7 Bug #7 - HPP Ledger Overly Broad Filter
    - Create account "6100 - HPP Adjustment" with account_type ≠ 'Cost of Goods Sold'
    - Request HPP Ledger report
    - Assert: Account incorrectly included in report (will fail)
    - Document counterexample: Non-COGS account included in HPP report

  - [ ] 1.8 Bug #8 - P&L Hardcoded Discount Accounts
    - Create discount account "4350 - Sales Discount" (not 4300)
    - Request Profit & Loss report
    - Assert: Discount not recognized, incorrect net sales calculation (will fail)
    - Document counterexample: Discount not deducted from gross sales

  - [ ] 1.9 Bug #9 - Balance Sheet Hardcoded Categorization
    - Create account "1500 - Short-term Investments" with account_type = 'Receivable'
    - Request Balance Sheet
    - Assert: Account miscategorized as Fixed Asset instead of Current Asset (will fail)
    - Document counterexample: Incorrect Current/Fixed categorization

  - [ ] 1.10 Bug #10 - Currency Formatting Inconsistency
    - Request multiple reports (Balance Sheet, AR, AP, VAT, P&L)
    - Compare currency formatting across reports
    - Assert: Inconsistent formatting (will fail)
    - Document counterexample: Different formats like "Rp1.000.000,00" vs "Rp 1.000.000,00"

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1-3.27_

  - [ ] 2.1 Balance Sheet - Zero Net P/L Period
    - Observe: Run Balance Sheet on unfixed code for period with zero Net P/L
    - Write property: For all periods with zero Net P/L, Balance Sheet produces same results
    - Verify test passes on UNFIXED code

  - [ ] 2.2 AR/AP - No Returns
    - Observe: Run AR/AP reports on unfixed code with no Sales/Purchase Returns
    - Write property: For all invoices without returns, outstanding amounts unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.3 Valid Date Ranges
    - Observe: Run reports with valid from_date <= to_date on unfixed code
    - Write property: For all valid date ranges, reports produce results (validation passes)
    - Verify test passes on UNFIXED code

  - [ ] 2.4 VAT - Standard 11% Rate
    - Observe: Run VAT report with 11% tax rate on unfixed code
    - Write property: For all invoices with 11% rate, DPP calculations unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.5 Cash Flow - Standard Account Names
    - Observe: Run Cash Flow with accounts containing "Kas" or "Bank" on unfixed code
    - Write property: For all accounts with standard names, results unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.6 HPP Ledger - Only COGS Accounts
    - Observe: Run HPP Ledger with only true COGS accounts on unfixed code
    - Write property: For all COGS-only scenarios, results unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.7 P&L - Standard Discount Accounts (4300/5300)
    - Observe: Run P&L with standard discount accounts on unfixed code
    - Write property: For all standard discount accounts, net sales/COGS calculations unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.8 Balance Sheet - Standard Account Structure
    - Observe: Run Balance Sheet with standard account structure on unfixed code
    - Write property: For all standard structures, categorization unchanged
    - Verify test passes on UNFIXED code

  - [ ] 2.9 All Reports - Response Structure
    - Observe: Capture response JSON structure from unfixed code
    - Write property: For all reports, response structure maintained (only values change for buggy inputs)
    - Verify test passes on UNFIXED code

  - [ ] 2.10 Authentication and Authorization
    - Observe: Test authentication flows on unfixed code
    - Write property: For all auth scenarios, behavior unchanged (401 for unauthorized, API key/session work)
    - Verify test passes on UNFIXED code

## Phase 2: Create Shared Utilities

- [x] 3. Create date validation utility
  - Create `utils/report-validation.ts` with validateDateRange function
  - Implement validation for from_date <= to_date
  - Implement validation for valid date formats (YYYY-MM-DD)
  - Return { valid: boolean, error?: string }
  - _Bug_Condition: from_date > to_date OR invalid date format_
  - _Expected_Behavior: Return error message for invalid dates_
  - _Preservation: Valid dates pass through unchanged_
  - _Requirements: 2.7, 2.8_

- [x] 4. Verify centralized formatCurrency utility
  - Check `utils/format.ts` has formatCurrency function
  - Ensure consistent format: "Rp 1.000.000,00" (space after Rp, dot for thousands, comma for decimals)
  - Use Intl.NumberFormat('id-ID') for Indonesian formatting
  - Handle positive, negative, and zero amounts
  - _Bug_Condition: Multiple formatCurrency implementations across files_
  - _Expected_Behavior: Single consistent utility function_
  - _Preservation: Existing format style maintained_
  - _Requirements: 2.19, 2.20_

- [x] 5. Create account helpers utility
  - Create `utils/account-helpers.ts` with helper functions
  - Implement isDiscountAccount(account: AccountMaster): boolean
    - Check account_name for "potongan" or "discount"
    - Check parent_account for "potongan" or "discount"
  - Implement isCurrentAsset(account: AccountMaster): boolean
    - Check account_type in ['Cash', 'Bank', 'Receivable', 'Stock', 'Tax']
  - Implement isCurrentLiability(account: AccountMaster): boolean
    - Check account_type in ['Payable', 'Tax']
  - _Bug_Condition: Hardcoded account numbers for categorization_
  - _Expected_Behavior: Flexible account_type based categorization_
  - _Preservation: Standard account structures work unchanged_
  - _Requirements: 2.15, 2.16, 2.17, 2.18_

- [x] 6. Create shared type definitions
  - Create `types/financial-reports.ts` with shared types
  - Define AccountMaster interface (name, account_name, account_type, root_type, parent_account, is_group, account_number)
  - Define GlEntry interface (account, debit, credit, posting_date, voucher_type, voucher_no, against, remarks)
  - Define ReportLine interface (account, account_name, account_number, account_type, amount, formatted_amount)
  - Define VatInvoiceDetail interface (tanggal, nomor_invoice, customer_supplier, dpp, ppn, tax_rate, formatted_dpp, formatted_ppn)
  - Define DateValidationResult interface (valid, error?)
  - _Requirements: All bugs - shared types_

## Phase 3: Fix Balance Sheet

- [-] 7. Fix Balance Sheet for Bug #1, #9, #10

  - [x] 7.1 Implement Net P/L calculation and add to equity
    - After calculating equity from GL entries, calculate Net P/L
    - Query Income accounts and sum (credit - debit) for total income
    - Query Expense accounts and sum (debit - credit) for total expense
    - Calculate netProfitLoss = totalIncome - totalExpense
    - Add netProfitLoss to totalEquity
    - Update total_liabilities_and_equity calculation
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'balance-sheet' AND hasNetProfitLoss(input.company, input.as_of_date)_
    - _Expected_Behavior: Total Equity includes Net P/L, Balance Sheet balances (Assets = Liabilities + Equity)_
    - _Preservation: Zero Net P/L periods produce same results_
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Replace hardcoded categorization with account_type
    - Import isCurrentAsset and isCurrentLiability from account-helpers
    - Replace hardcoded account number checks (1410, 2210, 2230, 2240) with account_type checks
    - For Assets: if isCurrentAsset(master) then currentAssets else fixedAssets
    - For Liabilities: if isCurrentLiability(master) then currentLiabilities else longTermLiabilities
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'balance-sheet' AND hasCustomAccountStructure(input.company)_
    - _Expected_Behavior: Categorization based on account_type, works with any account structure_
    - _Preservation: Standard account structures produce same categorization_
    - _Requirements: 2.17, 2.18_

  - [x] 7.3 Use centralized formatCurrency
    - Remove local formatCurrency function from Balance Sheet route
    - Import formatCurrency from '@/utils/format'
    - Apply to all amount formatting in response
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'balance-sheet'_
    - _Expected_Behavior: Consistent "Rp 1.000.000,00" format_
    - _Preservation: Format style unchanged, only consistency improved_
    - _Requirements: 2.19, 2.20_

  - [x] 7.4 Add date validation
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation at start of GET function after extracting query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Preservation: Valid dates pass through unchanged_
    - _Requirements: 2.7, 2.8_

  - [ ] 7.5 Verify Bug #1 exploration test now passes
    - **Property 1: Expected Behavior** - Balance Sheet Balances with Net P/L
    - **IMPORTANT**: Re-run the SAME test from task 1.1 - do NOT write a new test
    - The test from task 1.1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run Balance Sheet test with Net P/L scenario
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 7.6 Verify Bug #9 exploration test now passes
    - **Property 1: Expected Behavior** - Balance Sheet Flexible Categorization
    - **IMPORTANT**: Re-run the SAME test from task 1.9 - do NOT write a new test
    - Run Balance Sheet test with custom account structure
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.17, 2.18_

  - [ ] 7.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Balance Sheet Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from tasks 2.1, 2.8 - do NOT write new tests
    - Run preservation tests for zero Net P/L and standard account structure
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 4: Fix Accounts Receivable Report

- [-] 8. Fix Accounts Receivable for Bug #2, #10

  - [x] 8.1 Implement Sales Returns query and deduction
    - After fetching outstanding Sales Invoices, query Sales Returns
    - Fetch Sales Invoice with filters: docstatus = 1, company = company, is_return = 1
    - Build returnsMap: Map<invoice_name, return_amount>
    - For each return, map to return_against (original invoice)
    - Adjust outstanding amounts: adjustedOutstanding = max(0, outstanding_amount - returnAmount)
    - Add return_amount field to response
    - Filter out invoices with zero outstanding after returns
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'accounts-receivable' AND hasSalesReturns(input.company)_
    - _Expected_Behavior: Outstanding AR accurately reflects returns deduction_
    - _Preservation: Invoices without returns show same outstanding amounts_
    - _Requirements: 2.3, 2.4_

  - [x] 8.2 Use centralized formatCurrency
    - Remove local formatCurrency function from AR route
    - Import formatCurrency from '@/utils/format'
    - Apply to all amount formatting in response
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'accounts-receivable'_
    - _Expected_Behavior: Consistent "Rp 1.000.000,00" format_
    - _Preservation: Format style unchanged_
    - _Requirements: 2.19, 2.20_

  - [ ] 8.3 Verify Bug #2 exploration test now passes
    - **Property 1: Expected Behavior** - AR Report Deducts Sales Returns
    - **IMPORTANT**: Re-run the SAME test from task 1.2 - do NOT write a new test
    - Run AR report test with Sales Returns scenario
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3, 2.4_

  - [ ] 8.4 Verify preservation tests still pass
    - **Property 2: Preservation** - AR Report Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.2 - do NOT write new tests
    - Run preservation tests for invoices without returns
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 5: Fix Accounts Payable Report

- [-] 9. Fix Accounts Payable for Bug #3, #10

  - [x] 9.1 Implement Purchase Returns query and deduction
    - After fetching outstanding Purchase Invoices, query Purchase Returns
    - Fetch Purchase Invoice with filters: docstatus = 1, company = company, is_return = 1
    - Build returnsMap: Map<invoice_name, return_amount>
    - For each return, map to return_against (original invoice)
    - Adjust outstanding amounts: adjustedOutstanding = max(0, outstanding_amount - returnAmount)
    - Add return_amount field to response
    - Filter out invoices with zero outstanding after returns
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'accounts-payable' AND hasPurchaseReturns(input.company)_
    - _Expected_Behavior: Outstanding AP accurately reflects returns deduction_
    - _Preservation: Invoices without returns show same outstanding amounts_
    - _Requirements: 2.5, 2.6_

  - [x] 9.2 Use centralized formatCurrency
    - Remove local formatCurrency function from AP route
    - Import formatCurrency from '@/utils/format'
    - Apply to all amount formatting in response
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'accounts-payable'_
    - _Expected_Behavior: Consistent "Rp 1.000.000,00" format_
    - _Preservation: Format style unchanged_
    - _Requirements: 2.19, 2.20_

  - [ ] 9.3 Verify Bug #3 exploration test now passes
    - **Property 1: Expected Behavior** - AP Report Deducts Purchase Returns
    - **IMPORTANT**: Re-run the SAME test from task 1.3 - do NOT write a new test
    - Run AP report test with Purchase Returns scenario
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.5, 2.6_

  - [ ] 9.4 Verify preservation tests still pass
    - **Property 2: Preservation** - AP Report Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.2 - do NOT write new tests
    - Run preservation tests for invoices without returns
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 6: Fix VAT Report

- [x] 10. Fix VAT Report for Bug #5, #10, #4

  - [x] 10.1 Implement dynamic tax rate extraction
    - Create helper function getTaxRateForInvoice(voucherNo, voucherType, headers)
    - Query invoice document (Sales Invoice or Purchase Invoice) by voucher_no
    - Extract tax rate from taxes child table (taxes[0].rate)
    - Convert percentage to decimal (rate / 100)
    - Default to 0.11 if unable to determine
    - Modify PPN Output processing to use dynamic tax rate
    - Modify PPN Input processing to use dynamic tax rate
    - Calculate DPP = PPN / tax_rate (using actual rate)
    - Add tax_rate field to VatInvoiceDetail response
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'vat-report' AND hasNonStandardTaxRate(input.company, input.from_date, input.to_date)_
    - _Expected_Behavior: DPP calculated using actual tax rate from invoice_
    - _Preservation: 11% tax rate invoices produce same DPP calculations_
    - _Requirements: 2.9, 2.10_

  - [x] 10.2 Use centralized formatCurrency
    - Remove local formatCurrency function from VAT route
    - Import formatCurrency from '@/utils/format'
    - Apply to formatted_dpp and formatted_ppn
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'vat-report'_
    - _Expected_Behavior: Consistent "Rp 1.000.000,00" format_
    - _Preservation: Format style unchanged_
    - _Requirements: 2.19, 2.20_

  - [x] 10.3 Add date validation
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation at start of GET function after extracting query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Preservation: Valid dates pass through unchanged_
    - _Requirements: 2.7, 2.8_

  - [ ] 10.4 Verify Bug #5 exploration test now passes
    - **Property 1: Expected Behavior** - VAT Report Dynamic Tax Rate
    - **IMPORTANT**: Re-run the SAME test from task 1.5 - do NOT write a new test
    - Run VAT report test with 5% tax rate scenario
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.9, 2.10_

  - [ ] 10.5 Verify preservation tests still pass
    - **Property 2: Preservation** - VAT Report Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.4 - do NOT write new tests
    - Run preservation tests for 11% tax rate invoices
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 7: Fix Cash Flow Report

- [-] 11. Fix Cash Flow for Bug #6, #4, #10

  - [x] 11.1 Replace name-based filter with account_type filter
    - Query Account master with filters: company = company, account_type IN ['Cash', 'Bank']
    - Extract account names into cashBankAccounts array
    - Use cashBankAccounts for GL Entry filtering (account IN cashBankAccounts)
    - Remove old name-based filter (LIKE '%Kas%' OR LIKE '%Bank%')
    - Handle empty cashBankAccounts case (return empty data)
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'cash-flow' AND hasCashAccountsWithoutKeywords(input.company)_
    - _Expected_Behavior: All Cash/Bank account_type accounts included regardless of name_
    - _Preservation: Accounts with standard names produce same results_
    - _Requirements: 2.11, 2.12_

  - [x] 11.2 Add date validation
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation at start of GET function after extracting query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Preservation: Valid dates pass through unchanged_
    - _Requirements: 2.7, 2.8_

  - [x] 11.3 Use centralized formatCurrency (if applicable)
    - Check if Cash Flow route uses formatCurrency
    - If yes, import from '@/utils/format'
    - Apply to all amount formatting
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'cash-flow'_
    - _Expected_Behavior: Consistent format if currency formatting used_
    - _Preservation: Format style unchanged_
    - _Requirements: 2.19, 2.20_

  - [ ] 11.4 Verify Bug #6 exploration test now passes
    - **Property 1: Expected Behavior** - Cash Flow account_type Filter
    - **IMPORTANT**: Re-run the SAME test from task 1.6 - do NOT write a new test
    - Run Cash Flow test with custom account names
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.11, 2.12_

  - [ ] 11.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Cash Flow Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.5 - do NOT write new tests
    - Run preservation tests for standard account names
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 8: Fix HPP Ledger Report

- [-] 12. Fix HPP Ledger for Bug #7, #4

  - [x] 12.1 Replace name-based filter with account_type filter
    - Query Account master with filters: company = company, account_type = 'Cost of Goods Sold'
    - Extract account names into cogsAccounts array
    - Use cogsAccounts for GL Entry filtering (account IN cogsAccounts)
    - Remove old name-based filter (LIKE '%HPP%')
    - Handle empty cogsAccounts case (return empty data with total 0)
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'hpp-ledger' AND hasNonCOGSAccountsWithHPP(input.company)_
    - _Expected_Behavior: Only COGS account_type accounts included_
    - _Preservation: True COGS accounts produce same results_
    - _Requirements: 2.13, 2.14_

  - [x] 12.2 Add date validation
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation at start of GET function after extracting query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Preservation: Valid dates pass through unchanged_
    - _Requirements: 2.7, 2.8_

  - [ ] 12.3 Verify Bug #7 exploration test now passes
    - **Property 1: Expected Behavior** - HPP Ledger account_type Filter
    - **IMPORTANT**: Re-run the SAME test from task 1.7 - do NOT write a new test
    - Run HPP Ledger test with non-COGS account containing "HPP"
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.13, 2.14_

  - [ ] 12.4 Verify preservation tests still pass
    - **Property 2: Preservation** - HPP Ledger Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.6 - do NOT write new tests
    - Run preservation tests for only COGS accounts
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 9: Fix Profit & Loss Report

- [-] 13. Fix Profit & Loss for Bug #8, #4, #10

  - [x] 13.1 Implement flexible discount detection
    - Import isDiscountAccount from '@/utils/account-helpers'
    - Replace hardcoded account number checks (4300, 5300) with isDiscountAccount(master)
    - For discount accounts:
      - If rootType = 'Income' or parent includes 'Income': Sales Discount (add to salesDiscountAmount)
      - If accountType = 'Cost of Goods Sold' or parent includes 'COGS': Purchase Discount (add to purchaseDiscountAmount)
    - Ensure discount accounts are included in appropriate sections (incomeAccounts or expenseAccounts)
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'profit-loss' AND hasDiscountAccountsNotIn4300or5300(input.company)_
    - _Expected_Behavior: Discount accounts identified by account_type/parent, not hardcoded numbers_
    - _Preservation: Standard discount accounts (4300/5300) produce same net sales/COGS_
    - _Requirements: 2.15, 2.16_

  - [-] 13.2 Add date validation
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation at start of GET function after extracting query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Preservation: Valid dates pass through unchanged_
    - _Requirements: 2.7, 2.8_

  - [x] 13.3 Use centralized formatCurrency
    - Remove local formatCurrency function from P&L route
    - Import formatCurrency from '@/utils/format'
    - Apply to all amount formatting in response
    - _Bug_Condition: isBugCondition(input) where input.report_type == 'profit-loss'_
    - _Expected_Behavior: Consistent "Rp 1.000.000,00" format_
    - _Preservation: Format style unchanged_
    - _Requirements: 2.19, 2.20_

  - [ ] 13.4 Verify Bug #8 exploration test now passes
    - **Property 1: Expected Behavior** - P&L Flexible Discount Detection
    - **IMPORTANT**: Re-run the SAME test from task 1.8 - do NOT write a new test
    - Run P&L test with custom discount account (4350)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.15, 2.16_

  - [ ] 13.5 Verify preservation tests still pass
    - **Property 2: Preservation** - P&L Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2.7 - do NOT write new tests
    - Run preservation tests for standard discount accounts
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 10: Apply Date Validation to Other Reports

- [-] 14. Apply Bug #4 fix to remaining reports with date parameters

  - [x] 14.1 Add date validation to Sales Report
    - File: `app/api/finance/reports/sales/route.ts`
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation after extracting from_date and to_date query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Requirements: 2.7, 2.8_

  - [x] 14.2 Add date validation to Purchases Report
    - File: `app/api/finance/reports/purchases/route.ts`
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation after extracting from_date and to_date query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Requirements: 2.7, 2.8_

  - [x] 14.3 Add date validation to Payment Summary Report
    - File: `app/api/finance/reports/payment-summary/route.ts`
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation after extracting from_date and to_date query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Requirements: 2.7, 2.8_

  - [x] 14.4 Add date validation to Payment Details Report
    - File: `app/api/finance/reports/payment-details/route.ts`
    - Import validateDateRange from '@/utils/report-validation'
    - Add validation after extracting from_date and to_date query params
    - Return 400 error if validation fails
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Return 400 error with clear message_
    - _Requirements: 2.7, 2.8_

  - [x] 14.5 Identify and fix any other reports with date parameters
    - Search for other report routes that accept from_date/to_date parameters
    - Apply same date validation pattern
    - Document any additional reports fixed
    - _Bug_Condition: isBugCondition(input) where input.from_date > input.to_date_
    - _Expected_Behavior: Consistent date validation across all reports_
    - _Requirements: 2.7, 2.8_

  - [ ] 14.6 Verify Bug #4 exploration test now passes for all reports
    - **Property 1: Expected Behavior** - Date Validation Across All Reports
    - **IMPORTANT**: Re-run the SAME test from task 1.4 - do NOT write a new test
    - Run date validation test for all reports with date parameters
    - **EXPECTED OUTCOME**: All tests PASS (confirms bug is fixed)
    - _Requirements: 2.7, 2.8_

  - [ ] 14.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Date Ranges Work
    - **IMPORTANT**: Re-run the SAME tests from task 2.3 - do NOT write new tests
    - Run preservation tests for valid date ranges across all reports
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

## Phase 11: Verify Bug #10 Fix Across All Reports

- [x] 15. Verify currency formatting consistency

  - [ ] 15.1 Verify Bug #10 exploration test now passes
    - **Property 1: Expected Behavior** - Consistent Currency Formatting
    - **IMPORTANT**: Re-run the SAME test from task 1.10 - do NOT write a new test
    - Request multiple reports and verify consistent formatting
    - **EXPECTED OUTCOME**: Test PASSES (confirms consistent "Rp 1.000.000,00" format)
    - _Requirements: 2.19, 2.20_

  - [ ] 15.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Format Style Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2.9 - do NOT write new tests
    - Verify format style maintained, only consistency improved
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

## Phase 12: Unit Testing

- [ ] 16. Write unit tests for utilities

  - [ ] 16.1 Test date validation utility
    - File: `tests/financial-reports/date-validation.test.ts`
    - Test validateDateRange with valid ranges (from <= to)
    - Test validateDateRange with invalid ranges (from > to)
    - Test validateDateRange with invalid date formats
    - Test validateDateRange with null dates (should pass)
    - Test validateDateRange with edge cases (same date, year boundaries)
    - _Requirements: 2.7, 2.8_

  - [ ] 16.2 Test account helpers utility
    - File: `tests/financial-reports/account-helpers.test.ts`
    - Test isDiscountAccount with various account names ("potongan", "discount")
    - Test isDiscountAccount with parent_account containing discount keywords
    - Test isDiscountAccount with non-discount accounts (should return false)
    - Test isCurrentAsset with different account_types (Cash, Bank, Receivable, Stock, Tax)
    - Test isCurrentAsset with non-current account_types (should return false)
    - Test isCurrentLiability with different account_types (Payable, Tax)
    - Test isCurrentLiability with non-current account_types (should return false)
    - _Requirements: 2.15, 2.16, 2.17, 2.18_

  - [ ] 16.3 Test formatCurrency utility
    - File: `tests/financial-reports/format-currency.test.ts`
    - Test formatCurrency with positive amounts
    - Test formatCurrency with negative amounts (should format absolute value)
    - Test formatCurrency with zero
    - Test formatCurrency with decimal precision (2 decimal places)
    - Test formatCurrency with large amounts (thousands, millions, billions)
    - Verify format: "Rp 1.000.000,00" (space after Rp, dot for thousands, comma for decimals)
    - _Requirements: 2.19, 2.20_

- [ ] 17. Write unit tests for Balance Sheet fixes

  - [ ] 17.1 Test Net P/L calculation
    - File: `tests/financial-reports/balance-sheet.test.ts`
    - Mock GL Entry data with Income and Expense accounts
    - Test Net P/L = Total Income - Total Expense
    - Test Net P/L added to Total Equity
    - Test Balance Sheet balances (Assets = Liabilities + Equity)
    - Test zero Net P/L scenario (no change to equity)
    - _Requirements: 2.1, 2.2_

  - [ ] 17.2 Test flexible categorization
    - Mock Account master data with various account_types
    - Test Current Asset categorization (Cash, Bank, Receivable, Stock, Tax)
    - Test Fixed Asset categorization (other Asset types)
    - Test Current Liability categorization (Payable, Tax)
    - Test Long-term Liability categorization (other Liability types)
    - Test custom account structures work correctly
    - _Requirements: 2.17, 2.18_

- [ ] 18. Write unit tests for AR/AP fixes

  - [ ] 18.1 Test AR report with Sales Returns
    - File: `tests/financial-reports/ar-ap-reports.test.ts`
    - Mock Sales Invoice data with outstanding amounts
    - Mock Sales Return data (is_return = 1, return_against)
    - Test outstanding amount deduction logic
    - Test multiple returns per invoice
    - Test invoices with no returns (preservation)
    - Test return_amount field in response
    - _Requirements: 2.3, 2.4_

  - [ ] 18.2 Test AP report with Purchase Returns
    - Mock Purchase Invoice data with outstanding amounts
    - Mock Purchase Return data (is_return = 1, return_against)
    - Test outstanding amount deduction logic
    - Test multiple returns per invoice
    - Test invoices with no returns (preservation)
    - Test return_amount field in response
    - _Requirements: 2.5, 2.6_

- [ ] 19. Write unit tests for VAT Report fix

  - [ ] 19.1 Test dynamic tax rate extraction
    - File: `tests/financial-reports/vat-report.test.ts`
    - Mock invoice data with various tax rates (0%, 5%, 11%, 15%)
    - Test getTaxRateForInvoice function
    - Test DPP calculation with different tax rates (DPP = PPN / tax_rate)
    - Test default to 11% when tax rate unavailable
    - Test tax_rate field in response
    - Test mixed tax rates in same report
    - _Requirements: 2.9, 2.10_

- [ ] 20. Write unit tests for Cash Flow and HPP Ledger fixes

  - [ ] 20.1 Test Cash Flow account_type filter
    - File: `tests/financial-reports/cash-flow-hpp.test.ts`
    - Mock Account master with various account_types
    - Test Cash and Bank account_types included
    - Test other account_types excluded
    - Test custom account names work (no "Kas" or "Bank" keywords)
    - Test empty cashBankAccounts case
    - _Requirements: 2.11, 2.12_

  - [ ] 20.2 Test HPP Ledger account_type filter
    - Mock Account master with various account_types
    - Test only 'Cost of Goods Sold' account_type included
    - Test other account_types excluded (even with "HPP" in name)
    - Test empty cogsAccounts case
    - _Requirements: 2.13, 2.14_

- [ ] 21. Write unit tests for Profit & Loss fix

  - [ ] 21.1 Test flexible discount detection
    - File: `tests/financial-reports/profit-loss.test.ts`
    - Mock Account master with various discount account structures
    - Test discount accounts with "potongan" or "discount" in name
    - Test discount accounts with parent containing discount keywords
    - Test Sales Discount (Income contra) detection and calculation
    - Test Purchase Discount (COGS contra) detection and calculation
    - Test standard discount accounts (4300/5300) still work (preservation)
    - Test custom discount accounts work
    - Test net sales and net COGS calculations
    - _Requirements: 2.15, 2.16_

## Phase 13: Property-Based Testing

- [ ] 22. Write property-based tests for Balance Sheet

  - [ ] 22.1 PBT - Balance Sheet always balances
    - File: `tests/financial-reports/pbt-balance-sheet.test.ts`
    - Generate random GL entries with Income/Expense accounts
    - Property: Balance Sheet always balances (Assets = Liabilities + Equity + Net P/L)
    - Property: Net P/L = Total Income - Total Expense
    - Property: All account categorizations based on account_type
    - Run with various input combinations (different amounts, account structures)
    - _Requirements: 2.1, 2.2, 2.17, 2.18_

- [ ] 23. Write property-based tests for AR/AP preservation

  - [ ] 23.1 PBT - AR/AP without returns unchanged
    - File: `tests/financial-reports/pbt-ar-ap-preservation.test.ts`
    - Generate random Sales/Purchase Invoices without returns
    - Property: Fixed AR/AP reports produce same results as original
    - Property: Outstanding amounts unchanged when no returns exist
    - Run with various invoice amounts and dates
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.7-3.11_

- [ ] 24. Write property-based tests for date validation

  - [ ] 24.1 PBT - Date validation consistency
    - File: `tests/financial-reports/pbt-date-validation.test.ts`
    - Generate random date ranges (valid and invalid)
    - Property: Valid ranges (from <= to) pass validation
    - Property: Invalid ranges (from > to) fail with error
    - Property: All reports reject invalid date ranges consistently
    - Run with various date combinations (edge cases, year boundaries)
    - _Requirements: 2.7, 2.8_

- [ ] 25. Write property-based tests for currency formatting

  - [ ] 25.1 PBT - Currency formatting consistency
    - File: `tests/financial-reports/pbt-currency-formatting.test.ts`
    - Generate random amounts (positive, negative, zero, large, small)
    - Property: All amounts formatted consistently as "Rp X.XXX.XXX,XX"
    - Property: Format consistent across all report types
    - Property: Negative amounts formatted as absolute value
    - Run with various amount ranges
    - _Requirements: 2.19, 2.20_

- [ ] 26. Write property-based tests for account filtering

  - [ ] 26.1 PBT - Account filtering correctness
    - File: `tests/financial-reports/pbt-account-filtering.test.ts`
    - Generate random account structures with various account_types
    - Property: Cash Flow includes all and only Cash/Bank account_types
    - Property: HPP Ledger includes all and only COGS account_types
    - Property: Filtering independent of account names
    - Property: Custom account structures work correctly
    - Run with various account configurations
    - _Requirements: 2.11, 2.12, 2.13, 2.14_

## Phase 14: Integration Testing

- [ ] 27. Write integration tests for complete financial reporting flow

  - [ ] 27.1 Test complete financial cycle
    - File: `tests/integration/financial-reports-flow.test.ts`
    - Create GL entries for a period (Income, Expense, Assets, Liabilities, Equity)
    - Generate Balance Sheet and verify balances (Assets = Liabilities + Equity)
    - Generate Profit & Loss and verify Net P/L calculation
    - Verify Balance Sheet equity includes P&L Net P/L
    - Create Sales/Purchase Invoices with outstanding amounts
    - Generate AR/AP reports and verify outstanding amounts
    - Create Sales/Purchase Returns
    - Verify AR/AP adjustments after returns
    - Generate VAT report and verify tax calculations
    - Generate Cash Flow and HPP Ledger and verify account filtering
    - Verify all currency formatting consistent
    - _Requirements: All bugs - end-to-end validation_

- [ ] 28. Write integration tests for multi-company scenarios

  - [ ] 28.1 Test reports with multiple companies
    - File: `tests/integration/multi-company-reports.test.ts`
    - Create data for multiple companies
    - Verify company filtering works correctly for all reports
    - Verify fixes apply consistently across companies
    - Test company parameter validation
    - _Requirements: 3.3_

- [ ] 29. Write integration tests for date range scenarios

  - [ ] 29.1 Test reports with various date ranges
    - File: `tests/integration/date-range-reports.test.ts`
    - Test fiscal year boundaries
    - Test month-end and year-end reporting
    - Test date validation across all reports
    - Test reports with no date parameters (as_of_date only)
    - Test edge cases (leap years, year transitions)
    - _Requirements: 2.7, 2.8, 3.15_

- [ ] 30. Write integration tests for custom Chart of Accounts

  - [ ] 30.1 Test reports with custom COA
    - File: `tests/integration/custom-coa-reports.test.ts`
    - Create custom Chart of Accounts with non-standard numbers and names
    - Verify flexible account detection works (account_type based)
    - Verify categorization based on account_type (not hardcoded numbers)
    - Test Balance Sheet categorization with custom structure
    - Test P&L discount detection with custom accounts
    - Test Cash Flow and HPP Ledger with custom account names
    - _Requirements: 2.11-2.18_

## Phase 15: Final Validation and Checkpoint

- [ ] 31. Run all tests and verify fixes

  - [ ] 31.1 Run all exploratory tests
    - Re-run all tests from Phase 1 (tasks 1.1-1.10)
    - Verify all tests now PASS (bugs are fixed)
    - Document any remaining issues
    - _Requirements: All bugs - fix validation_

  - [ ] 31.2 Run all preservation tests
    - Re-run all tests from Phase 1 (tasks 2.1-2.10)
    - Verify all tests still PASS (no regressions)
    - Document any unexpected behavior changes
    - _Requirements: 3.1-3.27 - regression prevention_

  - [ ] 31.3 Run all unit tests
    - Execute all unit tests from Phase 12 (tasks 16-21)
    - Verify 100% pass rate
    - Fix any failing tests
    - _Requirements: All bugs - unit test coverage_

  - [ ] 31.4 Run all property-based tests
    - Execute all PBT tests from Phase 13 (tasks 22-26)
    - Verify no counterexamples found
    - Document any edge cases discovered
    - Fix any issues found
    - _Requirements: All bugs - property validation_

  - [ ] 31.5 Run all integration tests
    - Execute all integration tests from Phase 14 (tasks 27-30)
    - Verify end-to-end flows work correctly
    - Test with real ERPNext backend if available
    - Document any integration issues
    - _Requirements: All bugs - integration validation_

- [ ] 32. Code review and quality checks

  - [ ] 32.1 Review all code changes
    - Review utility functions for correctness and efficiency
    - Review report fixes for completeness
    - Check for code duplication
    - Verify error handling is consistent
    - Ensure TypeScript types are correct
    - _Requirements: Code quality_

  - [ ] 32.2 Run linting and type checking
    - Execute `pnpm lint` to check for linting errors
    - Fix any ESLint warnings or errors
    - Verify TypeScript compilation succeeds
    - Check for any type errors
    - _Requirements: Code quality_

  - [ ] 32.3 Performance review
    - Review query efficiency (especially for AR/AP with returns)
    - Check for N+1 query problems
    - Verify caching opportunities
    - Test with large datasets if possible
    - Document any performance concerns
    - _Requirements: Performance_

- [ ] 33. Documentation updates

  - [ ] 33.1 Update API documentation
    - Document new response fields (return_amount, tax_rate)
    - Document date validation behavior
    - Document error responses (400 for invalid dates)
    - Update examples with new fields
    - _Requirements: Documentation_

  - [ ] 33.2 Document breaking changes (if any)
    - List any breaking changes in response structure
    - Provide migration guide for custom implementations
    - Document deprecated patterns
    - _Requirements: Documentation_

  - [ ] 33.3 Update README or developer docs
    - Document new utility functions
    - Explain account_type based filtering approach
    - Provide examples of flexible account detection
    - Document testing approach
    - _Requirements: Documentation_

- [ ] 34. Checkpoint - Ensure all tests pass
  - Verify all exploratory tests pass (bugs fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify all unit tests pass
  - Verify all property-based tests pass
  - Verify all integration tests pass
  - Verify linting and type checking pass
  - Ask the user if questions arise
  - _Requirements: All - final validation_

## Phase 16: Deployment Preparation

- [ ] 35. Prepare for deployment

  - [ ] 35.1 Create deployment checklist
    - List all files changed
    - List all new files created
    - Document database/ERPNext requirements (if any)
    - Document environment variable requirements
    - _Requirements: Deployment_

  - [ ] 35.2 Test in staging environment
    - Deploy to staging environment
    - Run smoke tests on staging
    - Test with production-like data
    - Verify all reports work correctly
    - Monitor error logs for issues
    - _Requirements: Deployment_

  - [ ] 35.3 Prepare rollback plan
    - Document rollback procedure
    - Create backup of current production code
    - Test rollback procedure in staging
    - _Requirements: Deployment_

- [ ] 36. Production deployment

  - [ ] 36.1 Deploy to production
    - Follow deployment checklist
    - Deploy during low-traffic period
    - Monitor deployment process
    - Verify deployment success
    - _Requirements: Deployment_

  - [ ] 36.2 Post-deployment validation
    - Run smoke tests on production
    - Test each fixed report
    - Monitor error logs for 24 hours
    - Check performance metrics
    - Verify no user-reported issues
    - _Requirements: Deployment_

  - [ ] 36.3 Monitor and support
    - Monitor error logs for 1 week
    - Respond to user feedback
    - Document any issues found
    - Create hotfix if critical issues arise
    - _Requirements: Deployment_

## Summary

This implementation plan addresses all 10 bugs in the financial reporting system:

1. **Bug #1**: Balance Sheet missing Net P/L in equity - Fixed by calculating and adding Net P/L
2. **Bug #2**: AR report not deducting Sales Returns - Fixed by querying and deducting returns
3. **Bug #3**: AP report not deducting Purchase Returns - Fixed by querying and deducting returns
4. **Bug #4**: Missing date validation - Fixed by creating validateDateRange utility
5. **Bug #5**: VAT report hardcoded tax rate - Fixed by dynamic tax rate extraction
6. **Bug #6**: Cash Flow name-based filter - Fixed by using account_type filter
7. **Bug #7**: HPP Ledger overly broad filter - Fixed by using account_type filter
8. **Bug #8**: P&L hardcoded discount accounts - Fixed by flexible discount detection
9. **Bug #9**: Balance Sheet hardcoded categorization - Fixed by account_type based categorization
10. **Bug #10**: Inconsistent currency formatting - Fixed by centralized formatCurrency utility

The plan follows the bugfix workflow:
- **Phase 1**: Exploratory testing BEFORE fix (confirm bugs exist)
- **Phase 2**: Preservation testing BEFORE fix (capture baseline behavior)
- **Phases 3-11**: Implementation with specification references
- **Phases 12-14**: Comprehensive testing (unit, property-based, integration)
- **Phase 15**: Final validation and checkpoint
- **Phase 16**: Deployment preparation and execution

All tasks include:
- Bug_Condition references from design
- Expected_Behavior specifications from design
- Preservation requirements from design
- Requirements traceability (X.Y format)
