# Financial Reports Comprehensive Fix - Bugfix Design

## Overview

This design addresses 10 critical bugs in the Next.js ERP financial reporting system that cause inaccurate financial statements. The bugs span across Balance Sheet, Accounts Receivable/Payable, VAT Report, Cash Flow, HPP Ledger, and Profit & Loss reports. The fix approach uses the bug condition methodology to ensure targeted fixes with comprehensive validation.

The primary issues are:
1. Balance Sheet not including Net P/L in equity (causing imbalance)
2. AR/AP reports not deducting returns (overstating receivables/payables)
3. Missing date validation across all reports
4. Hardcoded tax rate (11%) in VAT calculations
5. Name-based account filtering instead of account_type (Cash Flow, HPP Ledger)
6. Hardcoded account numbers for discount and categorization (P&L, Balance Sheet)
7. Inconsistent currency formatting across reports

The fix strategy involves:
- Adding Net P/L calculation to Balance Sheet equity
- Querying and deducting Sales/Purchase Returns in AR/AP reports
- Implementing centralized date validation utility
- Dynamic tax rate extraction from GL entries or Tax Templates
- Replacing name-based filters with account_type filters
- Using account_type/parent_account for flexible account identification
- Creating centralized formatCurrency utility

## Glossary

- **Bug_Condition (C)**: The condition that triggers each specific bug
- **Property (P)**: The desired correct behavior for buggy inputs
- **Preservation**: Existing report functionality that must remain unchanged
- **GL Entry**: General Ledger Entry - the core accounting transaction record in ERPNext
- **account_type**: ERPNext field that categorizes accounts (Cash, Bank, Receivable, Payable, COGS, etc.)
- **root_type**: Top-level account category (Asset, Liability, Equity, Income, Expense)
- **Net P/L**: Net Profit/Loss calculated from Income - Expenses for a period
- **DPP**: Dasar Pengenaan Pajak (Tax Base Amount) - amount before tax
- **PPN**: Pajak Pertambahan Nilai (Value Added Tax) - Indonesian VAT

## Bug Details

### Fault Condition

The bugs manifest across multiple financial reports when specific conditions are met. Each bug has a distinct fault condition:

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ReportRequest { report_type, company, from_date?, to_date?, as_of_date? }
  OUTPUT: boolean
  
  RETURN (
    // Bug #1: Balance Sheet with Net P/L period
    (input.report_type == 'balance-sheet' AND hasNetProfitLoss(input.company, input.as_of_date))
    
    OR // Bug #2: AR report with sales returns
    (input.report_type == 'accounts-receivable' AND hasSalesReturns(input.company))
    
    OR // Bug #3: AP report with purchase returns
    (input.report_type == 'accounts-payable' AND hasPurchaseReturns(input.company))
    
    OR // Bug #4: Any report with invalid dates
    (input.from_date != null AND input.to_date != null AND input.from_date > input.to_date)
    
    OR // Bug #5: VAT report with non-11% tax rate
    (input.report_type == 'vat-report' AND hasNonStandardTaxRate(input.company, input.from_date, input.to_date))
    
    OR // Bug #6: Cash Flow with non-standard account names
    (input.report_type == 'cash-flow' AND hasCashAccountsWithoutKeywords(input.company))
    
    OR // Bug #7: HPP Ledger with non-COGS accounts containing "HPP"
    (input.report_type == 'hpp-ledger' AND hasNonCOGSAccountsWithHPP(input.company))
    
    OR // Bug #8: P&L with non-standard discount account numbers
    (input.report_type == 'profit-loss' AND hasDiscountAccountsNotIn4300or5300(input.company))
    
    OR // Bug #9: Balance Sheet with custom account structure
    (input.report_type == 'balance-sheet' AND hasCustomAccountStructure(input.company))
    
    OR // Bug #10: Any report (currency formatting inconsistency)
    (input.report_type IN ['balance-sheet', 'accounts-receivable', 'accounts-payable', 
                           'vat-report', 'cash-flow', 'hpp-ledger', 'profit-loss'])
  )
