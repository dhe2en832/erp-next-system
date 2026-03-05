/**
 * API Route: Get Paid Sales Invoices for Credit Note
 * 
 * Fetches Sales Invoices with status "Paid" for Credit Note creation
 * 
 * Requirements: 1.3, 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * GET /api/sales/credit-note/invoices
 * 
 * Fetch paid Sales Invoices for Credit Note selection
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters from search params
    const filters: any[][] = [];
    
    // Parse filters from searchParams if provided
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        const parsedFilters = JSON.parse(filtersParam);
        if (Array.isArray(parsedFilters)) {
          filters.push(...parsedFilters);
        }
      } catch (e) {
        // Ignore invalid filter JSON
      }
    }
    
    // Parse fields from searchParams
    const fieldsParam = searchParams.get('fields');
    let fields: string[] | undefined;
    if (fieldsParam) {
      try {
        fields = JSON.parse(fieldsParam);
      } catch (e) {
        // Use default fields if parsing fails
      }
    }
    
    // Get limit
    const limit = searchParams.get('limit_page_length') 
      ? parseInt(searchParams.get('limit_page_length')!) 
      : undefined;

    // Fetch invoices using client
    const invoices = await client.getList('Sales Invoice', {
      fields,
      filters: filters.length > 0 ? filters : undefined,
      limit_page_length: limit
    });

    return NextResponse.json({
      success: true,
      data: invoices || [],
    });

  } catch (error) {
    logSiteError(error, 'GET /api/sales/credit-note/invoices', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
