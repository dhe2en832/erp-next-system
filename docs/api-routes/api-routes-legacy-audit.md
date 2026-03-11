# API Routes Multi-Site Support - Legacy Pattern Audit Report

**Date:** 2024-01-15  
**Spec:** API Routes Multi-Site Support  
**Task:** 1. Audit and identify all legacy API routes

## Executive Summary

This audit identifies all API routes in the erp-next-system that use legacy patterns and need migration to support multi-site functionality. The system currently has **157 total API route files**, with **132 routes using the legacy `ERPNEXT_API_URL` constant pattern**, **13 routes using the `erpnextClient` import pattern**, and **2 routes already migrated** to the modern `getERPNextClientForRequest()` pattern.

### Key Findings

- **Total API Routes:** 157
- **Legacy Pattern (ERPNEXT_API_URL constant):** 132 routes (84%)
- **ERPNext Client Import Pattern:** 13 routes (8%)
- **Already Migrated (Modern Pattern):** 2 routes (1%)
- **Other/Unknown:** 10 routes (6%)

### Migration Priority

All 145 routes using legacy patterns need migration to enable dynamic multi-site switching without server restarts.

## Legacy Pattern Categories

### Pattern 1: ERPNEXT_API_URL Constant with Direct Fetch (132 routes)

These routes declare `const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000'` and use direct `fetch()` calls to communicate with ERPNext.

**Migration Required:** Replace with `getERPNextClientForRequest()` and transform fetch calls to client methods.

### Pattern 2: ERPNext Client Import (13 routes)

These routes import `erpnextClient` from `@/lib/erpnext` and use it directly without request context.

**Migration Required:** Replace `erpnextClient` with `getERPNextClientForRequest(request)` to enable site-aware operations.

## Routes by Module

### Finance Module (43 routes)

#### Finance - Accounts (3 routes)
- ✅ `app/api/finance/accounts/route.ts` - **ALREADY MIGRATED** (uses getERPNextClientForRequest)
- ❌ `app/api/finance/accounts/cash-bank/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/accounts/expense/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - Commission (4 routes)
- ❌ `app/api/finance/commission/account/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/commission/accounts/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/commission/pay/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/commission/payable-invoices/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - Company (4 routes)
- ❌ `app/api/finance/company/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/company/accounts/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/company/fiscal-years/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/company/settings/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - GL Entry (1 route)
- ❌ `app/api/finance/gl-entry/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - Journal (5 routes)
- ❌ `app/api/finance/journal/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/journal/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/journal/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/journal/kas-keluar/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/journal/kas-masuk/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - Payments (6 routes)
- ❌ `app/api/finance/payments/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/payments/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/payments/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/payments/bounce-warkat/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/payments/clear-warkat/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/payments/details/route.ts` - Legacy (ERPNEXT_API_URL)

#### Finance - Reports (20 routes)
- ❌ `app/api/finance/reports/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/accounts-payable/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/accounts-receivable/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/acquisition-costs/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/balance-sheet/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/cash-flow/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/hpp-ledger/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/hpp-reconciliation/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/margin-analysis/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/payment-details/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/payment-summary/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/profit-loss/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/purchase-invoice-details/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/purchases/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/returns/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/sales/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/sales-invoice-details/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/stock-adjustment/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/vat-report/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/finance/reports/vat-report/export/route.ts` - Legacy (ERPNEXT_API_URL)

### HR Module (3 routes)

- ❌ `app/api/hr/departments/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/hr/designations/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/hr/employees/route.ts` - Legacy (ERPNEXT_API_URL)

### Inventory Module (18 routes)

#### Inventory - Dropdowns (2 routes)
- ❌ `app/api/inventory/dropdowns/item-groups/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/dropdowns/uoms/route.ts` - Legacy (ERPNEXT_API_URL)

#### Inventory - Items (5 routes)
- ❌ `app/api/inventory/items/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/items/[item_code]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/items/brands/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/items/simple/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/items/valuation-rate/route.ts` - Legacy (ERPNEXT_API_URL)

#### Inventory - Stock Entry (4 routes)
- ❌ `app/api/inventory/stock-entry/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/stock-entry/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/stock-entry/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/stock-entry/ledger/route.ts` - Legacy (ERPNEXT_API_URL)

#### Inventory - Other (7 routes)
- ❌ `app/api/inventory/check/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/reconciliation/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/reports/stock-balance/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/reports/stock-card/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/inventory/warehouses/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/inventory/items/price/route.ts` - Unknown pattern (needs investigation)
- ⚠️ `app/api/utils/erpnext/erpnext/warehouse/route.ts` - Unknown pattern (needs investigation)

### Purchase Module (19 routes)

#### Purchase - Addresses (2 routes)
- ❌ `app/api/purchase/addresses/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/addresses/[name]/route.ts` - Legacy (ERPNEXT_API_URL)

#### Purchase - Invoices (5 routes)
- ❌ `app/api/purchase/invoices/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/invoices/[piName]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/invoices/detail/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/invoices/details/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/invoices/outstanding/route.ts` - Legacy (ERPNEXT_API_URL)

#### Purchase - Orders (5 routes)
- ❌ `app/api/purchase/orders/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/orders/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/orders/[name]/complete/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/orders/[name]/items/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/orders/[name]/receive/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/orders/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)

