# Implementation Plan: Dashboard Analytics Enhancement

## Overview

This implementation plan breaks down the Dashboard Analytics Enhancement feature into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated as sub-tasks. The plan follows a bottom-up approach: types → API → components → integration → testing.

## Tasks

- [x] 1. Setup TypeScript type definitions and shared utilities
  - Create `types/dashboard-analytics.ts` with all analytics interfaces
  - Define types: TopProduct, BestCustomer, WorstCustomer, BadDebtCustomer, SalesPerformance, SalesCommission, OutstandingCommission, PaidCommission, HighestStockItem, LowestStockItem, MostPurchasedItem, TopSupplierByFrequency, PaidSupplier, UnpaidSupplier
  - Add AnalyticsResponse<T> and AnalyticsErrorResponse types
  - Create utility functions for currency formatting (Indonesian Rupiah format)
  - _Requirements: 15.3, 15.4, 11.1_

- [-] 2. Implement analytics API endpoint
  - [x] 2.1 Create API route structure at `/api/analytics/route.ts`
    - Implement GET handler with type parameter validation
    - Add authentication check using getERPNextClientForRequest
    - Setup query parameter parsing and validation
    - _Requirements: 9.1, 9.12_
  
  - [x] 2.2 Implement cache layer with 5-minute TTL
    - Create in-memory cache class with get/set methods
    - Implement cache key generation: `analytics:${type}:${company}`
    - Add cache hit/miss logic with timestamp validation
    - _Requirements: 13.2, 13.3_
  
  - [x] 2.3 Implement top_products analytics handler
    - Query Sales Invoice Item from ERPNext with company filter
    - Aggregate items by item_code (sum qty and amount)
    - Sort by total_amount descending and limit to 10
    - Return TopProduct[] array
    - _Requirements: 1.1, 1.2, 1.5, 9.2_
  
  - [x] 2.4 Implement best_customers analytics handler
    - Query Sales Invoice with paid invoices
    - Calculate on_time_percentage per customer
    - Sort by on_time_percentage and total_paid
    - Return top 10 BestCustomer[] array
    - _Requirements: 2.1, 2.2, 2.3, 9.3_
  
  - [x] 2.5 Implement worst_customers analytics handler
    - Query Sales Invoice with outstanding_amount > 0
    - Filter invoices where today > due_date
    - Group by customer and sum overdue invoices
    - Return top 10 WorstCustomer[] array
    - _Requirements: 3.1, 3.2, 3.3, 9.4_
  
  - [x] 2.6 Implement bad_debt_customers analytics handler
    - Query Sales Invoice with outstanding_amount > 0
    - Filter invoices where due_date < (today - 90 days)
    - Calculate average_overdue_days per customer
    - Return top 10 BadDebtCustomer[] array
    - _Requirements: 3.1.1, 3.1.2, 3.1.3, 9.5, 9.11_
  
  - [x] 2.7 Implement sales performance analytics handlers
    - Implement top_sales_by_revenue: query Sales Invoice, extract sales_team, aggregate by sales_person
    - Implement top_sales_by_commission: calculate commission from sales_team allocation
    - Implement worst_sales_by_commission: same as above but bottom 10
    - Return SalesPerformance[] and SalesCommission[] arrays
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 9.6, 9.7, 9.8_
  
  - [x] 2.8 Implement commission tracking handlers
    - Implement outstanding_commission: query unpaid commissions, calculate total and breakdown
    - Implement paid_commission: query paid commissions, group by month, calculate trend
    - Return OutstandingCommission and PaidCommission objects
    - _Requirements: 7.1, 7.2, 7.4, 8.1, 8.2, 8.4, 9.9, 9.10_
  
  - [x] 2.9 Implement inventory analytics handlers
    - Implement highest_stock_items: query Bin doctype, aggregate by item_code, sum actual_qty, count warehouses
    - Implement lowest_stock_items: query Bin with actual_qty > 0, aggregate and sort ascending, join with Item for reorder_level
    - Implement most_purchased_items: query Purchase Order Item, count unique parent per item, sum qty
    - Return HighestStockItem[], LowestStockItem[], and MostPurchasedItem[] arrays
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 18.1, 18.2, 18.3, 9.11, 9.12, 9.13_
  
  - [x] 2.10 Implement supplier analytics handlers
    - Implement top_suppliers_by_frequency: query Purchase Order, count orders per supplier, calculate average order value
    - Implement paid_suppliers: query Purchase Invoice with outstanding_amount = 0, sum paid amounts, get last payment date
    - Implement unpaid_suppliers: query Purchase Invoice with outstanding_amount > 0, sum outstanding, get oldest due date
    - Return TopSupplierByFrequency[], PaidSupplier[], and UnpaidSupplier[] arrays
    - _Requirements: 19.1, 19.2, 19.5, 20.1, 20.2, 21.1, 21.2, 21.6, 9.14, 9.15, 9.16_
  
  - [x] 2.11 Add error handling and response formatting
    - Wrap all handlers in try-catch blocks
    - Return standardized error responses with appropriate HTTP status codes
    - Log errors with context for debugging
    - Add 10-second timeout for ERPNext queries
    - _Requirements: 9.19, 14.1, 14.6_

