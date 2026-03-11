# API Routes Unmigrated Documentation

**Date**: 2024-01-15
**Task**: 16.3 Document any unmigrated routes
**Spec**: API Routes Multi-Site Support
**Requirement**: 12.5 - Document any API routes that cannot be migrated with justification

## Executive Summary

This document provides comprehensive documentation of all API routes that were not migrated as part of the API Routes Multi-Site Support specification. Out of 149 total API routes identified in the codebase, **33 routes (22%) were successfully migrated** and **116 routes (78%) remain unmigrated**.

### Key Findings

- **Total Routes Identified**: 149
- **Successfully Migrated**: 33 routes (22%)
- **Unmigrated Routes**: 116 routes (78%)
- **Routes That Cannot Be Migrated**: 0 routes (all routes are technically migratable)
- **Routes Out of Scope**: 116 routes (intentionally excluded from this specification)

### Important Clarification

**All unmigrated routes CAN be migrated** - there are no technical limitations preventing migration. The routes remain unmigrated because they were **intentionally excluded from the scope** of this specification to maintain a focused, achievable implementation plan.

## Scope of This Specification

### In-Scope Modules (Migrated)

This specification focused on migrating the following modules to establish the multi-site pattern:

1. **Utilities Module** (4 routes) - Diagnostic and testing utilities
2. **Setup Module** (7 routes) - Core setup operations (dashboard, payment terms, employees, tax templates, users, commission)
3. **Sales Module - Core** (9 routes) - Sales Orders, Delivery Notes, Sales Invoices (CRUD + submit operations)
4. **Purchase Module - Core** (9 routes) - Purchase Orders, Purchase Receipts, Purchase Invoices (CRUD + submit operations)
5. **HR Module** (3 routes) - Employees, Departments, Designations

**Total In-Scope**: 32 routes across 5 modules

### Out-of-Scope Modules (Unmigrated)

The following modules were intentionally excluded from this specification:

1. **Finance Module** (40+ routes) - Accounts, GL Entry, Journal, Payments, Commission, Company, Reports
2. **Inventory Module** (20+ routes) - Items, Stock Entry, Warehouses, Reconciliation, Reports
3. **Accounting Period Module** (13 routes) - Period management, closing, validation
4. **Sales Module - Extended** (20+ routes) - Sales Returns, Credit Notes, Customers, Sales Persons, Territories
5. **Purchase Module - Extended** (13 routes) - Suppliers, Addresses, Additional operations
6. **Setup Module - Extended** (5 routes) - Authentication routes, Companies, Fiscal Years, Projects
7. **Profit Report Module** (1 route) - Profit reporting

**Total Out-of-Scope**: 116+ routes across 7 module categories

## Categorization of Unmigrated Routes

### Category 1: Out of Scope - Finance Module (40+ routes)

**Justification**: The Finance module represents the largest unmigrated surface area with complex business logic, multiple sub-modules, and critical accounting operations. Migrating this module requires:
- Deep understanding of accounting workflows
- Extensive testing of financial calculations
- Validation of GL entry generation
- Testing of financial reports across multiple sites

**Decision**: Excluded from initial specification to maintain focus on establishing the multi-site pattern with simpler modules first.

**Routes**:

#### Accounts (3 routes)
- `/api/finance/accounts/route.ts` - Chart of Accounts listing
- `/api/finance/accounts/cash-bank/route.ts` - Cash and Bank accounts
- `/api/finance/accounts/expense/route.ts` - Expense accounts

#### GL Entry (1 route)
- `/api/finance/gl-entry/route.ts` - General Ledger entries

#### Journal (5 routes)
- `/api/finance/journal/route.ts` - Journal Entry listing and creation
- `/api/finance/journal/[name]/route.ts` - Journal Entry detail operations
- `/api/finance/journal/[name]/submit/route.ts` - Journal Entry submission
- `/api/finance/journal/kas-masuk/route.ts` - Cash In journal entries
- `/api/finance/journal/kas-keluar/route.ts` - Cash Out journal entries