END FUNCTION
```

### Examples

**Bug #1 - Balance Sheet Equity:**
- Input: `GET /api/finance/reports/balance-sheet?company=ABC&as_of_date=2024-12-31`
- Current: Total Equity = 500,000,000 (only equity accounts), Total Assets = 1,200,000,000, Total Liabilities = 600,000,000
- Expected: Total Equity = 600,000,000 (equity + Net P/L of 100,000,000), balancing the equation
- Bug: Balance Sheet doesn't balance (Assets ≠ Liabilities + Equity)

**Bug #2 - AR with Returns:**
- Input: `GET /api/finance/reports/accounts-receivable?company=ABC`
- Current: Outstanding AR = 50,000,000 (only Sales Invoices)
- Expected: Outstanding AR = 45,000,000 (Sales Invoices - Sales Returns of 5,000,000)
- Bug: AR overstated by not deducting returns

**Bug #3 - AP with Returns:**
- Input: `GET /api/finance/reports/accounts-payable?company=ABC`
- Current: Outstanding AP = 30,000,000 (only Purchase Invoices)
- Expected: Outstanding AP = 28,000,000 (Purchase Invoices - Purchase Returns of 2,000,000)
- Bug: AP overstated by not deducting returns

**Bug #4 - Invalid Date Range:**
- Input: `GET /api/finance/reports/profit-loss?company=ABC&from_date=2024-12-31&to_date=2024-01-01`
- Current: Returns empty data or incorrect results with no error
- Expected: Returns 400 error with message "from_date must be less than or equal to to_date"
- Bug: No validation for date logic

**Bug #5 - VAT with 5% Tax Rate:**
- Input: `GET /api/finance/reports/vat-report?company=ABC&from_date=2024-01-01&to_date=2024-12-31`
- Current: DPP = PPN / 0.11 (hardcoded) = 1,000,000 / 0.11 = 9,090,909 (wrong for 5% rate)
- Expected: DPP = PPN / 0.05 (dynamic) = 1,000,000 / 0.05 = 20,000,000 (correct)
- Bug: Incorrect DPP calculation for non-11% tax rates

**Bug #6 - Cash Flow with Custom Account Names:**
- Input: `GET /api/finance/reports/cash-flow?company=ABC&from_date=2024-01-01&to_date=2024-12-31`
- Current: Misses account "1110 - Petty Cash" (doesn't contain "Kas" or "Bank")
- Expected: Includes all accounts with account_type = 'Cash' or 'Bank'
- Bug: Name-based filter excludes valid cash/bank accounts

**Bug #7 - HPP Ledger with Non-COGS Accounts:**
- Input: `GET /api/finance/reports/hpp-ledger?company=ABC&from_date=2024-01-01&to_date=2024-12-31`
- Current: Includes "6100 - HPP Adjustment" (not a COGS account)
- Expected: Only includes accounts with account_type = 'Cost of Goods Sold'
- Bug: Name-based filter includes non-COGS accounts

**Bug #8 - P&L with Custom Discount Accounts:**
- Input: `GET /api/finance/reports/profit-loss?company=ABC&from_date=2024-01-01&to_date=2024-12-31`
- Current: Misses "4350 - Sales Discount" (not account 4300)
- Expected: Identifies discount accounts by account_type or parent_account
- Bug: Hardcoded account numbers miss custom discount accounts

**Bug #9 - Balance Sheet with Custom Structure:**
- Input: `GET /api/finance/reports/balance-sheet?company=ABC&as_of_date=2024-12-31`
- Current: Miscategorizes "1500 - Investments" as Fixed Asset (should be Current Asset)
- Expected: Categorizes based on account_type, not hardcoded numbers
- Bug: Hardcoded categorization logic fails with custom account structures

**Bug #10 - Currency Formatting Inconsistency:**
- Input: Any financial report
- Current: Different formatCurrency implementations across files produce inconsistent output
- Expected: Consistent "Rp 1.000.000,00" format across all reports
- Bug: Duplicate formatCurrency functions with slight variations

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All reports must continue to return data with the same JSON structure
- Authentication via API key or session cookie must remain unchanged
- Company parameter filtering must continue to work
- GL Entry aggregation logic must remain unchanged
- Response format `{ success: true/false, data: {...}, message?: string }` must be preserved
- Error handling for unauthorized (401) and bad request (400) must remain unchanged
- All existing query parameters must continue to be supported
- Report calculation logic for non-buggy scenarios must remain unchanged

**Scope:**
All inputs that do NOT trigger the specific bug conditions should be completely unaffected by this fix. This includes:
- Reports with valid date ranges (Bug #4)
- Balance Sheets for periods with zero Net P/L (Bug #1)
- AR/AP reports with no returns (Bugs #2, #3)
- VAT reports with standard 11% tax rate (Bug #5)
- Cash Flow with standard account names containing "Kas" or "Bank" (Bug #6)
- HPP Ledger with only COGS accounts (Bug #7)
- P&L with standard discount account numbers 4300/5300 (Bug #8)
- Balance Sheet with standard account structure (Bug #9)
- All non-financial report endpoints

## Hypothesized Root Cause

Based on the bug analysis and code review, the root causes are:

1. **Balance Sheet - Missing Net P/L in Equity**:
   - The Balance Sheet only aggregates GL Entry balances for Equity accounts
   - It doesn't calculate or add the Net Profit/Loss from the period
   - ERPNext typically closes P&L to Retained Earnings, but for current period reporting, Net P/L must be added to equity

2. **AR/AP Reports - Missing Returns Query**:
   - The AR report only queries `Sales Invoice` doctype
   - It doesn't query `Sales Invoice` with `is_return = 1` or separate return documents
   - The AP report has the same issue with Purchase Invoices
   - ERPNext stores returns as invoices with negative amounts or separate return documents

3. **Date Validation - No Input Validation**:
   - No validation utility exists for date range logic
   - Each report endpoint directly uses query parameters without validation
   - Invalid date ranges cause empty results or incorrect filtering

4. **VAT Report - Hardcoded Tax Rate**:
   - The DPP calculation uses hardcoded `/ 0.11` (11% tax rate)
   - Tax rate should be extracted from GL Entry remarks, Tax Template, or invoice items
   - Different transactions may have different tax rates (0%, 5%, 11%, 15%)

5. **Cash Flow - Name-Based Account Filter**:
   - Uses `account LIKE '%Kas%' OR account LIKE '%Bank%'` filter
   - Should use `account_type IN ('Cash', 'Bank')` from Account master
   - Name-based filtering breaks with custom account naming conventions

6. **HPP Ledger - Overly Broad Name Filter**:
   - Uses `account LIKE '%HPP%'` which can match non-COGS accounts
   - Should use `account_type = 'Cost of Goods Sold'` from Account master
   - Name-based filtering includes unrelated accounts

7. **P&L - Hardcoded Discount Account Numbers**:
   - Uses `account.includes('4300')` and `account.includes('5300')` for discount detection
   - Should check account_type or parent_account for discount classification
   - Hardcoded numbers fail with custom chart of accounts

8. **Balance Sheet - Hardcoded Categorization**:
   - Uses hardcoded account numbers (1410, 2210, 2230, 2240) for Current vs Fixed categorization
   - Should use account_type or parent_account for flexible categorization
   - Hardcoded logic fails with custom account structures

9. **Currency Formatting - Duplicate Implementations**:
   - Each report file has its own `formatCurrency()` function
   - Slight variations in implementation cause inconsistent output
   - Should use centralized utility from `utils/format.ts`

10. **General Architecture Issue**:
    - Reports directly query ERPNext API without abstraction layer
    - No shared validation or utility functions
    - Difficult to maintain consistency across reports

## Correctness Properties

Property 1: Fault Condition - Balance Sheet Equity Includes Net P/L

_For any_ Balance Sheet request where the period has non-zero Net Profit/Loss, the fixed function SHALL calculate Net P/L from the Profit & Loss report and add it to Total Equity, ensuring Total Assets equals Total Liabilities + Total Equity.

**Validates: Requirements 2.1, 2.2**

Property 2: Fault Condition - AR Report Deducts Sales Returns

_For any_ Accounts Receivable report request where Sales Returns exist, the fixed function SHALL query Sales Invoice documents with is_return = 1 and deduct their amounts from outstanding receivables, producing accurate AR balances.

**Validates: Requirements 2.3, 2.4**

Property 3: Fault Condition - AP Report Deducts Purchase Returns

_For any_ Accounts Payable report request where Purchase Returns exist, the fixed function SHALL query Purchase Invoice documents with is_return = 1 and deduct their amounts from outstanding payables, producing accurate AP balances.

**Validates: Requirements 2.5, 2.6**

Property 4: Fault Condition - Date Validation Rejects Invalid Ranges

_For any_ financial report request where from_date > to_date, the fixed function SHALL return a 400 error with message "from_date must be less than or equal to to_date" before processing the report.

**Validates: Requirements 2.7, 2.8**

Property 5: Fault Condition - VAT Report Uses Dynamic Tax Rate

_For any_ VAT report request, the fixed function SHALL extract the actual tax rate from GL Entry data or Tax Templates and use it for DPP calculation (DPP = PPN / tax_rate), producing accurate tax base amounts for all tax rates.

**Validates: Requirements 2.9, 2.10**

Property 6: Fault Condition - Cash Flow Uses account_type Filter

_For any_ Cash Flow report request, the fixed function SHALL filter accounts using account_type IN ('Cash', 'Bank') instead of name-based matching, including all cash/bank accounts regardless of naming convention.

**Validates: Requirements 2.11, 2.12**

Property 7: Fault Condition - HPP Ledger Uses account_type Filter

_For any_ HPP Ledger report request, the fixed function SHALL filter accounts using account_type = 'Cost of Goods Sold' instead of name-based matching, including only true COGS accounts.

**Validates: Requirements 2.13, 2.14**

Property 8: Fault Condition - P&L Uses Flexible Discount Detection

_For any_ Profit & Loss report request, the fixed function SHALL identify discount accounts using account_type or parent_account analysis instead of hardcoded account numbers, correctly recognizing discount accounts in any chart of accounts structure.

**Validates: Requirements 2.15, 2.16**

Property 9: Fault Condition - Balance Sheet Uses Flexible Categorization

_For any_ Balance Sheet report request, the fixed function SHALL categorize accounts as Current vs Fixed using account_type or parent_account instead of hardcoded account numbers, correctly categorizing accounts in any chart of accounts structure.

**Validates: Requirements 2.17, 2.18**

Property 10: Fault Condition - Consistent Currency Formatting

_For any_ financial report request, the fixed function SHALL use a centralized formatCurrency utility that produces consistent "Rp 1.000.000,00" format across all reports.

**Validates: Requirements 2.19, 2.20**

Property 11: Preservation - Existing Report Behavior

_For any_ financial report request that does NOT trigger bug conditions (valid dates, no returns, standard tax rates, standard account names/structures), the fixed code SHALL produce exactly the same results as the original code, preserving all existing functionality.

**Validates: Requirements 3.1-3.27**

## Fix Implementation

### Changes Required

The implementation will be organized into three phases: utility creation, report fixes, and validation.

#### Phase 1: Create Shared Utilities

**File**: `utils/report-validation.ts` (NEW)

**Purpose**: Centralized date validation for all reports

**Implementation**:
```typescript
export function validateDateRange(fromDate: string | null, toDate: string | null): { valid: boolean; error?: string } {
  if (!fromDate || !toDate) return { valid: true };
  
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  if (isNaN(from.getTime())) {
    return { valid: false, error: 'Invalid from_date format. Use YYYY-MM-DD.' };
  }
  
  if (isNaN(to.getTime())) {
    return { valid: false, error: 'Invalid to_date format. Use YYYY-MM-DD.' };
  }
  
  if (from > to) {
    return { valid: false, error: 'from_date must be less than or equal to to_date' };
  }
  
  return { valid: true };
}
```

**File**: `utils/format.ts` (MODIFY)

**Purpose**: Ensure centralized formatCurrency utility exists and is consistent

**Implementation**:
```typescript
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  
  return `Rp ${formatted}`;
}
```

**File**: `utils/account-helpers.ts` (NEW)

**Purpose**: Helper functions for account filtering and categorization

**Implementation**:
```typescript
export function isDiscountAccount(account: AccountMaster): boolean {
  // Check if account is a discount/contra account
  // Sales Discount: contra to Income (debit balance)
  // Purchase Discount: contra to COGS (credit balance)
  const name = account.account_name.toLowerCase();
  const parent = account.parent_account?.toLowerCase() || '';
  
  return (
    name.includes('potongan') ||
    name.includes('discount') ||
    parent.includes('potongan') ||
    parent.includes('discount')
  );
}