- [ ] 2.12 Write property tests for API endpoint
  - **Property 1: Analytics Result Limit** - Verify all ranked results return max 10 items
  - **Property 7: Bad Debt Classification Rule** - Verify invoices >90 days overdue are classified as bad debt
  - **Property 16: API Response Time Performance** - Verify response time < 2000ms
  - **Property 17: Cache TTL Behavior** - Verify cache serves data within 5-minute window
  - **Validates: Requirements 1.1, 3.1.2, 13.1, 13.2**

- [x] 3. Checkpoint - Verify API endpoint functionality
  - Test API endpoint manually with different type parameters
  - Verify authentication works correctly
  - Check cache behavior with repeated requests
  - Ensure all error cases return proper responses
  - Ask the user if questions arise

- [x] 4. Implement shared chart components and utilities
  - [x] 4.1 Create chart configuration utilities
    - Define CHART_COLORS constant with color palette
    - Create formatCurrency helper for Indonesian Rupiah
    - Create formatMonthYear helper for date formatting
    - Add chart tooltip formatter functions
    - _Requirements: 10.5, 11.1_
  
  - [x] 4.2 Create loading skeleton components
    - Implement ChartLoadingSkeleton component
    - Implement CardLoadingSkeleton component
    - Add animated pulse effect
    - _Requirements: 11.6_
  
  - [x] 4.3 Create empty state components
    - Implement EmptyState component with illustration and message
    - Add customizable message prop
    - _Requirements: 1.4, 4.5, 14.2_
  
  - [x] 4.4 Create error state components
    - Implement ErrorState component with retry button
    - Add error message display
    - Implement retry callback prop
    - _Requirements: 14.3, 14.5_

- [-] 5. Implement Top Products analytics component
  - [x] 5.1 Create TopProductsChart component
    - Implement data fetching with useEffect
    - Add loading, error, and data states
    - Integrate with /api/analytics?type=top_products
    - _Requirements: 1.1, 1.2_
  
  - [x] 5.2 Add horizontal bar chart visualization
    - Use Recharts BarChart with horizontal layout
    - Configure xAxis (number, total_amount) and yAxis (category, item_name)
    - Add tooltip with currency formatting
    - Apply indigo color from palette
    - _Requirements: 1.3, 10.1, 10.5, 10.6_
  
  - [x] 5.3 Add loading, empty, and error states
    - Show ChartLoadingSkeleton while loading
    - Show EmptyState when data is empty
    - Show ErrorState with retry on error
    - _Requirements: 1.4, 11.6, 14.2, 14.3_

- [ ] 5.4 Write unit tests for TopProductsChart
  - Test data transformation and rendering
  - Test empty state display
  - Test error handling and retry
  - _Requirements: 1.1, 1.4_

