/**
 * TypeScript interfaces for Dashboard Analytics Enhancement
 * 
 * Requirements: 15.3, 15.4, 11.1
 */

// ============================================================================
// Product Analytics Types
// ============================================================================

/**
 * Top Product interface - represents products with highest sales
 * Requirement: 1.2, 9.2
 */
export interface TopProduct {
  item_code: string;
  item_name: string;
  total_qty: number;
  total_amount: number;
}

// ============================================================================
// Customer Behavior Types
// ============================================================================

/**
 * Best Customer interface - customers with best payment behavior
 * Requirement: 2.3, 9.3
 */
export interface BestCustomer {
  customer_name: string;
  paid_invoices: number;
  on_time_percentage: number;
  total_paid: number;
}

/**
 * Worst Customer interface - customers with worst payment behavior
 * Requirement: 3.3, 9.4
 */
export interface WorstCustomer {
  customer_name: string;
  overdue_invoices: number;
  outstanding_amount: number;
}

/**
 * Bad Debt Customer interface - customers with bad debt (>90 days overdue)
 * Requirement: 3.1.3, 9.5
 */
export interface BadDebtCustomer {
  customer_name: string;
  bad_debt_invoices: number;
  bad_debt_amount: number;
  average_overdue_days: number;
}

// ============================================================================
// Sales Performance Types
// ============================================================================

/**
 * Sales Performance interface - sales person performance by revenue
 * Requirement: 4.2, 9.6
 */
export interface SalesPerformance {
  sales_person: string;
  transaction_count: number;
  total_revenue: number;
}

/**
 * Sales Commission interface - sales person performance by commission
 * Requirement: 5.2, 6.2, 9.7, 9.8
 */
export interface SalesCommission {
  sales_person: string;
  transaction_count: number;
  total_commission: number;
}

// ============================================================================
// Commission Tracking Types
// ============================================================================

/**
 * Commission Breakdown interface - breakdown per sales person
 * Requirement: 7.6
 */
export interface CommissionBreakdown {
  sales_person: string;
  outstanding_amount: number;
}

/**
 * Outstanding Commission interface - total unpaid commission
 * Requirement: 7.1, 7.2, 9.9
 */
export interface OutstandingCommission {
  total_outstanding: number;
  sales_count: number;
  breakdown: CommissionBreakdown[];
}

/**
 * Monthly Commission interface - commission data per month
 * Requirement: 8.3
 */
export interface MonthlyCommission {
  month: string; // YYYY-MM format
  total: number;
}

/**
 * Paid Commission interface - total paid commission with trend
 * Requirement: 8.1, 8.2, 9.10
 */
export interface PaidCommission {
  total_paid: number;
  period: string;
  monthly_trend: MonthlyCommission[];
}

// ============================================================================
// Inventory Analytics Types
// ============================================================================

/**
 * Highest Stock Item interface - items with highest stock levels
 * Requirement: 16.2, 9.11
 */
export interface HighestStockItem {
  item_code: string;
  item_name: string;
  total_stock: number;
  warehouse_count: number;
}

/**
 * Lowest Stock Item interface - items with lowest stock levels
 * Requirement: 17.2, 9.12
 */
export interface LowestStockItem {
  item_code: string;
  item_name: string;
  total_stock: number;
  reorder_level: number;
}

/**
 * Most Purchased Item interface - items with highest purchase frequency
 * Requirement: 18.2, 9.13
 */
export interface MostPurchasedItem {
  item_code: string;
  item_name: string;
  purchase_frequency: number;
  total_purchased_qty: number;
}

// ============================================================================
// Supplier Analytics Types
// ============================================================================

/**
 * Top Supplier By Frequency interface - suppliers with highest purchase frequency
 * Requirement: 19.2, 9.14
 */
export interface TopSupplierByFrequency {
  supplier_name: string;
  purchase_order_count: number;
  total_purchase_amount: number;
  average_order_value: number;
}

/**
 * Paid Supplier interface - suppliers with highest paid amounts
 * Requirement: 20.2, 9.15
 */
export interface PaidSupplier {
  supplier_name: string;
  paid_invoices_count: number;
  total_paid_amount: number;
  last_payment_date: string;
}

/**
 * Unpaid Supplier interface - suppliers with highest outstanding amounts
 * Requirement: 21.2, 9.16
 */
export interface UnpaidSupplier {
  supplier_name: string;
  outstanding_invoices_count: number;
  outstanding_amount: number;
  oldest_due_date: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Valid analytics type parameter values
 * Requirement: 9.1
 */
export type AnalyticsType =
  | 'top_products'
  | 'best_customers'
  | 'worst_customers'
  | 'bad_debt_customers'
  | 'top_sales_by_revenue'
  | 'top_sales_by_commission'
  | 'worst_sales_by_commission'
  | 'outstanding_commission'
  | 'paid_commission'
  | 'highest_stock_items'
  | 'lowest_stock_items'
  | 'most_purchased_items'
  | 'top_suppliers_by_frequency'
  | 'paid_suppliers'
  | 'unpaid_suppliers';

/**
 * Generic Analytics Response wrapper
 * Requirement: 9.1, 15.3
 */
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  cached?: boolean;
  timestamp?: string;
}

/**
 * Analytics Error Response
 * Requirement: 9.19, 14.1
 */
export interface AnalyticsErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * Analytics Query Parameters
 * Requirement: 9.1
 */
export interface AnalyticsQueryParams {
  type: AnalyticsType;
  company?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if response is an error
 */
export function isAnalyticsError(
  response: AnalyticsResponse<unknown> | AnalyticsErrorResponse
): response is AnalyticsErrorResponse {
  return response.success === false && 'error' in response;
}

/**
 * Type guard to check if analytics type is valid
 */
export function isValidAnalyticsType(type: string): type is AnalyticsType {
  const validTypes: AnalyticsType[] = [
    'top_products',
    'best_customers',
    'worst_customers',
    'bad_debt_customers',
    'top_sales_by_revenue',
    'top_sales_by_commission',
    'worst_sales_by_commission',
    'outstanding_commission',
    'paid_commission',
    'highest_stock_items',
    'lowest_stock_items',
    'most_purchased_items',
    'top_suppliers_by_frequency',
    'paid_suppliers',
    'unpaid_suppliers',
  ];
  return validTypes.includes(type as AnalyticsType);
}