export function isCurrentAsset(account: AccountMaster): boolean {
  const currentTypes = ['Cash', 'Bank', 'Receivable', 'Stock', 'Tax'];
  return currentTypes.includes(account.account_type);
}

export function isCurrentLiability(account: AccountMaster): boolean {
  const currentTypes = ['Payable', 'Tax'];
  return currentTypes.includes(account.account_type);
}
```

#### Phase 2: Fix Individual Reports

**File**: `app/api/finance/reports/balance-sheet/route.ts`

**Bug #1 Fix - Add Net P/L to Equity**:
1. After calculating equity from GL entries, call Profit & Loss API internally to get Net P/L
2. Add Net P/L to total_equity
3. Update total_liabilities_and_equity calculation

**Specific Changes**:
```typescript
// After calculating equityAccounts array, before summary calculation:

// Calculate Net P/L for the period and add to equity
let netProfitLoss = 0;
try {
  // Build P&L request with same date range
  const plFilters: any[] = [['company', '=', company]];
  if (asOfDate) {
    plFilters.push(['posting_date', '<=', asOfDate]);
  }
  
  // Query Income accounts
  const incomeUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit"]&filters=${encodeURIComponent(JSON.stringify([...plFilters, ['account', 'in', incomeAccountNames]]))}&limit_page_length=5000`;
  const incomeResp = await fetch(incomeUrl, { method: 'GET', headers: _h });
  const incomeData = await incomeResp.json();
  
  // Query Expense accounts
  const expenseUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit"]&filters=${encodeURIComponent(JSON.stringify([...plFilters, ['account', 'in', expenseAccountNames]]))}&limit_page_length=5000`;
  const expenseResp = await fetch(expenseUrl, { method: 'GET', headers: _h });
  const expenseData = await expenseResp.json();
  
  // Calculate Net P/L
  const totalIncome = (incomeData.data || []).reduce((sum, e) => sum + (e.credit - e.debit), 0);
  const totalExpense = (expenseData.data || []).reduce((sum, e) => sum + (e.debit - e.credit), 0);
  netProfitLoss = totalIncome - totalExpense;
} catch (error) {
  console.error('Error calculating Net P/L:', error);
  // Continue without Net P/L if calculation fails
}