- [-] 6. Implement Customer Behavior analytics components
  - [x] 6.1 Create BestCustomersChart component
    - Fetch data from /api/analytics?type=best_customers
    - Implement vertical bar chart with green color
    - Display customer_name, on_time_percentage, total_paid
    - Add tooltip with formatted values
    - _Requirements: 2.1, 2.3, 10.2, 10.5_
  
  - [x] 6.2 Create WorstCustomersChart component
    - Fetch data from /api/analytics?type=worst_customers
    - Implement vertical bar chart with red color
    - Display customer_name, overdue_invoices, outstanding_amount
    - Add warning color styling
    - _Requirements: 3.1, 3.3, 3.4, 10.2_
  
  - [x] 6.3 Create BadDebtCustomersChart component
    - Fetch data from /api/analytics?type=bad_debt_customers
    - Implement vertical bar chart with dark red color
    - Display customer_name, bad_debt_amount, average_overdue_days
    - Add "Bad Debt" badge with red styling
    - Calculate and display bad debt percentage
    - _Requirements: 3.1.1, 3.1.3, 3.1.4, 3.1.6, 3.1.7_
  
  - [x] 6.4 Create CustomerBehaviorSection container component
    - Compose BestCustomersChart, WorstCustomersChart, BadDebtCustomersChart
    - Implement responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
    - Add section title and description
    - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 6.5 Write property tests for customer behavior components
  - **Property 3: Required Fields Presence - Best Customers**
  - **Property 4: Required Fields Presence - Worst Customers**
  - **Property 5: Required Fields Presence - Bad Debt Customers**
  - **Property 8: Bad Debt Percentage Calculation**
  - **Property 9: On-Time Payment Percentage Calculation**
  - **Validates: Requirements 2.2, 2.3, 3.1.3, 3.1.7**

- [-] 7. Implement Sales Performance analytics components
  - [x] 7.1 Create TopSalesByRevenueChart component
    - Fetch data from /api/analytics?type=top_sales_by_revenue
    - Implement horizontal bar chart with indigo color
    - Display sales_person, transaction_count, total_revenue
    - Add tooltip with currency formatting
    - _Requirements: 4.1, 4.2, 4.3, 10.3_
  
  - [x] 7.2 Create TopSalesByCommissionChart component
    - Fetch data from /api/analytics?type=top_sales_by_commission
    - Implement horizontal bar chart with green color
    - Display sales_person, transaction_count, total_commission
    - Format commission values in Rupiah
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 10.3_
  
  - [x] 7.3 Create WorstSalesByCommissionChart component
    - Fetch data from /api/analytics?type=worst_sales_by_commission
    - Implement horizontal bar chart with orange color
    - Display sales_person, transaction_count, total_commission
    - Format commission values in Rupiah
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 10.3_
  
  - [x] 7.4 Create SalesPerformanceSection container component
    - Compose all three sales performance charts
    - Implement responsive grid layout
    - Add section title and tabs/toggle for switching views
    - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 7.5 Write unit tests for sales performance components
  - Test data fetching and rendering
  - Test currency formatting (Property 11)
  - Test empty state for no sales data
  - _Requirements: 4.5, 5.5, 6.5_

- [-] 8. Implement Commission Tracker components
  - [x] 8.1 Create OutstandingCommissionCard component
    - Fetch data from /api/analytics?type=outstanding_commission
    - Display total_outstanding and sales_count
    - Show alert banner when total_outstanding > 0
    - Display breakdown list/table with sales_person and outstanding_amount
    - Format all amounts in Rupiah
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_
  
  - [x] 8.2 Create PaidCommissionTrendChart component
    - Fetch data from /api/analytics?type=paid_commission
    - Implement line chart with indigo color
    - Display monthly_trend with month and total
    - Add markers on data points
    - Show period information
    - Format amounts in Rupiah
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 10.4_
  
  - [x] 8.3 Create CommissionTrackerSection container component
    - Compose OutstandingCommissionCard and PaidCommissionTrendChart
    - Implement responsive layout (1 col mobile, 2 col desktop)
    - Add section title
    - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 8.4 Write property tests for commission tracker
  - **Property 12: Commission Total Calculation**
  - **Property 13: Sales Count Accuracy**
  - **Property 14: Alert Visibility Condition**
  - **Property 15: Period Format Validation**
  - **Validates: Requirements 7.1, 7.2, 7.3, 8.2**