#### Payments (6 routes)
- `/api/finance/payments/route.ts` - Payment Entry listing and creation
- `/api/finance/payments/[name]/route.ts` - Payment Entry detail operations
- `/api/finance/payments/[name]/submit/route.ts` - Payment Entry submission
- `/api/finance/payments/details/route.ts` - Payment details
- `/api/finance/payments/bounce-warkat/route.ts` - Bounce check/warkat
- `/api/finance/payments/clear-warkat/route.ts` - Clear check/warkat

#### Commission (4 routes)
- `/api/finance/commission/account/route.ts` - Commission account details
- `/api/finance/commission/accounts/route.ts` - Commission accounts listing
- `/api/finance/commission/pay/route.ts` - Commission payment processing
- `/api/finance/commission/payable-invoices/route.ts` - Payable invoices for commission

#### Company (4 routes)
- `/api/finance/company/route.ts` - Company listing and operations
- `/api/finance/company/accounts/route.ts` - Company-specific accounts
- `/api/finance/company/fiscal-years/route.ts` - Company fiscal years
- `/api/finance/company/settings/route.ts` - Company settings

#### Reports (20+ routes)
- `/api/finance/reports/route.ts` - Reports listing
- `/api/finance/reports/balance-sheet/route.ts` - Balance Sheet report
- `/api/finance/reports/profit-loss/route.ts` - Profit & Loss report
- `/api/finance/reports/sales/route.ts` - Sales report
- `/api/finance/reports/purchases/route.ts` - Purchases report
- `/api/finance/reports/returns/route.ts` - Returns report
- `/api/finance/reports/vat-report/route.ts` - VAT report
- `/api/finance/reports/vat-report/export/route.ts` - VAT report export
- `/api/finance/reports/stock-adjustment/route.ts` - Stock adjustment report
- `/api/finance/reports/hpp-ledger/route.ts` - HPP (Cost of Goods Sold) ledger
- `/api/finance/reports/hpp-reconciliation/route.ts` - HPP reconciliation
- `/api/finance/reports/margin-analysis/route.ts` - Margin analysis report
- `/api/finance/reports/payment-details/route.ts` - Payment details report
- `/api/finance/reports/payment-summary/route.ts` - Payment summary report
- `/api/finance/reports/sales-invoice-details/route.ts` - Sales invoice details
- `/api/finance/reports/purchase-invoice-details/route.ts` - Purchase invoice details
- `/api/finance/reports/accounts-receivable/route.ts` - Accounts receivable report
- `/api/finance/reports/accounts-payable/route.ts` - Accounts payable report
- `/api/finance/reports/cash-flow/route.ts` - Cash flow report
- `/api/finance/reports/acquisition-costs/route.ts` - Acquisition costs report

**Migration Complexity**: High (40-60 hours estimated)
**Business Impact**: Critical - Core accounting operations
**Recommended Approach**: Create a separate specification for Finance module migration with comprehensive testing strategy

---

### Category 2: Out of Scope - Inventory Module (20+ routes)

**Justification**: The Inventory module manages stock operations, item master data, and warehouse management. Migrating this module requires:
- Understanding of stock entry workflows
- Testing of stock reconciliation logic
- Validation of warehouse operations
- Testing of inventory reports

**Decision**: Excluded from initial specification to focus on transactional modules (Sales/Purchase) first.

**Routes**:

#### Items (6 routes)
- `/api/inventory/items/route.ts` - Item master listing and creation
- `/api/inventory/items/[item_code]/route.ts` - Item detail operations
- `/api/inventory/items/brands/route.ts` - Item brands
- `/api/inventory/items/price/route.ts` - Item pricing
- `/api/inventory/items/simple/route.ts` - Simplified item listing
- `/api/inventory/items/valuation-rate/route.ts` - Item valuation rates