// Update equity calculation
const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.amount, 0) + netProfitLoss;
```

**Bug #9 Fix - Flexible Categorization**:
Replace hardcoded account number checks with account_type checks:
```typescript
// Replace existing categorization logic
if (rootType === 'Asset') {
  if (isCurrentAsset(master)) {
    currentAssets.push(line);
  } else {
    fixedAssets.push(line);
  }
} else if (rootType === 'Liability') {
  if (isCurrentLiability(master)) {
    currentLiabilities.push(line);
  } else {
    longTermLiabilities.push(line);
  }
}
```

**Bug #10 Fix - Use Centralized formatCurrency**:
```typescript
// Remove local formatCurrency function
// Add import at top:
import { formatCurrency } from '@/utils/format';
```

---

**File**: `app/api/finance/reports/accounts-receivable/route.ts`

**Bug #2 Fix - Deduct Sales Returns**:
1. Query Sales Invoice with is_return = 1
2. Group returns by return_against (original invoice)
3. Deduct return amounts from outstanding_amount

**Specific Changes**:
```typescript
// After fetching outstanding Sales Invoices, before processing:

// Fetch Sales Returns
const returnFields = ['name', 'return_against', 'grand_total', 'outstanding_amount'];
const returnFilters = [
  ['docstatus', '=', '1'],
  ['company', '=', company],
  ['is_return', '=', '1'],
];

const returnsUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(returnFields))}&filters=${encodeURIComponent(JSON.stringify(returnFilters))}&limit_page_length=500`;

let returnsMap = new Map<string, number>();
try {
  const returnsResponse = await fetch(returnsUrl, { method: 'GET', headers });
  if (returnsResponse.ok) {
    const returnsData = await returnsResponse.json();
    (returnsData.data || []).forEach((ret: any) => {
      const originalInvoice = ret.return_against || ret.name;
      const returnAmount = Math.abs(ret.grand_total || 0);
      returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
    });
  }
} catch (error) {
  console.error('Error fetching sales returns:', error);
  // Continue without returns if fetch fails
}

// Adjust outstanding amounts
const invoicesWithSales = await Promise.all(
  invoices.map(async (inv: any) => {
    const returnAmount = returnsMap.get(inv.name) || 0;
    const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
    
    // ... rest of existing code
    return {
      voucher_no: inv.name,
      customer: inv.customer,
      customer_name: inv.customer_name,
      posting_date: inv.posting_date,
      due_date: inv.due_date,
      invoice_grand_total: inv.grand_total,
      outstanding_amount: adjustedOutstanding,
      return_amount: returnAmount,
      voucher_type: 'Sales Invoice',
      sales_person: salesPerson,
    };
  })
);

// Filter out invoices with zero outstanding after returns
const filteredInvoices = invoicesWithSales.filter(inv => inv.outstanding_amount > 0);
```

**Bug #10 Fix - Use Centralized formatCurrency**:
```typescript
import { formatCurrency } from '@/utils/format';
```

---

**File**: `app/api/finance/reports/accounts-payable/route.ts`

**Bug #3 Fix - Deduct Purchase Returns**:
Similar implementation to AR report, but for Purchase Invoices

**Specific Changes**:
```typescript
// After fetching outstanding Purchase Invoices:

// Fetch Purchase Returns
const returnFields = ['name', 'return_against', 'grand_total', 'outstanding_amount'];
const returnFilters = [
  ['docstatus', '=', '1'],
  ['company', '=', '1'],
  ['is_return', '=', '1'],
];

const returnsUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=${encodeURIComponent(JSON.stringify(returnFields))}&filters=${encodeURIComponent(JSON.stringify(returnFilters))}&limit_page_length=500`;

let returnsMap = new Map<string, number>();
try {
  const returnsResponse = await fetch(returnsUrl, { method: 'GET', headers });
  if (returnsResponse.ok) {
    const returnsData = await returnsResponse.json();
    (returnsData.data || []).forEach((ret: any) => {
      const originalInvoice = ret.return_against || ret.name;
      const returnAmount = Math.abs(ret.grand_total || 0);
      returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
    });
  }
} catch (error) {
  console.error('Error fetching purchase returns:', error);
}

// Adjust outstanding amounts
const apData = (data.data || [])
  .map((inv: any) => {
    const returnAmount = returnsMap.get(inv.name) || 0;
    const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
    
    return {
      voucher_no: inv.name,
      supplier: inv.supplier,
      supplier_name: inv.supplier_name,
      posting_date: inv.posting_date,
      due_date: inv.due_date,
      invoice_grand_total: inv.grand_total,
      outstanding_amount: adjustedOutstanding,
      return_amount: returnAmount,
    };
  })
  .filter(inv => inv.outstanding_amount > 0);
```

**Bug #10 Fix - Use Centralized formatCurrency**:
```typescript
import { formatCurrency } from '@/utils/format';
```

---

**File**: `app/api/finance/reports/vat-report/route.ts`

**Bug #5 Fix - Dynamic Tax Rate**:
1. Extract tax rate from GL Entry remarks or voucher details
2. Calculate DPP using actual tax rate instead of hardcoded 0.11
3. Handle multiple tax rates in the same report

**Specific Changes**:
```typescript
// Add helper function to extract tax rate
async function getTaxRateForInvoice(
  voucherNo: string, 
  voucherType: string,
  headers: Record<string, string>
): Promise<number> {
  try {
    // Try to get tax rate from invoice
    const doctype = voucherType === 'Sales Invoice' ? 'Sales Invoice' : 'Purchase Invoice';
    const invoiceUrl = `${ERPNEXT_API_URL}/api/resource/${doctype}/${voucherNo}?fields=["taxes"]`;
    const response = await fetch(invoiceUrl, { method: 'GET', headers });
    
    if (response.ok) {
      const data = await response.json();
      const taxes = data.data?.taxes || [];
      if (taxes.length > 0 && taxes[0].rate) {
        return taxes[0].rate / 100; // Convert percentage to decimal
      }
    }
  } catch (error) {
    console.error(`Error fetching tax rate for ${voucherNo}:`, error);
  }
  
  // Default to 11% if unable to determine
  return 0.11;
}