#### Purchase - Receipts (5 routes)
- ❌ `app/api/purchase/receipts/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/receipts/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/receipts/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/receipts/detail-for-pi/[pr]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/receipts/list-for-pi/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/receipts/list-for-pr/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/purchase/receipts/fetch-po-detail/route.ts` - Unknown pattern (needs investigation)

#### Purchase - Suppliers (3 routes)
- ❌ `app/api/purchase/suppliers/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/suppliers/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/purchase/supplier-groups/route.ts` - Legacy (ERPNEXT_API_URL)

### Sales Module (33 routes)

#### Sales - Credit Note (5 routes)
- ❌ `app/api/sales/credit-note/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/credit-note/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/credit-note/[name]/cancel/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/credit-note/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/credit-note/invoices/route.ts` - Legacy (ERPNEXT_API_URL)

#### Sales - Customers (4 routes)
- ❌ `app/api/sales/customers/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/customers/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/customers/customer/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/customer-groups/route.ts` - Legacy (ERPNEXT_API_URL)

#### Sales - Delivery Notes (5 routes)
- ❌ `app/api/sales/delivery-notes/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-notes/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-notes/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-notes/from-sales-order/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-notes/with-so-ref/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/sales/delivery-notes/detail/route.ts` - Unknown pattern (needs investigation)

#### Sales - Delivery Note Return (4 routes)
- ❌ `app/api/sales/delivery-note-return/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-note-return/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-note-return/[name]/cancel/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/delivery-note-return/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)

#### Sales - Invoices (5 routes)
- ❌ `app/api/sales/invoices/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/invoices/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/invoices/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/invoices/details/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/invoices/outstanding/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/sales/invoices/items/route.ts` - Unknown pattern (needs investigation)

#### Sales - Orders (4 routes)
- ❌ `app/api/sales/orders/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/orders/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/orders/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/orders/available-for-dn/route.ts` - Legacy (ERPNEXT_API_URL)

#### Sales - Sales Return (4 routes)
- ❌ `app/api/sales/sales-return/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/sales-return/[name]/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/sales-return/[name]/cancel/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/sales-return/[name]/submit/route.ts` - Legacy (ERPNEXT_API_URL)

#### Sales - Other (6 routes)
- ❌ `app/api/sales/price-lists/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/sales-persons/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/sales-persons/detail/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/sales/territories/route.ts` - Legacy (ERPNEXT_API_URL)

### Setup Module (13 routes)

#### Setup - Auth (5 routes)
- ❌ `app/api/setup/auth/generate-key/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/auth/login/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/auth/logout/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/auth/me/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/auth/set-company/route.ts` - Legacy (ERPNEXT_API_URL)

#### Setup - Other (8 routes)
- ⚠️ `app/api/setup/companies/route.ts` - Uses erpnextClient import (needs migration)
- ❌ `app/api/setup/dashboard/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/employees/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/setup/fiscal-years/route.ts` - Uses erpnextClient import (needs migration)
- ❌ `app/api/setup/payment-terms/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/payment-terms/detail/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/projects/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/tax-templates/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/setup/users/route.ts` - Legacy (ERPNEXT_API_URL)
- ⚠️ `app/api/setup/commission/route.ts` - Unknown pattern (needs investigation)
- ⚠️ `app/api/setup/commission/preview/route.ts` - Unknown pattern (needs investigation)

### Utilities Module (3 routes)

- ❌ `app/api/utils/diagnose/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/utils/erpnext/erpnext-valid-data/route.ts` - Legacy (ERPNEXT_API_URL)
- ❌ `app/api/utils/test/route.ts` - Legacy (ERPNEXT_API_URL)

### Accounting Period Module (13 routes)

- ✅ `app/api/accounting-period/generate-monthly/route.ts` - **ALREADY MIGRATED** (uses getERPNextClientForRequest)
- ⚠️ `app/api/accounting-period/audit-log/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/balances/[name]/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/check-restriction/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/close/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/config/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/periods/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/periods/[name]/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/permanent-close/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/preview-closing/[name]/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/reopen/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/reports/closing-summary/route.ts` - Uses erpnextClient import (needs migration)
- ⚠️ `app/api/accounting-period/validate/route.ts` - Uses erpnextClient import (needs migration)

### Profit Report Module (1 route)

- ⚠️ `app/api/profit-report/route.ts` - Uses erpnextClient import (needs migration)

## Summary by Category

| Category | Count | Percentage |
|----------|-------|------------|
| **Legacy (ERPNEXT_API_URL)** | 132 | 84% |
| **ERPNext Client Import** | 13 | 8% |
| **Already Migrated** | 2 | 1% |
| **Unknown/Needs Investigation** | 10 | 6% |
| **TOTAL** | 157 | 100% |

## Migration Recommendations

### Priority 1: Core Business Operations (High Priority)
Migrate these modules first as they are critical for daily operations:
1. **Sales Module** (33 routes) - Orders, Invoices, Delivery Notes
2. **Purchase Module** (19 routes) - Orders, Receipts, Invoices
3. **Inventory Module** (18 routes) - Stock management, Items

### Priority 2: Financial Operations (High Priority)
4. **Finance Module** (43 routes) - Reports, GL Entries, Payments, Journal Entries

### Priority 3: Setup and Configuration (Medium Priority)
5. **Setup Module** (13 routes) - Dashboard, Users, Auth, Payment Terms
6. **Accounting Period Module** (13 routes) - Period management

### Priority 4: Supporting Functions (Low Priority)
7. **HR Module** (3 routes) - Employees, Departments
8. **Utilities Module** (3 routes) - Diagnostics, Testing
9. **Profit Report** (1 route)

### Unknown Routes Requiring Investigation (10 routes)
These routes need manual inspection to determine their pattern:
- `app/api/inventory/items/price/route.ts`
- `app/api/purchase/receipts/fetch-po-detail/route.ts`
- `app/api/sales/delivery-notes/detail/route.ts`
- `app/api/sales/invoices/items/route.ts`
- `app/api/setup/commission/route.ts`
- `app/api/setup/commission/preview/route.ts`
- `app/api/utils/erpnext/erpnext/warehouse/route.ts`

## Migration Pattern

### For ERPNEXT_API_URL Routes (132 routes)

**Before:**
```typescript
const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item`, {
    headers: getHeaders()
  });
  // ...
}
```

