# Site-Aware Error Handling Coverage Report

Generated: 2026-03-05T13:04:49.500Z

## Summary

- **Total API Routes**: 159
- **✅ Fully Compliant**: 33 (21%)
- **⚠️ Partially Compliant**: 0 (0%)
- **❌ Non-Compliant**: 126 (79%)
- **⚪ No Error Handling**: 0 (0%)

## Compliance Criteria

A route is considered **fully compliant** if it:
1. Imports and uses `buildSiteAwareErrorResponse` for error responses
2. Imports and uses `logSiteError` for error logging
3. Imports and uses `getSiteIdFromRequest` to extract site context
4. Has error handling (catch blocks)

## ✅ Fully Compliant Routes

These routes properly implement site-aware error handling:

- `app/api/accounting-period/generate-monthly/route.ts` (2 error handlers)
- `app/api/finance/accounts/route.ts` (4 error handlers)
- `app/api/hr/departments/route.ts` (1 error handler)
- `app/api/hr/designations/route.ts` (1 error handler)
- `app/api/hr/employees/route.ts` (3 error handlers)
- `app/api/purchase/invoices/[name]/route.ts` (3 error handlers)
- `app/api/purchase/invoices/[name]/submit/route.ts` (1 error handler)
- `app/api/purchase/invoices/route.ts` (6 error handlers)
- `app/api/purchase/orders/[name]/route.ts` (3 error handlers)
- `app/api/purchase/orders/[name]/submit/route.ts` (1 error handler)
- `app/api/purchase/orders/route.ts` (4 error handlers)
- `app/api/purchase/receipts/[name]/route.ts` (3 error handlers)
- `app/api/purchase/receipts/[name]/submit/route.ts` (1 error handler)
- `app/api/purchase/receipts/route.ts` (3 error handlers)
- `app/api/sales/delivery-notes/[name]/route.ts` (1 error handler)
- `app/api/sales/delivery-notes/[name]/submit/route.ts` (3 error handlers)
- `app/api/sales/delivery-notes/route.ts` (3 error handlers)
- `app/api/sales/invoices/[name]/route.ts` (2 error handlers)
- `app/api/sales/invoices/[name]/submit/route.ts` (4 error handlers)
- `app/api/sales/invoices/route.ts` (7 error handlers)
- `app/api/sales/orders/[name]/route.ts` (1 error handler)
- `app/api/sales/orders/[name]/submit/route.ts` (1 error handler)
- `app/api/sales/orders/route.ts` (6 error handlers)
- `app/api/setup/commission/preview/route.ts` (1 error handler)
- `app/api/setup/dashboard/route.ts` (1 error handler)
- `app/api/setup/employees/route.ts` (1 error handler)
- `app/api/setup/payment-terms/route.ts` (2 error handlers)
- `app/api/setup/tax-templates/route.ts` (2 error handlers)
- `app/api/setup/users/route.ts` (3 error handlers)
- `app/api/utils/diagnose/route.ts` (7 error handlers)
- `app/api/utils/erpnext/erpnext/warehouse/route.ts` (1 error handler)
- `app/api/utils/erpnext/erpnext-valid-data/route.ts` (7 error handlers)
- `app/api/utils/test/route.ts` (1 error handler)

## ❌ Non-Compliant Routes

These routes have error handling but do not use site-aware patterns:

- `app/api/accounting-period/audit-log/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/balances/[name]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/check-restriction/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/close/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/config/route.ts` (6 error handlers)
  - Uses legacy error response pattern
- `app/api/accounting-period/periods/[name]/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/accounting-period/periods/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/accounting-period/permanent-close/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/preview-closing/[name]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/reopen/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/reports/closing-summary/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/accounting-period/validate/route.ts` (10 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/accounts/cash-bank/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/accounts/expense/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/commission/account/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/commission/accounts/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/commission/pay/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/commission/payable-invoices/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/company/accounts/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/company/fiscal-years/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/company/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/company/settings/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/gl-entry/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/journal/[name]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/journal/[name]/submit/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/journal/kas-keluar/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/journal/kas-masuk/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/journal/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/payments/[name]/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/payments/[name]/submit/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/payments/bounce-warkat/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/payments/clear-warkat/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/payments/details/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/payments/route.ts` (9 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/accounts-payable/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/accounts-receivable/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/acquisition-costs/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/balance-sheet/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/cash-flow/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/hpp-ledger/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/hpp-reconciliation/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/margin-analysis/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/payment-details/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/payment-summary/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/profit-loss/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/purchase-invoice-details/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/purchases/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/returns/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/sales/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/sales-invoice-details/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/finance/reports/stock-adjustment/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/vat-report/export/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/finance/reports/vat-report/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/check/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/dropdowns/item-groups/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/dropdowns/uoms/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/items/[item_code]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/items/brands/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/items/price/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/items/route.ts` (6 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/items/simple/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/items/valuation-rate/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/reconciliation/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/reports/stock-balance/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/reports/stock-card/route.ts` (11 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/stock-entry/[name]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/stock-entry/[name]/submit/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/stock-entry/ledger/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/inventory/stock-entry/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/inventory/warehouses/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/profit-report/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/addresses/[name]/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/addresses/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/invoices/[piName]/submit/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/invoices/detail/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/invoices/details/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/invoices/outstanding/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/orders/[name]/complete/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/orders/[name]/items/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/orders/[name]/receive/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/receipts/detail-for-pi/[pr]/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/receipts/fetch-po-detail/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/receipts/list-for-pi/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/receipts/list-for-pr/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/supplier-groups/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/purchase/suppliers/[name]/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/purchase/suppliers/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/credit-note/[name]/cancel/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/credit-note/[name]/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/credit-note/[name]/submit/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/credit-note/invoices/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/credit-note/route.ts` (11 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/customer-groups/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/customers/[name]/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/customers/customer/[name]/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/customers/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-note-return/[name]/cancel/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-note-return/[name]/route.ts` (5 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-note-return/[name]/submit/route.ts` (3 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-note-return/route.ts` (10 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-notes/detail/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/delivery-notes/from-sales-order/[name]/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/delivery-notes/with-so-ref/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/invoices/details/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/invoices/items/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/invoices/outstanding/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/orders/available-for-dn/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/price-lists/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/sales/sales-persons/detail/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/sales-persons/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/sales-return/[name]/cancel/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/sales-return/[name]/route.ts` (4 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/sales-return/[name]/submit/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/sales-return/route.ts` (7 error handlers)
  - Uses legacy error response pattern
- `app/api/sales/territories/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/auth/generate-key/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/auth/login/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/setup/auth/logout/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/auth/me/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/auth/set-company/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/setup/commission/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/setup/companies/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/fiscal-years/route.ts` (1 error handler)
  - Uses legacy error response pattern
- `app/api/setup/payment-terms/detail/route.ts` (2 error handlers)
  - Uses legacy error response pattern
- `app/api/setup/projects/route.ts` (1 error handler)
  - Uses legacy error response pattern

## Recommendations

### For Non-Compliant Routes

These routes need to be migrated to use site-aware error handling. Follow the migration pattern:

1. Import site-aware helpers
2. Extract site ID from request
3. Replace legacy error responses with `buildSiteAwareErrorResponse`
4. Replace console.error with `logSiteError`

## Validation

To verify site-aware error handling:

1. **Error responses include site context**: Check that error responses have a `site` field when site ID is present
2. **Error logs include site context**: Check that error logs include site ID for troubleshooting
3. **Error type classification**: Check that errors are classified correctly (network, authentication, configuration, unknown)
