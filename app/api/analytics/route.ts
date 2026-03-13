import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { 
  isValidAnalyticsType,
  type AnalyticsType,
  type AnalyticsResponse,
  type AnalyticsErrorResponse
} from '@/types/dashboard-analytics';
import { analyticsCache } from '@/lib/analytics-cache';
import {
  fetchBestCustomers,
  fetchWorstCustomers,
  fetchBadDebtCustomers,
  fetchTopSalesByRevenue,
  fetchTopSalesByCommission,
  fetchWorstSalesByCommission,
  fetchOutstandingCommission,
  fetchPaidCommission,
  fetchHighestStockItems,
  fetchLowestStockItems,
  fetchMostPurchasedItems,
  fetchTopSuppliersByFrequency,
  fetchPaidSuppliers,
  fetchUnpaidSuppliers,
} from '@/lib/analytics-handlers';
import { fetchTopProductsFixed, fetchPaidSuppliersFixed } from '@/lib/analytics-handlers-fixed';

/**
 * Analytics API Endpoint
 * 
 * Provides analytics data for dashboard components
 * 
 * Requirements: 9.1, 9.12
 * 
 * Query Parameters:
 * - type: Analytics type (required) - see AnalyticsType for valid values
 * - company: Company filter (optional)
 * 
 * Authentication: Required via API Key or session cookie
 * 
 * Response: AnalyticsResponse<T> where T depends on the type parameter
 */
export async function GET(request: NextRequest): Promise<NextResponse<AnalyticsResponse<unknown> | AnalyticsErrorResponse>> {
  const siteId = await getSiteIdFromRequest(request);
  
  // Parse query parameters early for error logging
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const company = searchParams.get('company');
  
  try {
    // Authentication check - getERPNextClientForRequest will throw if auth fails
    const client = await getERPNextClientForRequest(request);
    
    // Validate type parameter (Requirement 9.1)
    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Missing required parameter: type',
        } as AnalyticsErrorResponse,
        { status: 400 }
      );
    }
    
    if (!isValidAnalyticsType(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid type parameter. Must be one of: top_products, best_customers, worst_customers, bad_debt_customers, top_sales_by_revenue, top_sales_by_commission, worst_sales_by_commission, outstanding_commission, paid_commission, highest_stock_items, lowest_stock_items, most_purchased_items, top_suppliers_by_frequency, paid_suppliers, unpaid_suppliers`,
        } as AnalyticsErrorResponse,
        { status: 400 }
      );
    }
    
    // Check cache first (Requirement 13.2, 13.3)
    const cachedData = analyticsCache.get(type as AnalyticsType, company, siteId);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      } as AnalyticsResponse<unknown>);
    }
    
    // Fetch data with 30-second timeout (increased for production data)
    const data = await Promise.race([
      fetchAnalyticsData(client, type as AnalyticsType, company),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]);
    
    // Cache the result (Requirement 13.2)
    analyticsCache.set(type as AnalyticsType, company, data, siteId);
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    } as AnalyticsResponse<unknown>);
    
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('[Analytics API Error]', {
      type: searchParams.get('type'),
      siteId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    logSiteError(error, 'GET /api/analytics', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    
    // Map error types to appropriate HTTP status codes
    let statusCode = 500;
    if (errorResponse.errorType === 'authentication') {
      statusCode = 401;
    } else if (errorResponse.errorType === 'configuration') {
      statusCode = 503;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        message: errorResponse.message,
        details: error instanceof Error ? error.message : String(error),
      } as AnalyticsErrorResponse & { details?: string },
      { status: statusCode }
    );
  }
}

/**
 * Fetch analytics data based on type
 * 
 * @param client - ERPNext client instance
 * @param type - Analytics type
 * @param company - Optional company filter
 * @returns Analytics data
 */
async function fetchAnalyticsData(
  client: Awaited<ReturnType<typeof getERPNextClientForRequest>>,
  type: AnalyticsType,
  company: string | null
): Promise<unknown> {
  try {
    switch (type) {
      case 'top_products':
        return await fetchTopProductsFixed(client, company);
      case 'best_customers':
        return await fetchBestCustomers(client, company);
      case 'worst_customers':
        return await fetchWorstCustomers(client, company);
      case 'bad_debt_customers':
        return await fetchBadDebtCustomers(client, company);
      case 'top_sales_by_revenue':
        return await fetchTopSalesByRevenue(client, company);
      case 'top_sales_by_commission':
        return await fetchTopSalesByCommission(client, company);
      case 'worst_sales_by_commission':
        return await fetchWorstSalesByCommission(client, company);
      case 'outstanding_commission':
        return await fetchOutstandingCommission(client, company);
      case 'paid_commission':
        return await fetchPaidCommission(client, company);
      case 'highest_stock_items':
        return await fetchHighestStockItems(client, company);
      case 'lowest_stock_items':
        return await fetchLowestStockItems(client, company);
      case 'most_purchased_items':
        return await fetchMostPurchasedItems(client, company);
      case 'top_suppliers_by_frequency':
        return await fetchTopSuppliersByFrequency(client, company);
      case 'paid_suppliers':
        return await fetchPaidSuppliersFixed(client, company);
      case 'unpaid_suppliers':
        return await fetchUnpaidSuppliers(client, company);
      default:
        throw new Error(`Unhandled analytics type: ${type}`);
    }
  } catch (error) {
    console.error(`[fetchAnalyticsData] Error fetching ${type}:`, error);
    // Re-throw to be caught by outer try-catch
    throw error;
  }
}