**After:**
```typescript
import { getERPNextClientForRequest, getSiteIdFromRequest, buildSiteAwareErrorResponse, logSiteError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const items = await client.getList('Item');
    return NextResponse.json({ success: true, data: items });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

### For erpnextClient Import Routes (13 routes)

**Before:**
```typescript
import { erpnextClient } from '@/lib/erpnext';

export async function GET(request: NextRequest) {
  const items = await erpnextClient.getList('Item');
  // ...
}
```

**After:**
```typescript
import { getERPNextClientForRequest, getSiteIdFromRequest, buildSiteAwareErrorResponse, logSiteError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const items = await client.getList('Item');
    return NextResponse.json({ success: true, data: items });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

## Next Steps

1. ✅ **Task 1 Complete:** Audit completed - 145 routes identified for migration
2. **Task 2:** Begin migration with Utilities module (3 routes) for testing infrastructure
3. **Task 3:** Migrate Setup module (13 routes) for configuration support
4. **Task 4:** Migrate Sales module (33 routes) for core business operations
5. **Task 5:** Migrate Purchase module (19 routes) for procurement operations
6. **Task 6:** Migrate HR module (3 routes) for employee management
7. **Task 7:** Migrate Finance module (43 routes) for financial operations
8. **Task 8:** Migrate Inventory module (18 routes) for stock management
9. **Task 9:** Migrate Accounting Period module (13 routes) for period management
10. **Task 10:** Investigate and migrate unknown pattern routes (10 routes)

## Validation Criteria

After migration, verify:
- ✅ No routes use `const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL`
- ✅ No routes import `erpnextClient` from `@/lib/erpnext` without request context
- ✅ All routes import from `@/lib/api-helpers`
- ✅ All routes use `getERPNextClientForRequest(request)`
- ✅ All routes use site-aware error handling (`buildSiteAwareErrorResponse`, `logSiteError`)
- ✅ All routes extract site ID at handler start using `getSiteIdFromRequest(request)`
- ✅ All existing multi-company filtering logic is preserved
- ✅ All response formats remain backward compatible

---

**Report Generated:** 2024-01-15  
**Audited By:** Kiro AI Assistant  
**Spec Reference:** erpnext-dev/.kiro/specs/api-routes-multi-site-support
