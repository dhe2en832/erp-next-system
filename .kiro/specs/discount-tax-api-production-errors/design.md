# Discount and Tax API Production Errors Bugfix Design

## Overview

After deploying the discount and tax feature (Task 17), three critical production errors have emerged that prevent core functionality. This design addresses all three errors with targeted fixes that preserve existing behavior while resolving the issues:

1. **ERPNext API Permission Error**: GET requests to `/api/sales/invoices` and `/api/purchase/invoices` fail with "Field not permitted in query" errors for `discount_percentage` and `discount_amount` fields
2. **Tax Template API Validation Error**: GET requests to `/api/setup/tax-templates` return 400 errors when called from frontend without proper company parameter handling
3. **Purchase Invoice Form Build Error**: The Purchase Invoice form fails to build due to incorrect import paths for `DiscountInput`, `TaxTemplateSelect`, and `InvoiceSummary` components

The fix strategy is minimal and surgical: remove problematic fields from GET requests, ensure proper parameter validation, and correct import paths without changing any business logic.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each of the three bugs
- **Property (P)**: The desired behavior when the bug condition is met
- **Preservation**: Existing functionality that must remain unchanged by the fix
- **ERPNext API**: The backend ERP system that enforces field-level permissions on GET requests
- **fields parameter**: The query parameter in ERPNext API that specifies which fields to return
- **discount_amount**: A field in Sales/Purchase Invoice that stores fixed discount value
- **discount_percentage**: A field in Sales/Purchase Invoice that stores percentage discount
- **Tax Template API**: The `/api/setup/tax-templates` endpoint that returns tax templates
- **company parameter**: Required query parameter for filtering tax templates by company
- **Import Path**: The relative file path used in TypeScript/React imports
- **components/invoice/**: Root-level directory containing shared invoice components

## Bug Details

### Bug 1: ERPNext API Field Permission Error

#### Fault Condition

The bug manifests when the invoice list API attempts to fetch discount fields that ERPNext considers write-only or restricted in GET operations. The API includes `discount_amount` and `discount_percentage` in the `fields` parameter, but ERPNext's permission system rejects these fields in query operations.

**Formal Specification:**
```
FUNCTION isBugCondition1(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN (request.url CONTAINS '/api/sales/invoices' OR request.url CONTAINS '/api/purchase/invoices')
         AND request.method == 'GET'
         AND request.params.fields CONTAINS 'discount_percentage'
         AND ERPNextRejectsField('discount_percentage', 'GET')
END FUNCTION
```

#### Examples

- **Sales Invoice List**: GET `/api/sales/invoices?fields=["name","customer","grand_total","discount_percentage"]` → ERPNext returns "Field not permitted in query: discount_percentage" error
- **Purchase Invoice List**: GET `/api/purchase/invoices?fields=["name","supplier","grand_total","discount_amount"]` → ERPNext returns "Field not permitted in query: discount_amount" error
- **Invoice Detail**: GET `/api/sales/invoices?id=SI-001` with all fields → Works correctly because single document fetch uses different API endpoint
- **Edge Case**: GET request without discount fields → Works correctly, no error

### Bug 2: Tax Template API Parameter Validation Error

#### Fault Condition

The bug manifests when the frontend calls the tax template API without proper company parameter validation. The API requires both `type` and `company` parameters, but the frontend may call it without the company parameter, resulting in a 400 error.

**Formal Specification:**
```
FUNCTION isBugCondition2(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN request.url CONTAINS '/api/setup/tax-templates'
         AND request.method == 'GET'
         AND (request.params.company IS NULL OR request.params.company == '')
         AND APIReturns400Error()
END FUNCTION
```

#### Examples

- **Missing Company**: GET `/api/setup/tax-templates?type=Sales` → Returns 400 "Missing required company parameter"
- **Empty Company**: GET `/api/setup/tax-templates?type=Sales&company=` → Returns 400 "Missing required company parameter"
- **Valid Request**: GET `/api/setup/tax-templates?type=Sales&company=PT%20ABC` → Works correctly, returns tax templates
- **Edge Case**: GET `/api/setup/tax-templates` without type → Returns 400 "Query parameter 'type' is required"

### Bug 3: Purchase Invoice Form Import Path Error

#### Fault Condition

The bug manifests when the Purchase Invoice form (`app/purchase-invoice/piMain/component.tsx`) attempts to import invoice components using an incorrect relative path. The components are located in the root `components/invoice/` directory, but the import uses `../../components/invoice/` which resolves to `app/components/invoice/` (which doesn't exist).

**Formal Specification:**
```
FUNCTION isBugCondition3(buildProcess)
  INPUT: buildProcess of type BuildProcess
  OUTPUT: boolean
  
  RETURN buildProcess.currentFile == 'app/purchase-invoice/piMain/component.tsx'
         AND buildProcess.imports CONTAINS '../../components/invoice/DiscountInput'
         AND NOT fileExists('app/components/invoice/DiscountInput.tsx')
         AND fileExists('components/invoice/DiscountInput.tsx')
         AND buildProcess.fails WITH 'Module not found'
END FUNCTION
```

#### Examples

- **Current Import**: `import DiscountInput from '../../components/invoice/DiscountInput'` → Resolves to `app/components/invoice/DiscountInput.tsx` (doesn't exist) → Build fails
- **Correct Import**: `import DiscountInput from '@/components/invoice/DiscountInput'` → Resolves to `components/invoice/DiscountInput.tsx` (exists) → Build succeeds
- **Sales Invoice Form**: Uses `../../../components/invoice/DiscountInput` → Works correctly because it's in a different directory structure
- **Edge Case**: Other imports in the same file using `../../components/LoadingSpinner` → Work correctly because those components exist in `app/components/`

## Expected Behavior

### Bug 1: ERPNext API Field Permission Error

**Correct Behavior:**
When GET requests are made to `/api/sales/invoices` or `/api/purchase/invoices`, the system SHALL successfully return invoice data by:
1. Removing `discount_amount` and `discount_percentage` from the `fields` parameter in the ERPNext API call
2. Fetching invoices without these restricted fields
3. Adding default values (0) for discount fields in the response transformation layer
4. Returning complete invoice data to the frontend with discount fields populated

### Bug 2: Tax Template API Parameter Validation Error

**Correct Behavior:**
When GET requests are made to `/api/setup/tax-templates`, the system SHALL:
1. Validate that the `company` parameter is present and non-empty
2. Return a 400 error with clear message if company is missing
3. Proceed with ERPNext API call only when company parameter is valid
4. Return filtered tax templates for the specified company

### Bug 3: Purchase Invoice Form Import Path Error

**Correct Behavior:**
When the Purchase Invoice form builds, the system SHALL:
1. Resolve imports using the correct path to `components/invoice/` directory
2. Successfully import `DiscountInput`, `TaxTemplateSelect`, and `InvoiceSummary` components
3. Complete the build process without "Module not found" errors
4. Render the form with all invoice components available

### Preservation Requirements

**Unchanged Behaviors:**

**For Bug 1:**
- POST requests to create invoices with discount fields must continue to work exactly as before
- Invoice detail fetches (single document) must continue to return all fields including discounts
- Backward compatibility for old invoices without discount fields must be maintained
- All other invoice fields (totals, status, dates, items) must continue to display correctly

**For Bug 2:**
- Tax template API with valid type and company parameters must continue to work exactly as before
- Filtering by company and active status must remain unchanged
- Tax template data structure in responses must remain unchanged
- Other API endpoints must be unaffected

**For Bug 3:**
- Sales Invoice form imports must remain unchanged (they use correct paths)
- Other imports in Purchase Invoice form (LoadingSpinner, PrintDialog) must remain unchanged
- Component functionality must remain unchanged
- All other forms and components must be unaffected

**Scope:**
All inputs that do NOT involve the three specific bug conditions should be completely unaffected by this fix. This includes:
- Invoice creation and update operations
- Tax template API calls with valid parameters
- All other forms and components in the application
- Single invoice detail fetches
- All other API endpoints

## Hypothesized Root Cause

Based on the bug descriptions and code analysis, the root causes are:

### Bug 1: ERPNext Field-Level Permissions

**Root Cause**: ERPNext enforces field-level permissions that restrict certain fields from being queried in GET operations. The `discount_amount` and `discount_percentage` fields were added to the `fields` parameter in the GET request, but ERPNext's permission system considers these fields as write-only or restricted for query operations.

**Evidence**:
- Error message: "Field not permitted in query: discount_percentage"
- The fields work correctly in POST operations (creating invoices)
- Single document fetches work because they use a different API endpoint (`/api/resource/Sales Invoice/{id}`) that doesn't have the same restrictions
- The fields were recently added in Task 17, and the GET request was updated to include them

**Why This Happens**:
- ERPNext has a permission model that distinguishes between "read" and "query" permissions
- Some fields can be read in document detail views but cannot be used in list queries
- The discount fields may have been configured with restricted query permissions in ERPNext

### Bug 2: Missing Parameter Validation

**Root Cause**: The tax template API endpoint has validation for the `company` parameter, but the frontend may be calling it without this parameter, or the validation is not properly handling empty string values.

**Evidence**:
- Error message: "Missing required company parameter"
- The API code has validation: `if (!company) { return 400 }`
- The validation works correctly, but the frontend may not be passing the parameter in all cases

**Why This Happens**:
- The frontend component may be calling the API before the company is selected
- The frontend may be passing an empty string instead of omitting the parameter
- The API validation correctly rejects invalid requests, but the error is surfacing to users

### Bug 3: Incorrect Relative Import Path

**Root Cause**: The Purchase Invoice form uses a relative import path `../../components/invoice/` which resolves to `app/components/invoice/`, but the invoice components are actually located in the root `components/invoice/` directory.

**Evidence**:
- Import statement: `import DiscountInput from '../../components/invoice/DiscountInput'`
- File location: `app/purchase-invoice/piMain/component.tsx`
- Resolved path: `app/components/invoice/DiscountInput.tsx` (doesn't exist)
- Actual path: `components/invoice/DiscountInput.tsx` (exists)
- Sales Invoice form uses `../../../components/invoice/` which works because it's in a different directory structure

**Why This Happens**:
- The invoice components were created in the root `components/` directory
- The Purchase Invoice form is in `app/purchase-invoice/piMain/`
- The relative path calculation was incorrect (should go up 3 levels, not 2)
- The Sales Invoice form has a different directory depth and uses the correct relative path
- Using absolute imports with `@/components/invoice/` would avoid this issue

## Correctness Properties

Property 1: Fault Condition - Invoice List API Returns Data Without Permission Errors

_For any_ GET request to `/api/sales/invoices` or `/api/purchase/invoices` where the invoice list is being fetched, the fixed API SHALL successfully return invoice data by excluding restricted discount fields from the ERPNext query and adding default values in the response transformation layer, ensuring no "Field not permitted in query" errors occur.

**Validates: Requirements 2.1, 2.2**

Property 2: Fault Condition - Tax Template API Validates Company Parameter

_For any_ GET request to `/api/setup/tax-templates` where the company parameter is missing or empty, the fixed API SHALL return a 400 error with a clear message indicating that the company parameter is required, preventing invalid requests from reaching ERPNext.

**Validates: Requirements 2.3**

Property 3: Fault Condition - Purchase Invoice Form Imports Components Successfully

_For any_ build process of the Purchase Invoice form where invoice components are imported, the fixed import statements SHALL resolve to the correct `components/invoice/` directory using absolute imports, allowing the build to complete successfully without "Module not found" errors.

**Validates: Requirements 2.4**

Property 4: Preservation - Invoice Creation and Update Operations

_For any_ POST or PUT request to create or update invoices with discount and tax fields, the fixed code SHALL produce exactly the same behavior as the original code, preserving all validation, calculation, and submission logic for discount and tax fields.

**Validates: Requirements 3.2, 3.6**

Property 5: Preservation - Tax Template API with Valid Parameters

_For any_ GET request to `/api/setup/tax-templates` with valid type and company parameters, the fixed code SHALL produce exactly the same response as the original code, preserving the filtering and data structure of tax templates.

**Validates: Requirements 3.3**

Property 6: Preservation - Other Component Imports and Functionality

_For any_ component import or functionality that is NOT related to the three specific bugs, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing imports, component functionality, and application behavior.

**Validates: Requirements 3.4, 3.5**

## Fix Implementation

### Bug 1: Remove Discount Fields from GET Request

**File**: `app/api/sales/invoices/route.ts` and `app/api/purchase/invoices/route.ts`

**Function**: `GET` handler

**Specific Changes**:

1. **Remove Restricted Fields from ERPNext Query**:
   - In `app/api/sales/invoices/route.ts`, line ~47, remove `discount_amount` and `discount_percentage` from the `fields` array
   - In `app/api/purchase/invoices/route.ts`, line ~138, remove `discount_amount` and `discount_percentage` from the `fields` array
   - Keep all other fields unchanged

2. **Maintain Response Transformation**:
   - Keep the existing backward compatibility code that adds default values for discount fields
   - The transformation layer already handles missing discount fields by setting them to 0
   - No changes needed to the response transformation logic

3. **Preserve Single Document Fetch**:
   - Single document fetches use `fields=["*"]` which works correctly
   - No changes needed to detail fetch logic

**Before (Sales Invoice)**:
```typescript
let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","customer_name","posting_date","grand_total","status","docstatus","custom_total_komisi_sales","creation","total","net_total","discount_amount","discount_percentage","taxes_and_charges","total_taxes_and_charges","outstanding_amount"]&limit_page_length=${limit}&limit_start=${start}&order_by=${order_by}`;
```

**After (Sales Invoice)**:
```typescript
let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","customer_name","posting_date","grand_total","status","docstatus","custom_total_komisi_sales","creation","total","net_total","taxes_and_charges","total_taxes_and_charges","outstanding_amount"]&limit_page_length=${limit}&limit_start=${start}&order_by=${order_by}`;
```

**Before (Purchase Invoice)**:
```typescript
const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status","currency","total","net_total","discount_amount","discount_percentage","taxes_and_charges","total_taxes_and_charges"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;
```

**After (Purchase Invoice)**:
```typescript
const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status","currency","total","net_total","taxes_and_charges","total_taxes_and_charges"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;
```

### Bug 2: Ensure Company Parameter Validation

**File**: `app/api/setup/tax-templates/route.ts`

**Function**: `GET` handler

**Specific Changes**:

1. **Verify Existing Validation**:
   - The API already has proper validation for the `company` parameter
   - The validation correctly returns 400 error when company is missing
   - No changes needed to the API code

2. **Frontend Fix (if needed)**:
   - Ensure frontend components pass the company parameter before calling the API
   - Add loading states or disable tax template selection until company is available
   - This may require checking the frontend component that calls this API

**Current Code (Already Correct)**:
```typescript
if (!company) {
  return NextResponse.json({
    success: false,
    message: 'Query parameter "company" is required'
  }, { status: 400 });
}
```

**Note**: The API validation is already correct. The issue is likely in the frontend calling the API without the company parameter. We need to verify the frontend component and ensure it only calls the API when company is available.

### Bug 3: Fix Import Paths in Purchase Invoice Form

**File**: `app/purchase-invoice/piMain/component.tsx`

**Lines**: 7-9

**Specific Changes**:

1. **Replace Relative Imports with Absolute Imports**:
   - Change `../../components/invoice/DiscountInput` to `@/components/invoice/DiscountInput`
   - Change `../../components/invoice/TaxTemplateSelect` to `@/components/invoice/TaxTemplateSelect`
   - Change `../../components/invoice/InvoiceSummary` to `@/components/invoice/InvoiceSummary`
   - Keep other imports unchanged (LoadingSpinner, PrintDialog use correct paths)

**Before**:
```typescript
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import DiscountInput from '../../components/invoice/DiscountInput';
import TaxTemplateSelect from '../../components/invoice/TaxTemplateSelect';
import InvoiceSummary from '../../components/invoice/InvoiceSummary';
```

**After**:
```typescript
import LoadingSpinner from '../../components/LoadingSpinner';
import PrintDialog from '../../components/PrintDialog';
import DiscountInput from '@/components/invoice/DiscountInput';
import TaxTemplateSelect from '@/components/invoice/TaxTemplateSelect';
import InvoiceSummary from '@/components/invoice/InvoiceSummary';
```

**Rationale**:
- `@/` is a TypeScript path alias that resolves to the project root
- This avoids relative path calculation errors
- The Sales Invoice form uses a different directory structure, so it doesn't need changes
- This is the standard pattern for importing shared components in Next.js

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the three bug conditions and observe failures on the UNFIXED code to understand the root causes.

**Test Cases**:

1. **Bug 1 - Sales Invoice List with Discount Fields**: Call GET `/api/sales/invoices` with discount fields in the query (will fail on unfixed code with "Field not permitted in query" error)

2. **Bug 1 - Purchase Invoice List with Discount Fields**: Call GET `/api/purchase/invoices` with discount fields in the query (will fail on unfixed code with "Field not permitted in query" error)

3. **Bug 2 - Tax Template API without Company**: Call GET `/api/setup/tax-templates?type=Sales` without company parameter (will fail on unfixed code with 400 error)

4. **Bug 3 - Purchase Invoice Form Build**: Attempt to build the Purchase Invoice form (will fail on unfixed code with "Module not found" error)

**Expected Counterexamples**:
- Bug 1: ERPNext returns "Field not permitted in query: discount_percentage" error
- Bug 2: API returns 400 "Missing required company parameter" error
- Bug 3: Build process fails with "Module not found: Can't resolve '../../components/invoice/DiscountInput'"

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Bug 1 - Invoice List API**:
```
FOR ALL request WHERE isBugCondition1(request) DO
  response := GET_invoices_fixed(request)
  ASSERT response.status == 200
  ASSERT response.data IS NOT NULL
  ASSERT ALL invoice IN response.data HAVE discount_amount == 0 OR discount_amount >= 0
  ASSERT ALL invoice IN response.data HAVE discount_percentage == 0 OR discount_percentage >= 0
END FOR
```

**Bug 2 - Tax Template API**:
```
FOR ALL request WHERE isBugCondition2(request) DO
  response := GET_tax_templates_fixed(request)
  ASSERT response.status == 400
  ASSERT response.message CONTAINS 'company'
END FOR
```

**Bug 3 - Purchase Invoice Form Build**:
```
FOR ALL buildProcess WHERE isBugCondition3(buildProcess) DO
  result := build_purchase_invoice_form_fixed()
  ASSERT result.success == TRUE
  ASSERT result.errors.length == 0
  ASSERT NOT result.errors CONTAINS 'Module not found'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode**:
```
FOR ALL request WHERE NOT (isBugCondition1(request) OR isBugCondition2(request) OR isBugCondition3(request)) DO
  ASSERT originalFunction(request) = fixedFunction(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug scenarios, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Invoice Creation Preservation**: Verify POST requests to create invoices with discount fields continue to work correctly after fix

2. **Invoice Detail Fetch Preservation**: Verify GET requests for single invoice details continue to return all fields including discounts after fix

3. **Tax Template API with Valid Parameters Preservation**: Verify GET requests to tax template API with valid type and company parameters continue to work correctly after fix

4. **Sales Invoice Form Preservation**: Verify Sales Invoice form continues to build and function correctly after fix (it uses different import paths)

5. **Other Component Imports Preservation**: Verify other imports in Purchase Invoice form (LoadingSpinner, PrintDialog) continue to work correctly after fix

### Unit Tests

**Bug 1 - Invoice List API**:
- Test GET request to sales invoices without discount fields in query returns 200
- Test GET request to purchase invoices without discount fields in query returns 200
- Test response transformation adds default discount values (0) for old invoices
- Test single invoice detail fetch continues to return all fields

**Bug 2 - Tax Template API**:
- Test GET request without company parameter returns 400
- Test GET request with empty company parameter returns 400
- Test GET request with valid company parameter returns 200
- Test GET request without type parameter returns 400

**Bug 3 - Purchase Invoice Form**:
- Test build process completes successfully with fixed imports
- Test DiscountInput component is imported correctly
- Test TaxTemplateSelect component is imported correctly
- Test InvoiceSummary component is imported correctly
- Test other imports (LoadingSpinner, PrintDialog) continue to work

### Property-Based Tests

**Bug 1 - Invoice List API**:
- Generate random invoice data and verify list API returns data without errors
- Generate random filter combinations and verify API handles them correctly
- Test with various pagination parameters (limit, start)

**Bug 2 - Tax Template API**:
- Generate random company names and verify API filters correctly
- Generate random type values and verify validation works
- Test with various combinations of valid and invalid parameters

**Bug 3 - Purchase Invoice Form**:
- Test build process with various component import combinations
- Verify all invoice components are accessible after build
- Test form rendering with various props

### Integration Tests

**Bug 1 - Invoice List API**:
- Test full invoice list flow: fetch list → display in UI → verify discount fields show default values
- Test invoice creation flow: create invoice with discount → fetch list → verify invoice appears with correct discount values
- Test backward compatibility: fetch old invoices without discount fields → verify default values are applied

**Bug 2 - Tax Template API**:
- Test full tax template selection flow: select company → fetch templates → select template → verify template is applied
- Test form initialization: load form → verify tax template dropdown is disabled until company is selected
- Test company change: select company → fetch templates → change company → verify templates are refetched

**Bug 3 - Purchase Invoice Form**:
- Test full Purchase Invoice form flow: load form → select PR → enter discount → select tax template → verify summary calculates correctly
- Test form submission: fill form → submit → verify invoice is created with discount and tax
- Test form navigation: navigate to form → verify all components load correctly