- [-] 9. Implement Inventory Analytics components
  - [x] 9.1 Create HighestStockItemsChart component
    - Fetch data from /api/analytics?type=highest_stock_items
    - Implement horizontal bar chart with indigo color
    - Display item_code, item_name, total_stock, warehouse_count
    - Add tooltip with formatted values
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [x] 9.2 Create LowestStockItemsChart component
    - Fetch data from /api/analytics?type=lowest_stock_items
    - Implement horizontal bar chart with orange color for warning
    - Display item_code, item_name, total_stock, reorder_level
    - Add "Reorder" badge when stock < reorder_level
    - _Requirements: 17.1, 17.2, 17.3, 17.5_
  
  - [x] 9.3 Create MostPurchasedItemsChart component
    - Fetch data from /api/analytics?type=most_purchased_items
    - Implement horizontal bar chart with green color
    - Display item_code, item_name, purchase_frequency, total_purchased_qty
    - Add tooltip with formatted values
    - _Requirements: 18.1, 18.2, 18.4, 18.5_
  
  - [x] 9.4 Create InventoryAnalyticsSection container component
    - Compose all three inventory analytics charts
    - Implement responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
    - Add section title and description
    - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 9.5 Write unit tests for inventory analytics components
  - Test data fetching and rendering
  - Test empty state for no stock data
  - Test reorder badge display logic
  - _Requirements: 16.5, 17.1_

- [x] 10. Implement Supplier Analytics components
  - [x] 10.1 Create TopSuppliersByFrequencyChart component
    - Fetch data from /api/analytics?type=top_suppliers_by_frequency
    - Implement horizontal bar chart with indigo color
    - Display supplier_name, purchase_order_count, total_purchase_amount, average_order_value
    - Format amounts in Rupiah
    - _Requirements: 19.1, 19.2, 19.3, 19.5_
  
  - [x] 10.2 Create PaidSuppliersChart component
    - Fetch data from /api/analytics?type=paid_suppliers
    - Implement bar chart with green color for positive indication
    - Display supplier_name, paid_invoices_count, total_paid_amount, last_payment_date
    - Format amounts in Rupiah
    - _Requirements: 20.1, 20.2, 20.3, 20.5_
  
  - [x] 10.3 Create UnpaidSuppliersChart component
    - Fetch data from /api/analytics?type=unpaid_suppliers
    - Implement bar chart with red color for warning
    - Display supplier_name, outstanding_invoices_count, outstanding_amount, oldest_due_date
    - Show alert banner when outstanding_amount > 0
    - Format amounts in Rupiah
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.6_
  
  - [x] 10.4 Create SupplierAnalyticsSection container component
    - Compose all three supplier analytics charts
    - Implement responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
    - Add section title and description
    - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 10.5 Write unit tests for supplier analytics components
  - Test data fetching and rendering
  - Test currency formatting
  - Test alert banner display for unpaid suppliers
  - _Requirements: 19.5, 20.5, 21.3, 21.6_

- [-] 11. Checkpoint - Verify all analytics components work independently
  - Test each component in isolation
  - Verify loading states display correctly
  - Check error handling and retry functionality
  - Ensure responsive design works on mobile/tablet/desktop
  - Ask the user if questions arise

- [x] 12. Integrate analytics components into dashboard page
  - [x] 12.1 Update dashboard page layout
    - Import all analytics section components (including inventory and supplier sections)
    - Add analytics sections below existing stat cards and monthly sales chart
    - Implement CSS Grid layout with responsive breakpoints
    - _Requirements: 11.1, 11.2, 12.1, 12.2, 12.3_
  
  - [x] 12.2 Implement role-based visibility
    - Check user roles from localStorage or /api/setup/auth/me
    - Show all analytics for Sales Manager and System Manager
    - Show customer behavior and commission tracker for Accounts Manager
    - Show inventory analytics for Stock Manager and Item Manager
    - Show supplier analytics for Purchase Manager
    - Hide analytics for users without appropriate roles
    - _Requirements: 11.3, 11.4_
  
  - [x] 12.3 Implement parallel data loading
    - Use Promise.allSettled to fetch all analytics data simultaneously (now 15 types)
    - Handle partial failures gracefully (show successful components, error for failed)
    - Measure and log loading times for performance monitoring
    - _Requirements: 11.5, 11.7, 14.4_
  
  - [x] 12.4 Add error boundary for analytics section
    - Implement React error boundary component
    - Catch rendering errors in analytics components
    - Display fallback UI without crashing entire dashboard
    - Log errors to console
    - _Requirements: 14.4, 14.6_

