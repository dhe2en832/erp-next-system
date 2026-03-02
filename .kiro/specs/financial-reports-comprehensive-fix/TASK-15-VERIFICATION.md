# Task 15: Currency Formatting Consistency Verification

**Date:** 2024
**Requirements:** 2.19, 2.20 from bugfix.md

## Objective

Verify that all financial report routes are using the centralized `formatCurrency` utility from `@/utils/format` to ensure consistent currency formatting across all reports.

## Expected Format

All reports should format currency as: **"Rp 1.000.000,00"**
- Space after "Rp"
- Dot (.) for thousands separator
- Comma (,) for decimal separator
- 2 decimal places

## Centralized Utility

**Location:** `utils/format.ts`

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

## Verification Results

### ✅ Reports Using formatCurrency Correctly

#### 1. Balance Sheet
**File:** `app/api/finance/reports/balance-sheet/route.ts`
- **Status:** ✅ CORRECT
- **Import:** `import { formatCurrency } from '@/utils/format';`
- **Usage:** 
  - Individual account amounts: `formatted_amount: formatCurrency(amount)`
  - Summary totals: All totals in `formatted` object use `formatCurrency()`
- **Fields formatted:**
  - `total_current_assets`
  - `total_fixed_assets`
  - `total_assets`
  - `total_current_liabilities`
  - `total_long_term_liabilities`
  - `total_liabilities`
  - `total_equity`
  - `total_liabilities_and_equity`
  - `net_profit_loss`

#### 2. Profit & Loss
**File:** `app/api/finance/reports/profit-loss/route.ts`
- **Status:** ✅ CORRECT
- **Import:** `import { formatCurrency } from '@/utils/format';`
- **Usage:**
  - Individual account amounts: `formatted_amount: formatCurrency(amount)`
  - Summary totals: All totals in `formatted` object use `formatCurrency()`
- **Fields formatted:**
  - `gross_sales`
  - `sales_discount`
  - `net_sales`
  - `gross_cogs`
  - `purchase_discount`
  - `net_cogs`
  - `gross_profit`
  - `total_expenses`
  - `net_profit`

#### 3. VAT Report
**File:** `app/api/finance/reports/vat-report/route.ts`
- **Status:** ✅ CORRECT
- **Import:** `import { formatCurrency } from '@/utils/format';`
- **Usage:**
  - Invoice details: `formatted_dpp: formatCurrency(dpp)`, `formatted_ppn: formatCurrency(data.ppn)`
  - Summary totals: `formatted_total: formatCurrency(total)`
- **Fields formatted:**
  - `formatted_dpp` (per invoice)
  - `formatted_ppn` (per invoice)
  - `formatted_total` (PPN Output total)
  - `formatted_total` (PPN Input total)
  - `total_ppn_output`
  - `total_ppn_input`
  - `ppn_kurang_lebih_bayar`

### ⚠️ Reports Importing But NOT Using formatCurrency

#### 4. Accounts Receivable
**File:** `app/api/finance/reports/accounts-receivable/route.ts`
- **Status:** ⚠️ IMPORTED BUT NOT USED
- **Import:** `import { formatCurrency } from '@/utils/format';` (Line 2)
- **Issue:** Import exists but function is never called
- **Current behavior:** Returns raw numeric values
- **Fields that should be formatted:**
  - `invoice_grand_total`
  - `outstanding_amount`
  - `return_amount`
- **Recommendation:** Either use the import or remove it (currently causing unused import warning)

#### 5. Accounts Payable
**File:** `app/api/finance/reports/accounts-payable/route.ts`
- **Status:** ⚠️ IMPORTED BUT NOT USED
- **Import:** `import { formatCurrency } from '@/utils/format';` (Line 2)
- **Issue:** Import exists but function is never called (TypeScript diagnostic warning)
- **Current behavior:** Returns raw numeric values
- **Fields that should be formatted:**
  - `invoice_grand_total`
  - `outstanding_amount`
  - `return_amount`
- **Recommendation:** Either use the import or remove it (currently causing unused import warning)

### ❌ Reports NOT Using formatCurrency

#### 6. Cash Flow
**File:** `app/api/finance/reports/cash-flow/route.ts`
- **Status:** ❌ NOT USING
- **Import:** None
- **Current behavior:** Returns raw numeric values from GL Entry
- **Fields that could be formatted:**
  - `debit`
  - `credit`
- **Note:** This report returns GL Entry data directly without aggregation, so currency formatting may be intentionally left to the frontend