#### Stock Entry (4 routes)
- `/api/inventory/stock-entry/route.ts` - Stock Entry listing and creation
- `/api/inventory/stock-entry/[name]/route.ts` - Stock Entry detail operations
- `/api/inventory/stock-entry/[name]/submit/route.ts` - Stock Entry submission
- `/api/inventory/stock-entry/ledger/route.ts` - Stock ledger

#### Warehouses (1 route)
- `/api/inventory/warehouses/route.ts` - Warehouse listing

#### Reconciliation (1 route)
- `/api/inventory/reconciliation/route.ts` - Stock reconciliation

#### Dropdowns (2 routes)
- `/api/inventory/dropdowns/item-groups/route.ts` - Item groups for dropdowns
- `/api/inventory/dropdowns/uoms/route.ts` - Units of Measure for dropdowns

#### Reports (2 routes)
- `/api/inventory/reports/stock-balance/route.ts` - Stock balance report
- `/api/inventory/reports/stock-card/route.ts` - Stock card report

#### Check (1 route)
- `/api/inventory/check/route.ts` - Inventory check operations

**Migration Complexity**: Medium-High (20-30 hours estimated)
**Business Impact**: High - Stock management operations
**Recommended Approach**: Create a separate specification for Inventory module migration after Finance module

---

### Category 3: Out of Scope - Accounting Period Module (13 routes)

**Justification**: The Accounting Period module manages period closing operations, which are critical financial operations. Migrating this module requires:
- Understanding of period closing workflows
- Testing of balance calculations
- Validation of permanent closing restrictions
- Testing of audit log functionality

**Decision**: Excluded from initial specification due to complexity and dependency on Finance module migration.

**Routes**:

- `/api/accounting-period/generate-monthly/route.ts` - Generate monthly periods
- `/api/accounting-period/periods/route.ts` - Period listing and creation
- `/api/accounting-period/periods/[name]/route.ts` - Period detail operations
- `/api/accounting-period/close/route.ts` - Close accounting period
- `/api/accounting-period/reopen/route.ts` - Reopen accounting period
- `/api/accounting-period/permanent-close/route.ts` - Permanently close period
- `/api/accounting-period/validate/route.ts` - Validate period operations
- `/api/accounting-period/check-restriction/route.ts` - Check period restrictions
- `/api/accounting-period/config/route.ts` - Period configuration
- `/api/accounting-period/balances/[name]/route.ts` - Period balances
- `/api/accounting-period/preview-closing/[name]/route.ts` - Preview closing entries
- `/api/accounting-period/audit-log/route.ts` - Period audit log
- `/api/accounting-period/reports/closing-summary/route.ts` - Closing summary report

**Migration Complexity**: Medium (10-15 hours estimated)
**Business Impact**: Critical - Period closing operations
**Recommended Approach**: Migrate after Finance module, as it depends on GL Entry and Journal operations

---

### Category 4: Out of Scope - Sales Module Extended (20+ routes)

**Justification**: The core Sales module (Orders, Delivery Notes, Invoices) was successfully migrated. Extended sales functionality includes returns, credit notes, customer management, and additional operations. These were excluded to:
- Keep the initial specification focused on core CRUD operations
- Establish the pattern with simpler workflows first
- Allow for testing of core functionality before extending

**Decision**: Core sales operations migrated; extended features excluded for future specification.

**Routes**:

#### Sales Persons (2 routes)
- `/api/sales/sales-persons/route.ts` - Sales persons listing
- `/api/sales/sales-persons/detail/route.ts` - Sales person details

#### Sales Returns (4 routes)
- `/api/sales/sales-return/route.ts` - Sales Return listing and creation
- `/api/sales/sales-return/[name]/route.ts` - Sales Return detail operations
- `/api/sales/sales-return/[name]/submit/route.ts` - Sales Return submission
- `/api/sales/sales-return/[name]/cancel/route.ts` - Sales Return cancellation