// Modify PPN Output processing
const ppnOutputInvoices: VatInvoiceDetail[] = await Promise.all(
  Array.from(ppnOutputMap.entries()).map(async ([invoiceNo, data]) => {
    const taxRate = await getTaxRateForInvoice(invoiceNo, 'Sales Invoice', _h);
    const dpp = data.ppn / taxRate;
    
    return {
      tanggal: data.tanggal,
      nomor_invoice: invoiceNo,
      customer_supplier: data.customer,
      dpp: dpp,
      ppn: data.ppn,
      tax_rate: taxRate * 100, // Store as percentage
      formatted_dpp: formatCurrency(dpp),
      formatted_ppn: formatCurrency(data.ppn),
    };
  })
);

// Similar changes for PPN Input processing
const ppnInputInvoices: VatInvoiceDetail[] = await Promise.all(
  Array.from(ppnInputMap.entries()).map(async ([invoiceNo, data]) => {
    const taxRate = await getTaxRateForInvoice(invoiceNo, 'Purchase Invoice', _h);
    const dpp = data.ppn / taxRate;
    
    return {
      tanggal: data.tanggal,
      nomor_invoice: invoiceNo,
      customer_supplier: data.supplier,
      dpp: dpp,
      ppn: data.ppn,
      tax_rate: taxRate * 100,
      formatted_dpp: formatCurrency(dpp),
      formatted_ppn: formatCurrency(data.ppn),
    };
  })
);
```

**Bug #10 Fix - Use Centralized formatCurrency**:
```typescript
// Remove local formatCurrency function
import { formatCurrency } from '@/utils/format';
```

---

**File**: `app/api/finance/reports/cash-flow/route.ts`

**Bug #6 Fix - Use account_type Filter**:
Replace name-based filtering with account_type filtering

**Specific Changes**:
```typescript
// Replace existing filter logic with account_type based filtering

// First, fetch Account master to get account_type
const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_type"]&filters=${encodeURIComponent(JSON.stringify([['company', '=', company], ['account_type', 'in', ['Cash', 'Bank']]]))}&limit_page_length=500`;

const accountsResp = await fetch(accountsUrl, { method: 'GET', headers });
if (!accountsResp.ok) {
  return NextResponse.json(
    { success: false, message: 'Failed to fetch cash/bank accounts' },
    { status: accountsResp.status }
  );
}

const accountsData = await accountsResp.json();
const cashBankAccounts = (accountsData.data || []).map((acc: any) => acc.name);

if (cashBankAccounts.length === 0) {
  return NextResponse.json({ success: true, data: [] });
}

// Fetch GL Entries for these accounts
const fields = ['account', 'posting_date', 'debit', 'credit', 'voucher_type', 'voucher_no'];
const filters: any[] = [
  ['company', '=', company],
  ['account', 'in', cashBankAccounts],
];

if (fromDate) filters.push(['posting_date', '>=', fromDate]);
if (toDate) filters.push(['posting_date', '<=', toDate]);

const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=500`;

const response = await fetch(erpNextUrl, { method: 'GET', headers });
const data = await response.json();

if (response.ok) {
  return NextResponse.json({ success: true, data: data.data || [] });
}
```

**Bug #4 Fix - Add Date Validation**:
```typescript
import { validateDateRange } from '@/utils/report-validation';

// Add at start of GET function, after extracting query params:
const dateValidation = validateDateRange(fromDate, toDate);
if (!dateValidation.valid) {
  return NextResponse.json(
    { success: false, message: dateValidation.error },
    { status: 400 }
  );
}
```

---

**File**: `app/api/finance/reports/hpp-ledger/route.ts`

**Bug #7 Fix - Use account_type Filter**:
Replace name-based filtering with account_type filtering

**Specific Changes**:
```typescript
// Fetch Account master to get COGS accounts
const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name"]&filters=${encodeURIComponent(JSON.stringify([['company', '=', company], ['account_type', '=', 'Cost of Goods Sold']]))}&limit_page_length=500`;

const accountsResp = await fetch(accountsUrl, { method: 'GET', headers: _h });
if (!accountsResp.ok) {
  return NextResponse.json(
    { success: false, message: 'Failed to fetch COGS accounts' },
    { status: accountsResp.status }
  );
}

const accountsData = await accountsResp.json();
const cogsAccounts = (accountsData.data || []).map((acc: any) => acc.name);

if (cogsAccounts.length === 0) {
  return NextResponse.json({ success: true, data: [], total: 0 });
}

// Get GL Entries for COGS accounts
const filters = [
  ['company', '=', company],
  ['account', 'in', cogsAccounts]
];
if (from_date) filters.push(['posting_date', '>=', from_date]);
if (to_date) filters.push(['posting_date', '<=', to_date]);

const url = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no","remarks"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=debit desc,posting_date desc&limit_page_length=${limit}`;
```

**Bug #4 Fix - Add Date Validation**:
```typescript
import { validateDateRange } from '@/utils/report-validation';

const dateValidation = validateDateRange(from_date, to_date);
if (!dateValidation.valid) {
  return NextResponse.json(
    { success: false, message: dateValidation.error },
    { status: 400 }
  );
}
```

---

**File**: `app/api/finance/reports/profit-loss/route.ts`

**Bug #8 Fix - Flexible Discount Detection**:
Replace hardcoded account number checks with flexible detection

**Specific Changes**:
```typescript
import { isDiscountAccount } from '@/utils/account-helpers';

