# Invoice List Status and Refresh Fix - Bugfix Design

## Overview

The Sales Invoice List component has two distinct but related issues: (1) status badges are missing from the desktop table view despite being present in mobile card view, and (2) the list may display stale data after state-changing operations like submitting invoices or making payments. This design addresses both issues by adding a status column to the desktop grid layout and implementing cache-busting mechanisms to ensure data freshness.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger the bugs - viewing desktop table without status display OR performing state-changing operations without seeing updated data
- **Property (P)**: The desired behavior - status badges visible in desktop view AND fresh data displayed after operations
- **Preservation**: Existing mobile card layout, status badge styling, pagination, filtering, and all other list functionality that must remain unchanged
- **SalesInvoiceList**: The component in `app/invoice/siList/component.tsx` that renders the invoice list with responsive layouts
- **isMobile**: Boolean state that determines whether to render mobile card layout or desktop table layout (breakpoint: 768px)
- **fetchInvoices**: The function that fetches invoice data from the ERPNext API with filtering and pagination
- **STATUS_LABELS**: Mapping of ERPNext status values (English) to Indonesian UI labels
- **STATUS_COLORS**: Mapping of status values to Tailwind CSS classes for badge styling

## Bug Details

### Fault Condition

The bugs manifest in two distinct scenarios:

**Bug 1 - Missing Status Display**: When a user views the invoice list on a desktop screen (viewport width >= 768px), the status badge is not rendered in the table rows, even though the status data is available in the invoice objects and the badge rendering functions (getStatusLabel, getStatusBadgeClass) are defined and working in mobile view.

**Bug 2 - Stale Data**: When a user performs a state-changing operation (submitting an invoice via "Ajukan" button, making a payment, or navigating back to the list), the displayed data may not reflect the latest state from ERPNext due to browser caching or timing issues.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { viewMode: 'mobile' | 'desktop', operation: string | null }
  OUTPUT: boolean
  
  RETURN (input.viewMode == 'desktop' AND statusColumnMissing())
         OR (input.operation IN ['submit', 'payment', 'navigation'] AND dataIsStale())
END FUNCTION
```

### Examples

**Bug 1 Examples:**
- User opens invoice list on laptop (1920x1080) → sees document number, customer, dates, amounts, payment progress, actions BUT no status badge
- User resizes browser from mobile to desktop width → status badge disappears from view
- User on tablet in landscape mode (1024px width) → status column missing from table

**Bug 2 Examples:**
- User clicks "Ajukan" button on a Draft invoice → invoice status changes to "Submitted" in ERPNext → list still shows "Draft" badge
- User makes a payment on an invoice → outstanding amount changes in ERPNext → list shows old outstanding amount
- User navigates from invoice detail back to list → sees cached data instead of fresh data from server

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mobile card layout (viewport < 768px) must continue to display status badges exactly as currently implemented
- Status badge styling using STATUS_LABELS and STATUS_COLORS mappings must remain unchanged
- All filtering functionality (date range, customer search, document number, status filter) must continue to work
- Pagination controls for desktop and infinite scroll for mobile must continue to work
- All action buttons (Print, Submit, Payment) must continue to function correctly
- Grid column layout for other columns (document/customer, dates, amounts, payment progress, actions) must maintain proper alignment
- Row click navigation to invoice detail must continue to work
- All other list features (sorting, empty states, loading states, error handling) must remain unchanged

**Scope:**
All inputs that do NOT involve desktop table rendering or state-changing operations should be completely unaffected by this fix. This includes:
- Mobile card view rendering and interactions
- Filter controls and their behavior
- Pagination and infinite scroll mechanics
- Print preview functionality
- Error handling and loading states

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

**Bug 1 - Missing Status Column:**
1. **Incomplete Desktop Layout**: The desktop table layout (lines 740-800) renders a grid with `grid-cols-12` but only allocates columns for document/customer (col-span-3), posting date (col-span-2), due date (col-span-2), total (col-span-2), payment (col-span-2), and actions (col-span-1), totaling 12 columns. There is no column allocated for status display.

2. **Mobile-Only Status Rendering**: The status badge rendering code (lines 660-665) only exists in the mobile card layout branch, not in the desktop row layout branch.

**Bug 2 - Stale Data:**
1. **No Cache-Busting**: The fetchInvoices function does not append cache-busting parameters (like timestamp) to API requests, allowing browsers to return cached responses.

2. **Timing Issues**: The handleSubmitSalesInvoice function calls fetchInvoices(true) immediately after the submit API call, but there may be a race condition where the fetch happens before ERPNext has fully updated the document state.

3. **No Forced Refresh on Navigation**: When users navigate back to the list from detail view, there's no mechanism to force a fresh data fetch, relying on cached component state.

## Correctness Properties

Property 1: Fault Condition - Status Badge Visible in Desktop View

_For any_ invoice list rendering where the viewport width is >= 768px (desktop mode) and invoices are displayed, the fixed component SHALL render a status badge column in the table grid showing the translated status label with appropriate color styling for each invoice row.

**Validates: Requirements 2.1**

Property 2: Fault Condition - Fresh Data After Operations

_For any_ state-changing operation (invoice submission, payment, or navigation back to list), the fixed component SHALL fetch fresh data from the ERPNext API with cache-busting mechanisms to ensure the displayed invoice list reflects the latest state from the server.

**Validates: Requirements 2.2, 2.3**

Property 3: Preservation - Mobile Card Layout Unchanged

_For any_ invoice list rendering where the viewport width is < 768px (mobile mode), the fixed component SHALL produce exactly the same card layout with status badges in the same position and styling as the original component, preserving all mobile view functionality.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation - Other Features Unchanged

_For any_ user interaction with filtering, pagination, sorting, action buttons, or row navigation, the fixed component SHALL produce exactly the same behavior as the original component, preserving all existing functionality except for the two specific bugs being fixed.

**Validates: Requirements 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/invoice/siList/component.tsx`