#### Delivery Note Returns (4 routes)
- `/api/sales/delivery-note-return/route.ts` - Delivery Note Return listing and creation
- `/api/sales/delivery-note-return/[name]/route.ts` - Delivery Note Return detail operations
- `/api/sales/delivery-note-return/[name]/submit/route.ts` - Delivery Note Return submission
- `/api/sales/delivery-note-return/[name]/cancel/route.ts` - Delivery Note Return cancellation

#### Credit Notes (5 routes)
- `/api/sales/credit-note/route.ts` - Credit Note listing and creation
- `/api/sales/credit-note/[name]/route.ts` - Credit Note detail operations
- `/api/sales/credit-note/[name]/submit/route.ts` - Credit Note submission
- `/api/sales/credit-note/[name]/cancel/route.ts` - Credit Note cancellation
- `/api/sales/credit-note/invoices/route.ts` - Invoices for credit note

#### Customers (3 routes)
- `/api/sales/customers/route.ts` - Customer listing and creation
- `/api/sales/customers/[name]/route.ts` - Customer detail operations
- `/api/sales/customer-groups/route.ts` - Customer groups

#### Additional Operations (7 routes)
- `/api/sales/territories/route.ts` - Sales territories
- `/api/sales/price-lists/route.ts` - Price lists
- `/api/sales/delivery-notes/with-so-ref/route.ts` - Delivery notes with SO reference
- `/api/sales/delivery-notes/detail/route.ts` - Delivery note details
- `/api/sales/invoices/details/route.ts` - Invoice details
- `/api/sales/invoices/outstanding/route.ts` - Outstanding invoices
- `/api/sales/invoices/items/route.ts` - Invoice items
- `/api/sales/orders/available-for-dn/route.ts` - Orders available for delivery note

**Migration Complexity**: Medium (15-20 hours estimated)
**Business Impact**: Medium - Extended sales operations
**Recommended Approach**: Create a follow-up specification for extended sales features after core modules are stable

---

### Category 5: Out of Scope - Purchase Module Extended (13 routes)

**Justification**: Similar to Sales, the core Purchase module (Orders, Receipts, Invoices) was successfully migrated. Extended purchase functionality includes supplier management, addresses, and additional operations. These were excluded to:
- Maintain focus on core CRUD operations
- Establish consistent patterns before extending
- Allow for validation of core functionality

**Decision**: Core purchase operations migrated; extended features excluded for future specification.

**Routes**:

#### Suppliers (3 routes)
- `/api/purchase/suppliers/route.ts` - Supplier listing and creation
- `/api/purchase/suppliers/[name]/route.ts` - Supplier detail operations
- `/api/purchase/supplier-groups/route.ts` - Supplier groups

#### Addresses (2 routes)
- `/api/purchase/addresses/route.ts` - Address listing and creation
- `/api/purchase/addresses/[name]/route.ts` - Address detail operations

#### Receipt Operations (3 routes)
- `/api/purchase/receipts/list-for-pr/route.ts` - Receipts for purchase requisition
- `/api/purchase/receipts/list-for-pi/route.ts` - Receipts for purchase invoice
- `/api/purchase/receipts/detail-for-pi/[pr]/route.ts` - Receipt details for invoice
- `/api/purchase/receipts/fetch-po-detail/route.ts` - Fetch PO details

#### Order Operations (3 routes)
- `/api/purchase/orders/[name]/receive/route.ts` - Receive against order
- `/api/purchase/orders/[name]/items/route.ts` - Order items
- `/api/purchase/orders/[name]/complete/route.ts` - Complete order

#### Invoice Operations (4 routes)
- `/api/purchase/invoices/details/route.ts` - Invoice details
- `/api/purchase/invoices/outstanding/route.ts` - Outstanding invoices
- `/api/purchase/invoices/detail/route.ts` - Invoice detail
- `/api/purchase/invoices/[piName]/submit/route.ts` - Invoice submission (alternate route)

