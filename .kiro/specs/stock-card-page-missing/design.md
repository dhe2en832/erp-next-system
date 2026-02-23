# Stock Card Page Missing Bugfix Design

## Overview

The bug occurs when users attempt to access the Stock Card Report at `/reports/stock-card`, resulting in a 404 error. All backend infrastructure (API route, utilities, types) and UI components (StockCardFilters, StockCardTable, StockCardSummary) are fully implemented and functional. The missing piece is the main page component (`app/reports/stock-card/page.tsx`) that integrates these components into a complete report page.

The fix involves creating a single page component that follows the established pattern used in other report pages (e.g., `/reports/sales/page.tsx`), integrating the existing components with proper state management, API communication, and error handling.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when users navigate to `/reports/stock-card`
- **Property (P)**: The desired behavior - display a functional Stock Card Report page with filters, table, and summary
- **Preservation**: Existing report pages and API routes that must remain unchanged
- **page.tsx**: The Next.js App Router page component file that renders the route
- **StockCardFilters**: Existing component for filter inputs (date range, item, warehouse, customer, supplier, transaction type)
- **StockCardTable**: Existing component for displaying stock ledger entries in a table with pagination
- **StockCardSummary**: Existing component for displaying summary statistics (opening balance, total in/out, closing balance)
- **API_Route**: The existing `/api/inventory/reports/stock-card` endpoint that fetches data from ERPNext

## Bug Details

### Fault Condition

The bug manifests when a user navigates to the `/reports/stock-card` URL path. Next.js cannot find a `page.tsx` file in the `app/reports/stock-card/` directory, resulting in a 404 error page being displayed instead of the Stock Card Report.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type NavigationRequest
  OUTPUT: boolean
  
  RETURN input.url_path == '/reports/stock-card'
         AND NOT file_exists('app/reports/stock-card/page.tsx')
         AND user_authenticated == true