#### 7. HPP Ledger
**File:** `app/api/finance/reports/hpp-ledger/route.ts`
- **Status:** ❌ NOT USING
- **Import:** None
- **Current behavior:** Returns raw numeric values
- **Fields that could be formatted:**
  - `debit`
  - `credit`
  - `amount` (calculated field)
  - `total` (summary field)
- **Note:** This report returns ledger entries, so currency formatting may be intentionally left to the frontend

## Analysis

### Consistency Status

**Partially Consistent** - 3 out of 7 core financial reports use the centralized `formatCurrency` utility.

### Issues Identified

1. **Unused Imports:** AR and AP reports import `formatCurrency` but don't use it, causing TypeScript warnings
2. **Missing Formatting:** Cash Flow and HPP Ledger don't format currency at all
3. **Inconsistent Approach:** Some reports format on backend (Balance Sheet, P&L, VAT), others return raw values (AR, AP, Cash Flow, HPP)

### Design Decision Required

There are two valid approaches:

**Option A: Backend Formatting (Current for Balance Sheet, P&L, VAT)**
- Pros: Consistent formatting guaranteed, single source of truth
- Cons: Larger response payloads (both raw and formatted values)
- Pattern: Return both raw numeric values AND formatted strings

**Option B: Frontend Formatting (Current for AR, AP, Cash Flow, HPP)**
- Pros: Smaller response payloads, more flexible for different locales
- Cons: Requires frontend to import and use the same utility
- Pattern: Return only raw numeric values, format in UI components

### Recommendation

For **Bug #10 (Currency Formatting Inconsistency)** to be fully resolved, the system should choose ONE approach:

**Recommended: Option A (Backend Formatting)**
1. Keep current implementation for Balance Sheet, P&L, VAT
2. Add formatted fields to AR and AP responses (use the existing imports)
3. Add formatted fields to Cash Flow and HPP Ledger responses
4. Maintain both raw and formatted values in all responses

This ensures:
- ✅ Consistent "Rp 1.000.000,00" format across all reports
- ✅ Single source of truth for formatting logic
- ✅ Frontend can use either raw or formatted values as needed
- ✅ Satisfies requirements 2.19 and 2.20

## Requirements Validation

### Requirement 2.19
> WHEN laporan keuangan dijalankan THEN sistem SHALL menggunakan satu utility function `formatCurrency()` yang konsisten

**Status:** ✅ PARTIALLY MET
- Single utility function exists in `utils/format.ts`
- Used consistently where applied (Balance Sheet, P&L, VAT)
- NOT used in AR, AP, Cash Flow, HPP Ledger

### Requirement 2.20
> WHEN laporan keuangan dijalankan THEN format display SHALL konsisten di semua laporan (format: "Rp 1.000.000,00")

**Status:** ⚠️ PARTIALLY MET
- Format is consistent where applied (correct "Rp 1.000.000,00" format)
- NOT consistent across all reports (some return raw values)

## Conclusion

The centralized `formatCurrency` utility exists and is correctly implemented. All 7 core financial reports now use it consistently:

**✅ FULLY IMPLEMENTED - Option A (Backend Formatting):**
1. Balance Sheet - Uses formatCurrency for all amounts ✅
2. Profit & Loss - Uses formatCurrency for all amounts ✅
3. VAT Report - Uses formatCurrency for all amounts ✅
4. Accounts Receivable - Now includes formatted_grand_total, formatted_outstanding, formatted_return_amount ✅
5. Accounts Payable - Now includes formatted_grand_total, formatted_outstanding, formatted_return_amount ✅
6. Cash Flow - Now includes formatted_debit, formatted_credit ✅
7. HPP Ledger - Now includes formatted_debit, formatted_credit, formatted_amount, formatted_total ✅

**Bug #10 Status: ✅ FULLY FIXED**

All reports now:
- Use the centralized `formatCurrency()` utility from `@/utils/format`
- Return both raw numeric values AND formatted strings
- Format consistently as "Rp 1.000.000,00" (space after Rp, dot for thousands, comma for decimals)
- Satisfy requirements 2.19 and 2.20 completely

**Changes Made:**
- Accounts Receivable: Added formatted_grand_total, formatted_outstanding, formatted_return_amount fields
- Accounts Payable: Added formatted_grand_total, formatted_outstanding, formatted_return_amount fields
- Cash Flow: Added formatted_debit, formatted_credit fields
- HPP Ledger: Added formatted_debit, formatted_credit, formatted_amount, formatted_total fields

**TypeScript Diagnostics:** All clean, no unused import warnings.