- [ ] 12.5 Write integration tests for dashboard integration
  - Test role-based visibility logic
  - Test parallel loading behavior
  - Test error isolation between components
  - Test responsive layout breakpoints
  - _Requirements: 11.3, 11.5, 11.7, 12.1_

- [x] 13. Implement responsive design and accessibility
  - [x] 11.1 Add responsive breakpoints
    - Verify 1-column layout on mobile (< 768px)
    - Verify 2-column layout on tablet (768px - 1024px)
    - Verify 3-4 column layout on desktop (> 1024px)
    - Test all components at different viewport sizes
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 11.2 Ensure touch target sizes
    - Verify all interactive elements (buttons, chart elements) are min 44x44 pixels
    - Test on mobile device or browser dev tools
    - _Requirements: 12.5_
  
  - [x] 11.3 Verify color contrast ratios
    - Check all text/background combinations meet 4.5:1 contrast ratio
    - Use browser accessibility tools or contrast checker
    - _Requirements: 12.7_
  
  - [x] 11.4 Add chart responsiveness
    - Ensure all Recharts components use ResponsiveContainer
    - Verify charts resize correctly when viewport changes
    - Test on mobile, tablet, and desktop
    - _Requirements: 10.8, 12.6_

- [ ] 11.5 Write property tests for accessibility
  - **Property 25: Touch Target Accessibility**
  - **Property 26: Chart Responsiveness**
  - **Property 27: Color Contrast Accessibility**
  - **Validates: Requirements 12.5, 12.6, 12.7**

- [-] 12. Performance optimization and caching
  - [x] 12.1 Add React.memo to chart components
    - Wrap all chart components with React.memo
    - Add useMemo for expensive data transformations
    - Verify re-render behavior with React DevTools
    - _Requirements: 13.4_
  
  - [x] 12.2 Implement lazy loading for below-fold components
    - Add Intersection Observer for analytics sections
    - Defer data fetching until component is near viewport
    - Use 200px rootMargin threshold
    - _Requirements: 13.5_
  
  - [x] 12.3 Optimize chart data for large datasets
    - Add data aggregation for charts with > 100 data points
    - Implement sampling or grouping logic
    - Test with large datasets
    - _Requirements: 13.6_
  
  - [x] 12.4 Verify API response times
    - Test all analytics endpoints with production-like data
    - Ensure response times < 2 seconds
    - Optimize slow queries if needed
    - _Requirements: 13.1, 16.1_

- [ ] 12.5 Write performance tests
  - **Property 16: API Response Time Performance**
  - **Property 29: Data Aggregation Threshold**
  - **Property 30: Lazy Loading Below Fold**
  - **Validates: Requirements 13.1, 13.5, 13.6**

- [x] 13. Final integration and testing
  - [x] 13.1 Run TypeScript compiler check
    - Execute `pnpm tsc --noEmit` to check for type errors
    - Fix any type errors or warnings
    - Ensure no `any` types are used
    - _Requirements: 15.1, 15.6, 15.7_
  
  - [x] 13.2 Run ESLint validation
    - Execute `pnpm lint` to check for linting errors
    - Fix all errors and warnings
    - Ensure code follows project conventions
    - _Requirements: 15.6_
  
  - [x] 13.3 Test all analytics components end-to-end
    - Load dashboard with different user roles
    - Verify all analytics display correctly
    - Test error scenarios (network failure, invalid data)
    - Test on mobile, tablet, and desktop viewports
    - _Requirements: 11.3, 12.1, 14.1, 14.2, 14.3_
  
  - [x] 13.4 Verify cache effectiveness
    - Monitor cache hit rate (should be > 80%)
    - Test cache invalidation after 5 minutes
    - Verify cache keys are unique per company
    - _Requirements: 13.2, 13.3_

- [x] 14. Final checkpoint - Complete validation
  - Ensure all tests pass (unit, integration, property-based)
  - Verify TypeScript and ESLint checks pass
  - Test on production-like environment
  - Verify performance metrics meet requirements
  - Ask the user if questions arise or if ready for deployment

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and allow for user feedback
- Property tests validate universal correctness properties from the design document
- All code should use TypeScript with strict type checking (no `any` types)
- Follow existing project structure and naming conventions
- Use Indonesian language for UI text (labels, messages, tooltips)
- Ensure all currency values use Indonesian Rupiah format: "Rp X.XXX.XXX,XX"