END FUNCTION
```

### Examples

- User clicks "Laporan Kartu Stok" menu item → 404 error displayed
- User types `/reports/stock-card` in browser address bar → 404 error displayed
- User follows a link to stock card report from another page → 404 error displayed
- Direct API call to `/api/inventory/reports/stock-card` → Works correctly (not affected by bug)


## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All existing report pages (sales, purchases, financial reports, etc.) must continue to work exactly as before
- The API route `/api/inventory/reports/stock-card` must continue to function without modification
- All existing components (StockCardFilters, StockCardTable, StockCardSummary) must continue to work without modification
- Navigation menu and routing for other pages must remain unchanged
- Authentication and authorization flows must remain unchanged

**Scope:**
All navigation requests that do NOT target `/reports/stock-card` should be completely unaffected by this fix. This includes:
- Other report pages under `/reports/*`
- API routes under `/api/*`
- Document pages (invoices, purchase orders, etc.)
- Dashboard and other application pages

## Hypothesized Root Cause

Based on the bug description and codebase analysis, the root cause is clear:

1. **Missing Page Component**: The `app/reports/stock-card/page.tsx` file was never created during the initial implementation of the Stock Card Report feature. The development focused on building the API route, utilities, types, and UI components, but the integration page was overlooked.

2. **Next.js App Router Requirement**: Next.js App Router requires a `page.tsx` file in a route directory to make that route accessible. Without this file, Next.js treats the route as non-existent and returns a 404 error.

3. **Component Isolation**: The components (StockCardFilters, StockCardTable, StockCardSummary) were built and tested in isolation, but were never integrated into a page component that manages their state and orchestrates their interaction.

4. **No State Management Layer**: There is no page-level component to manage the application state (filters, data, loading, errors, pagination) and coordinate between the UI components and the API.

## Correctness Properties

Property 1: Fault Condition - Stock Card Page Displays Successfully

_For any_ navigation request where the URL path is `/reports/stock-card` and the user is authenticated, the fixed application SHALL render a functional Stock Card Report page that displays the StockCardFilters component, StockCardTable component, and StockCardSummary component, and successfully fetches data from the `/api/inventory/reports/stock-card` endpoint.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Other Pages Remain Functional

_For any_ navigation request where the URL path is NOT `/reports/stock-card`, the fixed application SHALL produce exactly the same behavior as before the fix, preserving all existing functionality for other report pages, document pages, and API routes.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**


## Fix Implementation

### Changes Required

The fix requires creating a single new file with no modifications to existing code:

**File**: `app/reports/stock-card/page.tsx`

**Function**: Main page component for Stock Card Report

**Specific Changes**:

1. **Create Page Component Structure**: 
   - Create a client-side React component using `'use client'` directive
   - Follow the pattern established in `app/reports/sales/page.tsx`
   - Use TypeScript with proper type imports from `@/types/stock-card`

2. **Implement State Management**:
   - Manage filter state using `StockCardFilters` interface
   - Track loading state for API requests
   - Track error state for error handling
   - Manage pagination state (current page, page size)
   - Store fetched data (stock ledger entries)
   - Store summary statistics
   - Store selected company from localStorage

3. **Implement Data Fetching Logic**:
   - Create `fetchData` function that calls `/api/inventory/reports/stock-card`
   - Convert date format from DD/MM/YYYY (UI) to YYYY-MM-DD (API)
   - Build query parameters from filter state
   - Handle API response (success and error cases)
   - Update state with fetched data and summary

4. **Integrate Existing Components**:
   - Import and render `StockCardFilters` component with proper props
   - Import and render `StockCardTable` component with proper props
   - Import and render `StockCardSummary` component with proper props (conditionally when data exists)
   - Pass callback functions for filter changes, pagination, and refresh

5. **Implement Filter Handlers**:
   - `handleFilterChange`: Update filter state and trigger data fetch
   - `handleClearFilters`: Reset filters to default values
   - `handleRefresh`: Re-fetch data with current filters
   - `handlePageChange`: Update current page
   - `handlePageSizeChange`: Update page size and reset to page 1

6. **Implement Initial Data Load**:
   - Use `useEffect` to load selected company from localStorage on mount
   - Use `useEffect` to fetch dropdown options (items, warehouses, customers, suppliers)
   - Use `useEffect` to fetch report data when filters change

7. **Add Loading and Error States**:
   - Display loading spinner while fetching data
   - Display error messages in user-friendly format (Indonesian)
   - Display empty state when no item is selected

8. **Add Page Header and Actions**:
   - Display page title "Laporan Kartu Stok"
   - Add export buttons (Excel, PDF) - placeholder for future implementation
   - Add print button - placeholder for future implementation


## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists by attempting to access the route before the fix, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Confirm the bug exists BEFORE implementing the fix by attempting to navigate to `/reports/stock-card` and observing the 404 error.

**Test Plan**: Manually navigate to the stock card report URL and verify that a 404 error is displayed. Check the browser console and network tab to confirm no page component is loaded.

**Test Cases**:
1. **Direct URL Access**: Navigate to `http://localhost:3000/reports/stock-card` (will show 404 on unfixed code)
2. **Menu Navigation**: Click "Laporan Kartu Stok" menu item if it exists (will show 404 on unfixed code)
3. **API Route Test**: Call `/api/inventory/reports/stock-card` directly (will work correctly, confirming API is functional)
4. **Other Report Pages**: Navigate to `/reports/sales` or other report pages (will work correctly, confirming routing works for other pages)

**Expected Counterexamples**:
- 404 error page displayed when accessing `/reports/stock-card`
- Browser console shows "404 Not Found" error
- Next.js error: "This page could not be found"

### Fix Checking

**Goal**: Verify that for all navigation requests to `/reports/stock-card`, the fixed application displays a functional Stock Card Report page.

**Pseudocode:**
```
FOR ALL navigation_request WHERE isBugCondition(navigation_request) DO
  result := navigate_to_stock_card_page(navigation_request)
  ASSERT page_renders_successfully(result)
  ASSERT filters_component_displayed(result)
  ASSERT table_component_displayed(result)
  ASSERT summary_component_displayed(result)
  ASSERT api_call_successful(result)
END FOR
```

**Test Cases**:
1. **Page Renders**: Navigate to `/reports/stock-card` and verify page loads without 404 error
2. **Components Display**: Verify StockCardFilters, StockCardTable, and StockCardSummary components are visible
3. **Filter Interaction**: Select an item from dropdown and verify data is fetched
4. **Date Range Filter**: Change date range and verify data updates
5. **Pagination**: Change page and verify table updates with new data
6. **Error Handling**: Test with invalid filters and verify error messages display
7. **Loading State**: Verify loading spinner displays during data fetch
8. **Empty State**: Verify appropriate message when no item is selected


### Preservation Checking

**Goal**: Verify that for all navigation requests that do NOT target `/reports/stock-card`, the fixed application produces the same result as before the fix.

**Pseudocode:**
```
FOR ALL navigation_request WHERE NOT isBugCondition(navigation_request) DO
  ASSERT navigate_before_fix(navigation_request) = navigate_after_fix(navigation_request)
END FOR
```

**Testing Approach**: Manual testing is recommended for preservation checking because:
- The fix only adds a new file without modifying existing code
- Next.js routing is deterministic and isolated by route
- The risk of regression is minimal since no existing files are changed
- Manual verification provides confidence that other pages remain functional

**Test Plan**: After implementing the fix, manually test other report pages and verify they continue to work as expected.

**Test Cases**:
1. **Sales Report Preservation**: Navigate to `/reports/sales` and verify it displays correctly
2. **Purchase Report Preservation**: Navigate to `/reports/purchases` and verify it displays correctly
3. **Financial Reports Preservation**: Navigate to `/financial-reports` and verify it displays correctly
4. **API Route Preservation**: Call `/api/inventory/reports/stock-card` directly and verify response format is unchanged
5. **Component Reusability**: Verify StockCardFilters, StockCardTable, and StockCardSummary components can still be used in other contexts if needed

### Unit Tests

- Test page component renders without crashing
- Test filter state management (updates correctly when filters change)
- Test pagination state management (updates correctly when page changes)
- Test API call construction (query parameters built correctly from filters)
- Test date format conversion (DD/MM/YYYY ↔ YYYY-MM-DD)
- Test error handling (displays error messages correctly)

### Property-Based Tests

Not applicable for this bugfix. The fix is straightforward (creating a missing page component) and does not involve complex logic that would benefit from property-based testing. The existing property-based tests for stock card utilities and calculations remain valid and unchanged.

### Integration Tests

- Test full page load flow: mount → fetch company → fetch dropdown options → user selects item → fetch data → display results
- Test filter interaction flow: change filter → debounce → API call → update display
- Test pagination flow: change page → API call with new page parameter → update table
- Test error recovery flow: API error → display error message → user fixes filter → retry → success
- Test responsive behavior: verify page displays correctly on mobile, tablet, and desktop viewports

### Manual Testing Checklist

After implementing the fix, perform these manual tests:

1. ✓ Navigate to `/reports/stock-card` - page loads without 404
2. ✓ Select an item from dropdown - data fetches and displays
3. ✓ Change date range - data updates
4. ✓ Apply warehouse filter - data filters correctly
5. ✓ Apply customer filter - data filters correctly
6. ✓ Apply supplier filter - data filters correctly
7. ✓ Apply transaction type filter - data filters correctly
8. ✓ Clear filters - resets to default state
9. ✓ Click refresh - re-fetches data
10. ✓ Change page - pagination works
11. ✓ Change page size - table updates
12. ✓ Verify summary displays correct calculations
13. ✓ Test on mobile device - responsive layout works
14. ✓ Navigate to other report pages - still work correctly
15. ✓ Check browser console - no errors