**Migration Complexity**: Medium (10-15 hours estimated)
**Business Impact**: Medium - Extended purchase operations
**Recommended Approach**: Create a follow-up specification for extended purchase features alongside sales extended features

---

### Category 6: Out of Scope - Setup Module Extended (9 routes)

**Justification**: The core Setup module routes (dashboard, payment terms, employees, tax templates, users, commission) were successfully migrated. Extended setup functionality includes authentication routes, company management, fiscal years, and projects. These were excluded because:
- Authentication routes require special handling and testing
- Company/fiscal year routes are closely tied to Finance module
- Projects functionality is a separate domain

**Decision**: Core setup operations migrated; authentication and extended features excluded.

**Routes**:

#### Authentication (5 routes)
- `/api/setup/auth/login/route.ts` - User login
- `/api/setup/auth/logout/route.ts` - User logout
- `/api/setup/auth/me/route.ts` - Current user info
- `/api/setup/auth/set-company/route.ts` - Set active company
- `/api/setup/auth/generate-key/route.ts` - Generate API key

#### Company & Fiscal (2 routes)
- `/api/setup/companies/route.ts` - Company listing
- `/api/setup/fiscal-years/route.ts` - Fiscal year listing

#### Projects (1 route)
- `/api/setup/projects/route.ts` - Project listing

#### Payment Terms Detail (1 route)
- `/api/setup/payment-terms/detail/route.ts` - Payment term details

**Migration Complexity**: Low-Medium (5-8 hours estimated)
**Business Impact**: Medium - Authentication and setup operations
**Recommended Approach**: 
- Authentication routes: Create separate specification with security testing
- Company/Fiscal: Migrate with Finance module
- Projects: Migrate as separate feature if needed

---

### Category 7: Out of Scope - Profit Report Module (1 route)

**Justification**: Single-route module for profit reporting. Excluded to maintain focus on core modules.

**Routes**:
- `/api/profit-report/route.ts` - Profit report generation

**Migration Complexity**: Low (1-2 hours estimated)
**Business Impact**: Low - Reporting functionality
**Recommended Approach**: Migrate with Finance reports module

---

## Routes That Cannot Be Migrated

**Count**: 0 routes

**Conclusion**: There are **no technical limitations** preventing any of the unmigrated routes from being migrated to the multi-site pattern. All routes use standard ERPNext API calls that are fully supported by the `ERPNextMultiClient` class.

### Technical Feasibility

All unmigrated routes follow these patterns, which are fully supported:

1. **GET requests for listing** → `client.getList(docType, options)`
2. **GET requests for single document** → `client.getDoc(docType, name)`
3. **POST requests for creation** → `client.createDoc(docType, data)`
4. **PUT requests for updates** → `client.updateDoc(docType, name, data)`
5. **DELETE requests** → `client.deleteDoc(docType, name)`
6. **POST requests for submission** → `client.submitDoc(docType, name)`
7. **Custom method calls** → `client.callMethod(docType, name, method, args)`

The `ERPNextMultiClient` class supports all these operations with site-aware authentication and URL management.

---

## Workarounds and Alternative Approaches

Since all routes CAN be migrated, this section provides guidance for future migration efforts.

### Workaround 1: Phased Migration Approach

**Scenario**: Need to migrate large modules (Finance, Inventory) without disrupting operations

**Approach**:
1. Create a separate specification for each major module
2. Migrate routes in logical groups (e.g., all Journal routes together)
3. Test each group thoroughly before moving to the next
4. Use feature flags to enable/disable migrated routes during testing

**Benefits**:
- Reduces risk of breaking critical functionality
- Allows for incremental testing and validation
- Easier to rollback if issues are discovered

### Workaround 2: Parallel Implementation

**Scenario**: Need to maintain legacy routes while testing new multi-site routes

**Approach**:
1. Create new route files with `-multi` suffix (e.g., `route-multi.ts`)
2. Implement multi-site pattern in new files
3. Use environment variable or feature flag to switch between implementations
4. Test thoroughly in staging environment
5. Replace legacy routes once validated