**Function**: `SalesInvoiceList` component

**Specific Changes**:

1. **Add Status Column to Desktop Grid Layout**:
   - Modify the grid from `grid-cols-12` to `grid-cols-13` to accommodate the new status column
   - Adjust column spans: Keep document/customer (col-span-3), dates (col-span-2 each), but reduce payment from col-span-2 to col-span-1, and add status (col-span-2) before actions
   - Alternative: Keep `grid-cols-12` and adjust existing spans to make room for status column
   - Recommended layout: Document (col-span-2), Status (col-span-1), Dates (col-span-2 each), Total (col-span-2), Payment (col-span-2), Actions (col-span-1)

2. **Add Status Badge Rendering in Desktop Layout**:
   - Insert status badge rendering code in the desktop row layout section (around line 740-800)
   - Use the same getStatusLabel and getStatusBadgeClass functions already defined
   - Position the status column between document/customer and posting date for logical flow
   - Ensure badge styling matches mobile view (same classes, same translations)

3. **Update Table Header**:
   - Add "Status" header label in the desktop table header section (around line 620-630)
   - Position it to match the new status column in the data rows
   - Use uppercase styling consistent with other headers

4. **Implement Cache-Busting in fetchInvoices**:
   - Add a timestamp parameter to API requests: `params.append('_t', Date.now().toString())`
   - This prevents browser from returning cached responses
   - Place this parameter addition before the fetch call (around line 240)

5. **Add Forced Refresh on Component Mount**:
   - Consider adding a useEffect that triggers fetchInvoices when the component mounts after navigation
   - This ensures fresh data when users return to the list from detail view
   - May need to detect navigation events or use a ref to track mount source

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render the component in desktop mode and verify status column presence, and tests that perform state-changing operations and check for data freshness. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Desktop Status Column Test**: Render component with viewport width 1024px, verify status badge is NOT rendered in table rows (will fail on unfixed code)
2. **Submit Operation Refresh Test**: Submit a Draft invoice, immediately check if list shows updated status (will fail on unfixed code due to stale data)
3. **Payment Operation Refresh Test**: Make a payment, verify outstanding amount updates in list (will fail on unfixed code)
4. **Navigation Refresh Test**: Navigate from detail to list, verify data is fresh from server (may fail on unfixed code due to caching)

**Expected Counterexamples**:
- Desktop table rows do not contain status badge elements
- After submit operation, invoice status remains "Draft" in list view despite successful submission
- Possible causes: missing column in grid layout, no cache-busting in API calls, timing issues with state updates

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderInvoiceList_fixed(input)
  IF input.viewMode == 'desktop' THEN
    ASSERT statusColumnExists(result)
    ASSERT statusBadgesRendered(result)
  END IF
  IF input.operation IN ['submit', 'payment', 'navigation'] THEN
    ASSERT dataIsFresh(result)
    ASSERT cacheBustingApplied(result)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderInvoiceList_original(input) = renderInvoiceList_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for mobile view and other features, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Mobile Card Layout Preservation**: Render component with viewport width 375px, verify card layout and status badge position match original exactly
2. **Filter Functionality Preservation**: Apply various filter combinations, verify results match original behavior
3. **Pagination Preservation**: Navigate through pages, verify pagination controls work identically
4. **Action Buttons Preservation**: Click print/submit/payment buttons, verify handlers execute correctly
5. **Row Navigation Preservation**: Click on invoice rows, verify navigation to detail view works

### Unit Tests

- Test status badge rendering in desktop table rows with various status values (Draft, Paid, Unpaid, etc.)
- Test grid column layout adjustments maintain proper alignment
- Test cache-busting parameter is appended to API requests
- Test fetchInvoices is called after submit operations
- Test status badge styling matches between mobile and desktop views

### Property-Based Tests

- Generate random viewport widths and verify status badge presence/absence based on breakpoint
- Generate random invoice datasets and verify all status badges render correctly in desktop view
- Generate random sequences of state-changing operations and verify data freshness after each
- Test that mobile card layout remains unchanged across many random invoice configurations

### Integration Tests

- Test full user flow: view list on desktop → verify status column → submit invoice → verify updated status
- Test responsive behavior: resize from mobile to desktop → verify status badge appears in correct location
- Test navigation flow: list → detail → back to list → verify fresh data loaded
- Test filter + status display: apply filters → verify status badges still render correctly in desktop view
- Test pagination + status display: navigate pages → verify status badges render on all pages
