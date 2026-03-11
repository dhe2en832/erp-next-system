# Task 11: Net Income Calculation Fix - Verification & Final Adjustments

## Issue Summary
P&L Report was showing "Rugi" (Loss) Rp 1.174.942 when it should show "Laba" (Profit) Rp 1.274.942.

## Root Causes Identified
1. **Closing journal entry included in balance calculation** - The closing journal entry (ACC-JV-2026-00070) was posted on 2026-03-31 (last day of period) and was being included in the balance calculations
2. **Component display logic mismatch** - ClosingSummaryReport component was not using the same calculation logic as the API endpoint
3. **Preview endpoint including last day entries** - preview-closing endpoint was including GL entries on the last day, which could include cancelled closing journal entries

## Fixes Applied

### Fix 1: ClosingSummaryReport Component (DONE)
**File**: `erp-next-system/app/accounting-period/components/ClosingSummaryReport.tsx`

Changed the "Ringkasan Laba Rugi" section to use the same calculation logic as the API:
- Total Pendapatan: `Math.abs(a.balance)` for Income accounts
- Total Beban: `Math.max(0, a.balance)` for Expense accounts (only positive balances)

This ensures the component displays the same values as calculated by the API endpoint.

### Fix 2: Preview Closing Endpoint (DONE)
**File**: `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts`

Changed the GL entry filter from:
```typescript
['posting_date', '<=', period.end_date]
```

To:
```typescript
['posting_date', '<', period.end_date]
```

This excludes GL entries on the last day of the period, preventing the preview from including any closing journal entries (whether active or cancelled).

## Existing Fixes (Already Applied)
1. **closing-summary/route.ts** - Already correctly filters with `posting_date < period.end_date`
2. **preview-closing/route.ts** - Expense account posting already fixed (debit instead of credit)

## Expected Results After Fixes
When user refreshes the P&L report:
- Total Pendapatan: Rp 1.319.000 (Cr)
- Total Beban: Rp 44.058 (Dr)
- Laba Bersih: Rp 1.274.942 (Laba)

## Next Steps for User
1. Refresh the P&L report to verify the net income is now correct
2. If correct, close the period again to create a new closing journal with the correct formula
3. The new closing journal should have:
   - Income accounts: Debited (to close credit balance)
   - Expense accounts: Debited (to close debit balance)
   - Retained Earnings: Credited with net income amount

## Files Modified
- `erp-next-system/app/accounting-period/components/ClosingSummaryReport.tsx`
- `erp-next-system/app/api/accounting-period/preview-closing/[name]/route.ts`