**Benefits**:
- Zero downtime during migration
- Easy A/B testing between implementations
- Safe rollback path

### Workaround 3: Module-by-Module Migration

**Scenario**: Need to migrate all routes but want to minimize scope of each specification

**Approach**:
1. **Phase 1** (Complete): Utilities, Setup Core, Sales Core, Purchase Core, HR
2. **Phase 2** (Recommended Next): Finance Module
   - Sub-phase 2a: Accounts, GL Entry
   - Sub-phase 2b: Journal, Payments
   - Sub-phase 2c: Commission, Company
   - Sub-phase 2d: Reports
3. **Phase 3**: Inventory Module
   - Sub-phase 3a: Items, Warehouses
   - Sub-phase 3b: Stock Entry, Reconciliation
   - Sub-phase 3c: Reports
4. **Phase 4**: Accounting Period Module
5. **Phase 5**: Extended Features (Sales Extended, Purchase Extended)
6. **Phase 6**: Remaining (Setup Extended, Profit Report)

**Benefits**:
- Clear migration roadmap
- Manageable specification sizes
- Logical grouping of related functionality

### Workaround 4: Automated Migration Script

**Scenario**: Need to migrate many similar routes quickly

**Approach**:
1. Create a migration script that:
   - Identifies legacy patterns in route files
   - Generates migrated code using templates
   - Preserves business logic and comments
   - Creates backup of original files
2. Review and test generated code
3. Run property-based tests to validate behavior

**Benefits**:
- Faster migration of similar routes
- Consistent code patterns
- Reduced manual errors

**Example Script Structure**:
```typescript
// scripts/migrate-route-to-multi-site.ts
async function migrateRoute(filePath: string) {
  // 1. Parse existing route file
  // 2. Identify patterns (ERPNEXT_API_URL, fetch calls)
  // 3. Generate new code with getERPNextClientForRequest
  // 4. Preserve business logic
  // 5. Write migrated file
  // 6. Generate test file
}
```

---

## Future Migration Recommendations

### Priority 1: Finance Module (High Priority)

**Rationale**: Core accounting operations, critical business functionality

**Recommended Approach**:
1. Create specification: "Finance Module Multi-Site Support"
2. Break into sub-specifications by sub-module:
   - Finance Accounts & GL Entry
   - Finance Journal & Payments
   - Finance Commission & Company
   - Finance Reports
3. Estimated effort: 40-60 hours
4. Include comprehensive property-based tests for financial calculations
5. Validate GL entry generation across multiple sites

**Success Criteria**:
- All Finance routes use `getERPNextClientForRequest()`
- Financial reports work correctly for each site
- GL entries are generated with correct site context
- Period closing works across multiple sites

### Priority 2: Inventory Module (High Priority)

**Rationale**: Stock management operations, high business impact

**Recommended Approach**:
1. Create specification: "Inventory Module Multi-Site Support"
2. Break into sub-specifications:
   - Inventory Items & Warehouses
   - Inventory Stock Entry & Reconciliation
   - Inventory Reports
3. Estimated effort: 20-30 hours
4. Include property-based tests for stock calculations
5. Validate warehouse operations across sites

**Success Criteria**:
- All Inventory routes use `getERPNextClientForRequest()`
- Stock balances are site-specific
- Stock entries work correctly for each site
- Inventory reports show correct site data

### Priority 3: Accounting Period Module (High Priority)

**Rationale**: Period closing operations, depends on Finance module

**Recommended Approach**:
1. Create specification: "Accounting Period Multi-Site Support"
2. Migrate after Finance module is complete
3. Estimated effort: 10-15 hours
4. Include tests for period closing across sites
5. Validate permanent closing restrictions

**Success Criteria**:
- All Accounting Period routes use `getERPNextClientForRequest()`
- Period closing works independently for each site
- Audit logs include site context
- Restrictions are enforced per site

### Priority 4: Extended Features (Medium Priority)

