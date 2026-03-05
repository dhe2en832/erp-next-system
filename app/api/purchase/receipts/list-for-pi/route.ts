import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Get session cookie for authentication
    const sid = request.cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Try ERPNext custom method first
    try {
      const data = await client.call('fetch_pr_list_for_pi', { company });
      
      // Add debug info to response
      const debuggedData = {
        ...data,
        debug: {
          method: 'custom',
          source: 'fetch_pr_list_for_pi',
          items_count: data.message?.data?.length || 0
        }
      };
      
      return NextResponse.json(debuggedData);
    } catch (customMethodError) {
      // Fallback to standard ERPNext API
    }

    // Get submitted Purchase Receipts that can be billed
    const filters: any[][] = [
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Completed", "To Bill"]]
    ];
    
    const receipts = await client.getList('Purchase Receipt', {
      fields: ['name', 'supplier', 'supplier_name', 'posting_date', 'company', 'grand_total', 'per_billed'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 100
    });

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: receipts.map((pr: any) => ({
          name: pr.name,
          supplier: pr.supplier,
          supplier_name: pr.supplier_name,
          posting_date: pr.posting_date,
          company: pr.company,
          grand_total: pr.grand_total,
          per_billed: pr.per_billed || 0
        }))
      }
    };

    // Add debug info to response
    const debuggedData = {
      ...transformedData,
      debug: {
        method: 'standard',
        source: 'standard_api',
        items_count: transformedData.message.data.length
      }
    };

    return NextResponse.json(debuggedData);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/receipts/list-for-pi', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
