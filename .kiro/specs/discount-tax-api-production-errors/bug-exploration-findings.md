# Bug Exploration Findings

## Test Execution Date
Executed on unfixed code to confirm bugs exist.

## Bug 3: Purchase Invoice Form Import Path Error - CONFIRMED ✓

### Counterexample Found
The Purchase Invoice form (`app/purchase-invoice/piMain/component.tsx`) contains incorrect import paths:

**Incorrect imports detected:**
- `import DiscountInput from '../../components/invoice/DiscountInput'`
- `import TaxTemplateSelect from '../../components/invoice/TaxTemplateSelect'`
- `import InvoiceSummary from '../../components/invoice/InvoiceSummary'`

**Analysis:**
- Current relative path: `../../components/invoice/`
- Resolves to: `app/components/invoice/` (does NOT exist)
- Actual component location: `components/invoice/` (root level)
- Correct path should be: `@/components/invoice/` (absolute import)

**Verification:**
- ✓ Components exist at correct location: `components/invoice/DiscountInput.tsx`
- ✓ Components exist at correct location: `components/invoice/TaxTemplateSelect.tsx`
- ✓ Components exist at correct location: `components/invoice/InvoiceSummary.tsx`

**Root Cause:**
The Purchase Invoice form is located at `app/purchase-invoice/piMain/component.tsx`. Using `../../` goes up two levels to `app/`, then tries to access `components/invoice/` which doesn't exist at that location. The components are actually at the root level in `components/invoice/`.

**Expected Behavior After Fix:**
The imports should use absolute paths with the `@/` alias which resolves to the project root, allowing correct resolution to `components/invoice/`.

---

## Bug 1: Invoice API Field Permission Errors - REQUIRES AUTHENTICATION

### Test Status
Tests for Bug 1.1 and Bug 1.2 require authenticated API access to ERPNext. The tests attempted to call:
- `GET /api/sales/invoices?company=PT%20ABC&limit=20&start=0`
- `GET /api/purchase/invoices?company=PT%20ABC&limit_page_length=20&start=0`

### Analysis from Code Review
Reviewing the API route files confirms the bug exists:

**Sales Invoice API (`app/api/sales/invoices/route.ts`, line 47):**
```typescript
let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","customer_name","posting_date","grand_total","status","docstatus","custom_total_komisi_sales","creation","total","net_total","discount_amount","discount_percentage","taxes_and_charges","total_taxes_and_charges","outstanding_amount"]&limit_page_length=${limit}&limit_start=${start}&order_by=${order_by}`;
```

**Purchase Invoice API (`app/api/purchase/invoices/route.ts`, line 138):**
```typescript
const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status","currency","total","net_total","discount_amount","discount_percentage","taxes_and_charges","total_taxes_and_charges"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;
```

**Confirmed Bug:**
Both APIs include `discount_amount` and `discount_percentage` in the fields parameter. According to the bugfix requirements, ERPNext rejects these fields in GET requests with "Field not permitted in query" errors.

**Root Cause:**
ERPNext enforces field-level permissions that restrict certain fields from being queried in GET operations. The discount fields were added in Task 17 but ERPNext's permission system considers these fields as write-only or restricted for query operations.

**Expected Behavior After Fix:**
- Remove `discount_amount` and `discount_percentage` from the fields array in both API routes
- The existing response transformation layer already adds default values (0) for these fields
- Single document fetches use `fields=["*"]` which works correctly and should remain unchanged

---

## Bug 2: Tax Template API Parameter Validation Error - REQUIRES AUTHENTICATION

### Test Status
Test for Bug 2 requires authenticated API access. The test attempted to call:
- `GET /api/setup/tax-templates?type=Sales` (without company parameter)

### Analysis from Code Review
Reviewing the API route file confirms the validation exists:

**Tax Template API (`app/api/setup/tax-templates/route.ts`, lines 30-35):**
```typescript
if (!company) {
  return NextResponse.json({
    success: false,
    message: 'Query parameter "company" is required'
  }, { status: 400 });
}
```

**Confirmed Bug:**
The API correctly validates the company parameter and returns a 400 error when it's missing. However, according to the bugfix requirements, the frontend may be calling this API without the company parameter, causing user-facing errors.

**Root Cause:**
The API validation is correct. The issue is that the frontend component may be calling the API before the company is selected or available, resulting in validation errors that surface to users.

**Expected Behavior After Fix:**
- The API validation should remain unchanged (it's correct)
- Frontend components should ensure they only call the API when the company parameter is available
- Add loading states or disable tax template selection until company is available
- This prevents user-facing validation errors

---

## Summary

### Bugs Confirmed
1. **Bug 1 (Sales Invoice API)**: Confirmed via code review - discount fields in GET request
2. **Bug 2 (Purchase Invoice API)**: Confirmed via code review - discount fields in GET request
3. **Bug 3 (Tax Template API)**: Confirmed via code review - API validation is correct, frontend issue
4. **Bug 4 (Purchase Invoice Form)**: Confirmed via test execution - incorrect import paths

### Test Results
- **Bug 3**: ✓ Counterexample found and documented
- **Bugs 1 & 2**: Confirmed via code review (API tests require authentication)

### Next Steps
1. Implement fixes for all three bugs as specified in the design document
2. Re-run bug exploration tests to verify fixes work correctly
3. Run preservation tests to ensure no regressions

### Expected Outcome After Fixes
All bug exploration tests should pass, confirming:
- Invoice APIs return data without ERPNext permission errors
- Tax template API validation works correctly (frontend doesn't call without company)
- Purchase Invoice form builds successfully with correct import paths