**Rationale**: Extended sales and purchase functionality

**Recommended Approach**:
1. Create specification: "Sales & Purchase Extended Multi-Site Support"
2. Migrate together as they follow similar patterns
3. Estimated effort: 25-35 hours
4. Include tests for returns, credit notes, and customer/supplier management

**Success Criteria**:
- All extended routes use `getERPNextClientForRequest()`
- Returns and credit notes work across sites
- Customer and supplier data is site-specific

### Priority 5: Setup Extended & Remaining (Low Priority)

**Rationale**: Authentication and miscellaneous features

**Recommended Approach**:
1. Authentication routes: Separate specification with security focus
2. Other routes: Migrate as needed based on usage
3. Estimated effort: 10-15 hours

---

## Migration Pattern Reference

For future migrations, follow this established pattern:

### Before Migration (Legacy Pattern)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order`, {
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

### After Migration (Modern Pattern)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError,
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const data = await client.getList('Sales Order', {
      fields: ['*'],
      limit_page_length: 20,
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logSiteError(error, 'GET /api/sales/orders', siteId);
    return buildSiteAwareErrorResponse(error, siteId);
  }
}
```

### Key Changes

1. **Import helpers** from `@/lib/api-helpers`
2. **Get site ID** at the start of the handler
3. **Get client** using `getERPNextClientForRequest(request)`
4. **Replace fetch calls** with client methods
5. **Use site-aware error handling** with `buildSiteAwareErrorResponse` and `logSiteError`

---

## Testing Strategy for Future Migrations

Each migrated module should include:

### 1. Property-Based Tests

Test universal properties that should hold for all inputs:

```typescript
// Example: Site-specific data isolation
fc.assert(
  fc.asyncProperty(
    fc.record({
      siteId: fc.constantFrom('demo', 'bac', 'cirebon'),
      docType: fc.constant('Sales Order'),
    }),
    async ({ siteId, docType }) => {
      const response = await fetch('/api/sales/orders', {
        headers: { 'X-Site-ID': siteId },
      });
      const data = await response.json();
      
      // Property: All returned documents should belong to the requested site
      return data.data.every((doc: any) => doc.site === siteId);
    }
  )
);
```

### 2. Integration Tests

Test actual API calls to ERPNext backend:

```typescript
describe('Sales Orders Multi-Site', () => {
  it('should fetch orders from correct site', async () => {
    const response = await fetch('/api/sales/orders', {
      headers: { 'X-Site-ID': 'demo' },
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### 3. Business Logic Preservation Tests

Verify that business logic remains unchanged:

```typescript
describe('Business Logic Preservation', () => {
  it('should calculate totals correctly after migration', async () => {
    // Test that calculations match pre-migration behavior
  });
  
  it('should apply filters correctly after migration', async () => {
    // Test that filtering logic is preserved
  });
});
```

---

## Conclusion

This document provides comprehensive documentation of all unmigrated API routes in the erp-next-system. Key takeaways:

1. **All routes CAN be migrated** - No technical limitations exist
2. **116 routes remain unmigrated** - Intentionally excluded from this specification's scope
3. **Clear migration path exists** - Follow the established pattern and phased approach
4. **Testing is critical** - Use property-based tests to validate behavior
5. **Prioritize by business impact** - Finance and Inventory modules should be next

### Next Steps

1. **Immediate**: Review this documentation with stakeholders
2. **Short-term**: Create specification for Finance Module Multi-Site Support
3. **Medium-term**: Create specifications for Inventory and Accounting Period modules
4. **Long-term**: Complete migration of all remaining modules

### Estimated Total Effort

- Finance Module: 40-60 hours
- Inventory Module: 20-30 hours
- Accounting Period Module: 10-15 hours
- Extended Features: 25-35 hours
- Remaining: 10-15 hours

**Total**: 105-155 hours for complete migration of all unmigrated routes

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Author**: Kiro AI
**Status**: Complete