// Modify discount detection logic
Array.from(accountMap.values()).forEach(row => {
  const master = accountMasterMap.get(row.account);
  if (!master) return;

  const rootType = master.root_type;
  const accountType = master.account_type;

  if (rootType !== 'Income' && rootType !== 'Expense') return;

  const amount = rootType === 'Income'
    ? (row.credit - row.debit)
    : (row.debit - row.credit);

  if (amount === 0) return;

  const line: ProfitLossLine = {
    account: row.account,
    account_name: master.account_name || row.account,
    account_number: master.account_number || '',
    account_type: accountType || '',
    amount: amount,
    formatted_amount: formatCurrency(amount),
  };

  // Check for discount accounts using flexible detection
  if (isDiscountAccount(master)) {
    if (rootType === 'Income' || master.parent_account?.includes('Income')) {
      // Sales Discount (contra to Income)
      salesDiscountAmount += row.debit - row.credit;
      incomeAccounts.push(line);
    } else if (accountType === 'Cost of Goods Sold' || master.parent_account?.includes('Cost of Goods Sold')) {
      // Purchase Discount (contra to COGS)
      purchaseDiscountAmount += row.credit - row.debit;
      expenseAccounts.push(line);
    }
  }
  else if (rootType === 'Income') {
    incomeAccounts.push(line);
  } else if (rootType === 'Expense') {
    expenseAccounts.push(line);
  }
});
```

**Bug #4 Fix - Add Date Validation**:
```typescript
import { validateDateRange } from '@/utils/report-validation';

const dateValidation = validateDateRange(fromDate, toDate);
if (!dateValidation.valid) {
  return NextResponse.json(
    { success: false, message: dateValidation.error },
    { status: 400 }
  );
}
```

**Bug #10 Fix - Use Centralized formatCurrency**:
```typescript
// Remove local formatCurrency function
import { formatCurrency } from '@/utils/format';
```

---

**All Other Report Files**:

**Bug #4 Fix - Add Date Validation**:
Apply to all reports that accept date parameters:
- `app/api/finance/reports/sales/route.ts`
- `app/api/finance/reports/purchases/route.ts`
- `app/api/finance/reports/payment-summary/route.ts`
- `app/api/finance/reports/payment-details/route.ts`
- Any other reports with date range parameters

```typescript
import { validateDateRange } from '@/utils/report-validation';

// Add after extracting query parameters
const dateValidation = validateDateRange(fromDate, toDate);
if (!dateValidation.valid) {
  return NextResponse.json(
    { success: false, message: dateValidation.error },
    { status: 400 }
  );
}
```

#### Phase 3: Update Type Definitions

**File**: `types/financial-reports.ts` (NEW)

**Purpose**: Centralized type definitions for financial reports

**Implementation**:
```typescript
export interface AccountMaster {
  name: string;
  account_name: string;
  account_type: string;
  root_type: string;
  parent_account: string;
  is_group: number;
  account_number?: string;
}

export interface GlEntry {
  account: string;
  debit?: number;
  credit?: number;
  posting_date?: string;
  voucher_type?: string;
  voucher_no?: string;
  against?: string;
  remarks?: string;
}

export interface ReportLine {
  account: string;
  account_name: string;
  account_number: string;
  account_type: string;
  amount: number;
  formatted_amount: string;
}

export interface VatInvoiceDetail {
  tanggal: string;
  nomor_invoice: string;
  customer_supplier: string;
  dpp: number;
  ppn: number;
  tax_rate?: number;
  formatted_dpp: string;
  formatted_ppn: string;
}

export interface DateValidationResult {
  valid: boolean;
  error?: string;
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:
1. **Exploratory Testing**: Surface counterexamples on unfixed code to confirm root causes
2. **Fix Checking**: Verify fixes work correctly for all bug conditions
3. **Preservation Checking**: Verify existing behavior unchanged for non-buggy inputs

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing fixes. Confirm or refute root cause hypotheses.

**Test Plan**: Create test scenarios for each bug using real ERPNext data or mock data that simulates production conditions. Run tests on UNFIXED code to observe failures.

**Test Cases**:

1. **Balance Sheet - Missing Net P/L** (will fail on unfixed code)
   - Setup: Create company with Income and Expense GL entries for current period
   - Action: Request Balance Sheet with as_of_date = current period end
   - Expected Failure: Total Assets ≠ Total Liabilities + Total Equity
   - Observation: Calculate expected Net P/L manually, verify it's missing from equity

2. **AR Report - Missing Returns** (will fail on unfixed code)
   - Setup: Create Sales Invoice with outstanding amount, then create Sales Return against it
   - Action: Request AR report
   - Expected Failure: Outstanding amount doesn't reflect the return
   - Observation: Verify return amount is not deducted from outstanding

3. **AP Report - Missing Returns** (will fail on unfixed code)
   - Setup: Create Purchase Invoice with outstanding amount, then create Purchase Return
   - Action: Request AP report
   - Expected Failure: Outstanding amount doesn't reflect the return
   - Observation: Verify return amount is not deducted from outstanding

4. **Date Validation - Invalid Range** (will fail on unfixed code)
   - Setup: None required
   - Action: Request any report with from_date > to_date
   - Expected Failure: No error returned, empty or incorrect data
   - Observation: Verify no validation error message

5. **VAT Report - Non-11% Tax Rate** (will fail on unfixed code)
   - Setup: Create Sales Invoice with 5% tax rate
   - Action: Request VAT report
   - Expected Failure: DPP calculated incorrectly (using 0.11 instead of 0.05)
   - Observation: Calculate expected DPP manually, verify mismatch

6. **Cash Flow - Custom Account Names** (will fail on unfixed code)
   - Setup: Create Cash account named "1110 - Petty Cash" (no "Kas" or "Bank" keyword)
   - Action: Request Cash Flow report
   - Expected Failure: Account not included in report
   - Observation: Verify account_type = 'Cash' but not in results

7. **HPP Ledger - Non-COGS Account** (will fail on unfixed code)
   - Setup: Create account "6100 - HPP Adjustment" with account_type ≠ 'Cost of Goods Sold'
   - Action: Request HPP Ledger report
   - Expected Failure: Account incorrectly included in report
   - Observation: Verify account included despite not being COGS

8. **P&L - Custom Discount Account** (will fail on unfixed code)
   - Setup: Create discount account "4350 - Sales Discount" (not 4300)
   - Action: Request Profit & Loss report
   - Expected Failure: Discount not recognized, incorrect net sales calculation
   - Observation: Verify discount not deducted from gross sales

9. **Balance Sheet - Custom Categorization** (will fail on unfixed code)
   - Setup: Create account "1500 - Short-term Investments" with account_type = 'Receivable'
   - Action: Request Balance Sheet
   - Expected Failure: Account miscategorized as Fixed Asset instead of Current Asset
   - Observation: Verify categorization based on hardcoded numbers, not account_type

10. **Currency Formatting - Inconsistency** (will fail on unfixed code)
    - Setup: None required
    - Action: Request multiple reports and compare currency formatting
    - Expected Failure: Inconsistent formatting across reports
    - Observation: Document formatting variations

**Expected Counterexamples**:
- Balance Sheet: Assets = 1,200,000,000, Liabilities + Equity = 1,100,000,000 (imbalance of 100,000,000)
- AR Report: Shows 50,000,000 outstanding when actual is 45,000,000 (5,000,000 overstatement)
- AP Report: Shows 30,000,000 outstanding when actual is 28,000,000 (2,000,000 overstatement)
- Date Validation: Returns 200 OK with empty data instead of 400 error
- VAT Report: DPP = 20,000,000 calculated as 9,090,909 (incorrect)
- Cash Flow: Missing valid cash accounts
- HPP Ledger: Includes non-COGS accounts
- P&L: Incorrect net sales calculation
- Balance Sheet: Incorrect Current/Fixed categorization
- Currency: Different formats like "Rp1.000.000,00" vs "Rp 1.000.000,00"

### Fix Checking

**Goal**: Verify that for all inputs where bug conditions hold, the fixed functions produce expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedReportFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases by Bug**:

1. **Balance Sheet Net P/L**:
   - Input: Company with Net P/L = 100,000,000
   - Assert: Total Equity includes Net P/L
   - Assert: Total Assets = Total Liabilities + Total Equity (balanced)

2. **AR with Returns**:
   - Input: Sales Invoice 50M outstanding, Sales Return 5M
   - Assert: Outstanding AR = 45M (correctly deducted)
   - Assert: Return amount visible in response

3. **AP with Returns**:
   - Input: Purchase Invoice 30M outstanding, Purchase Return 2M
   - Assert: Outstanding AP = 28M (correctly deducted)
   - Assert: Return amount visible in response

4. **Date Validation**:
   - Input: from_date = '2024-12-31', to_date = '2024-01-01'
   - Assert: Response status = 400
   - Assert: Error message = "from_date must be less than or equal to to_date"

5. **VAT Dynamic Tax Rate**:
   - Input: Invoice with 5% tax rate, PPN = 1,000,000
   - Assert: DPP = 20,000,000 (1,000,000 / 0.05)
   - Assert: tax_rate field = 5 in response

6. **Cash Flow account_type Filter**:
   - Input: Cash account "1110 - Petty Cash" with account_type = 'Cash'
   - Assert: Account included in Cash Flow report
   - Assert: All Cash and Bank account_type accounts included

7. **HPP Ledger account_type Filter**:
   - Input: Account "6100 - HPP Adjustment" with account_type ≠ 'Cost of Goods Sold'
   - Assert: Account NOT included in HPP Ledger
   - Assert: Only COGS account_type accounts included

8. **P&L Flexible Discount**:
   - Input: Discount account "4350 - Sales Discount"
   - Assert: Discount recognized and deducted from gross sales
   - Assert: Net sales = Gross sales - Discount

9. **Balance Sheet Flexible Categorization**:
   - Input: Account "1500 - Short-term Investments" with account_type = 'Receivable'
   - Assert: Categorized as Current Asset (not Fixed Asset)
   - Assert: Categorization based on account_type

10. **Consistent Currency Formatting**:
    - Input: Any report with amounts
    - Assert: All amounts formatted as "Rp 1.000.000,00"
    - Assert: Consistent format across all reports

### Preservation Checking

**Goal**: Verify that for all inputs where bug conditions do NOT hold, the fixed functions produce the same results as original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- Generates many test cases automatically across the input domain
- Catches edge cases that manual unit tests might miss
- Provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Capture baseline behavior from UNFIXED code for non-buggy scenarios, then verify FIXED code produces identical results.

**Test Cases**:

1. **Balance Sheet - Zero Net P/L Period**:
   - Baseline: Run Balance Sheet on unfixed code for period with zero Net P/L
   - Verify: Fixed code produces identical results (no Net P/L to add)

2. **AR - No Returns**:
   - Baseline: Run AR report on unfixed code with no Sales Returns
   - Verify: Fixed code produces identical outstanding amounts

3. **AP - No Returns**:
   - Baseline: Run AP report on unfixed code with no Purchase Returns
   - Verify: Fixed code produces identical outstanding amounts

4. **Valid Date Ranges**:
   - Baseline: Run reports with valid from_date <= to_date on unfixed code
   - Verify: Fixed code produces identical results (validation passes)

5. **VAT - Standard 11% Rate**:
   - Baseline: Run VAT report with 11% tax rate on unfixed code
   - Verify: Fixed code produces identical DPP calculations

6. **Cash Flow - Standard Account Names**:
   - Baseline: Run Cash Flow with accounts containing "Kas" or "Bank" on unfixed code
   - Verify: Fixed code produces identical results

7. **HPP Ledger - Only COGS Accounts**:
   - Baseline: Run HPP Ledger with only true COGS accounts on unfixed code
   - Verify: Fixed code produces identical results

8. **P&L - Standard Discount Accounts (4300/5300)**:
   - Baseline: Run P&L with standard discount accounts on unfixed code
   - Verify: Fixed code produces identical net sales/COGS calculations

9. **Balance Sheet - Standard Account Structure**:
   - Baseline: Run Balance Sheet with standard account structure on unfixed code
   - Verify: Fixed code produces identical categorization

10. **All Reports - Response Structure**:
    - Baseline: Capture response JSON structure from unfixed code
    - Verify: Fixed code maintains identical structure (only values change for buggy inputs)

### Unit Tests

**Test File**: `tests/financial-reports/date-validation.test.ts`
- Test validateDateRange with valid ranges
- Test validateDateRange with invalid ranges
- Test validateDateRange with invalid date formats
- Test validateDateRange with null dates

**Test File**: `tests/financial-reports/account-helpers.test.ts`
- Test isDiscountAccount with various account names
- Test isCurrentAsset with different account types
- Test isCurrentLiability with different account types

**Test File**: `tests/financial-reports/format-currency.test.ts`
- Test formatCurrency with positive amounts
- Test formatCurrency with negative amounts
- Test formatCurrency with zero
- Test formatCurrency with decimal precision

**Test File**: `tests/financial-reports/balance-sheet.test.ts`
- Test Balance Sheet with Net P/L calculation
- Test Balance Sheet equity includes Net P/L
- Test Balance Sheet balances (Assets = Liabilities + Equity)
- Test Balance Sheet categorization with account_type

**Test File**: `tests/financial-reports/ar-ap-reports.test.ts`
- Test AR report deducts Sales Returns
- Test AP report deducts Purchase Returns
- Test AR/AP with no returns (preservation)
- Test AR/AP with multiple returns per invoice

**Test File**: `tests/financial-reports/vat-report.test.ts`
- Test VAT report with 11% tax rate
- Test VAT report with 5% tax rate
- Test VAT report with 0% tax rate
- Test VAT report with mixed tax rates

**Test File**: `tests/financial-reports/cash-flow-hpp.test.ts`
- Test Cash Flow with account_type filter
- Test HPP Ledger with account_type filter
- Test Cash Flow includes all Cash/Bank accounts
- Test HPP Ledger includes only COGS accounts

**Test File**: `tests/financial-reports/profit-loss.test.ts`
- Test P&L with flexible discount detection
- Test P&L with standard discount accounts (4300/5300)
- Test P&L with custom discount accounts
- Test P&L net sales and net COGS calculations

### Property-Based Tests

**Test File**: `tests/financial-reports/pbt-balance-sheet.test.ts`
- Generate random GL entries with Income/Expense accounts
- Property: Balance Sheet always balances (Assets = Liabilities + Equity + Net P/L)
- Property: Net P/L = Total Income - Total Expense
- Property: All account categorizations based on account_type

**Test File**: `tests/financial-reports/pbt-ar-ap-preservation.test.ts`
- Generate random Sales/Purchase Invoices without returns
- Property: Fixed AR/AP reports produce same results as original
- Property: Outstanding amounts unchanged when no returns exist

**Test File**: `tests/financial-reports/pbt-date-validation.test.ts`
- Generate random date ranges
- Property: Valid ranges (from <= to) pass validation
- Property: Invalid ranges (from > to) fail with error
- Property: All reports reject invalid date ranges consistently

**Test File**: `tests/financial-reports/pbt-currency-formatting.test.ts`
- Generate random amounts (positive, negative, zero, large, small)
- Property: All amounts formatted consistently as "Rp X.XXX.XXX,XX"
- Property: Format consistent across all report types

**Test File**: `tests/financial-reports/pbt-account-filtering.test.ts`
- Generate random account structures with various account_types
- Property: Cash Flow includes all and only Cash/Bank account_types
- Property: HPP Ledger includes all and only COGS account_types
- Property: Filtering independent of account names

### Integration Tests

**Test File**: `tests/integration/financial-reports-flow.test.ts`
- Test complete financial reporting cycle:
  1. Create GL entries for a period
  2. Generate Balance Sheet (verify balances)
  3. Generate Profit & Loss (verify Net P/L)
  4. Verify Balance Sheet equity includes P&L Net P/L
  5. Generate AR/AP reports (verify outstanding amounts)
  6. Create returns and verify AR/AP adjustments
  7. Generate VAT report (verify tax calculations)
  8. Generate Cash Flow and HPP Ledger (verify account filtering)

**Test File**: `tests/integration/multi-company-reports.test.ts`
- Test reports with multiple companies
- Verify company filtering works correctly
- Verify fixes apply consistently across companies

**Test File**: `tests/integration/date-range-reports.test.ts`
- Test reports with various date ranges
- Test fiscal year boundaries
- Test month-end and year-end reporting
- Verify date validation across all reports

**Test File**: `tests/integration/custom-coa-reports.test.ts`
- Test reports with custom Chart of Accounts
- Verify flexible account detection works
- Verify categorization based on account_type
- Test with non-standard account numbers and names

## Implementation Checklist

### Phase 1: Utilities (Complete First)
- [ ] Create `utils/report-validation.ts` with validateDateRange function
- [ ] Verify `utils/format.ts` has consistent formatCurrency function
- [ ] Create `utils/account-helpers.ts` with isDiscountAccount, isCurrentAsset, isCurrentLiability
- [ ] Create `types/financial-reports.ts` with shared type definitions
- [ ] Write unit tests for all utility functions

### Phase 2: Report Fixes (Complete in Order)
- [ ] Fix Balance Sheet (Bug #1, #9, #10)
  - [ ] Add Net P/L calculation and include in equity
  - [ ] Replace hardcoded categorization with account_type
  - [ ] Use centralized formatCurrency
  - [ ] Add date validation
- [ ] Fix Accounts Receivable (Bug #2, #10)
  - [ ] Query and deduct Sales Returns
  - [ ] Use centralized formatCurrency
- [ ] Fix Accounts Payable (Bug #3, #10)
  - [ ] Query and deduct Purchase Returns
  - [ ] Use centralized formatCurrency
- [ ] Fix VAT Report (Bug #5, #10)
  - [ ] Implement dynamic tax rate extraction
  - [ ] Use centralized formatCurrency
  - [ ] Add date validation
- [ ] Fix Cash Flow (Bug #6, #4, #10)
  - [ ] Replace name filter with account_type filter
  - [ ] Add date validation
  - [ ] Use centralized formatCurrency
- [ ] Fix HPP Ledger (Bug #7, #4)
  - [ ] Replace name filter with account_type filter
  - [ ] Add date validation
- [ ] Fix Profit & Loss (Bug #8, #4, #10)
  - [ ] Implement flexible discount detection
  - [ ] Add date validation
  - [ ] Use centralized formatCurrency
- [ ] Apply date validation to all other reports (Bug #4)

### Phase 3: Testing (Complete After Fixes)
- [ ] Write and run exploratory tests on unfixed code
- [ ] Document all counterexamples found
- [ ] Write unit tests for all fixes
- [ ] Write property-based tests for preservation
- [ ] Write integration tests for complete flows
- [ ] Run all tests on fixed code
- [ ] Verify all tests pass

### Phase 4: Documentation and Deployment
- [ ] Update API documentation with new response fields (return_amount, tax_rate)
- [ ] Document breaking changes (if any)
- [ ] Create migration guide for custom implementations
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Monitor error logs for issues
