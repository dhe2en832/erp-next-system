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
    const supplier = searchParams.get('supplier');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Try ERPNext custom method first
    try {
      const params: any = { company };
      if (supplier) {
        params.supplier = supplier;
      }
      
      const data = await client.call('fetch_po_list_for_pr', params);
      
      // Add debug info to response
      const debuggedData = {
        ...data,
        debug: {
          method: 'custom',
          source: 'fetch_po_list_for_pr',
          items_count: data.message?.data?.length || 0,
          supplier_filter: supplier || 'none'
        }
      };
      
      return NextResponse.json(debuggedData);
    } catch (customMethodError) {
      // Fallback to standard ERPNext API
    }

    // Build filters array
    const filters: any[][] = [
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Partially Delivered"]] // Not fully delivered
    ];

    // Add supplier filter if provided
    if (supplier) {
      filters.push(["supplier", "=", supplier]);
    }
    
    const orders = await client.getList('Purchase Order', {
      fields: ['name', 'supplier', 'supplier_name', 'transaction_date', 'company', 'grand_total', 'status', 'per_received'],
      filters,
      order_by: 'transaction_date desc',
      limit_page_length: 100
    });

    // Filter out POs that are already fully received (per_received >= 100)
    const filteredPOs = orders.filter((po: any) => {
      const perReceived = po.per_received || 0;
      return perReceived < 100;
    });

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: filteredPOs.map((po: any) => ({
          name: po.name,
          supplier: po.supplier,
          supplier_name: po.supplier_name,
          transaction_date: po.transaction_date,
          company: po.company,
          grand_total: po.grand_total,
          status: po.status,
          per_received: po.per_received || 0
        }))
      }
    };

    // Add debug info to response
    const debuggedData = {
      ...transformedData,
      debug: {
        method: 'standard',
        source: 'standard_api',
        items_count: transformedData.message.data.length,
        filtered_count: filteredPOs.length,
        original_count: orders.length,
        supplier_filter: supplier || 'none'
      }
    };

    return NextResponse.json(debuggedData);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/receipts/list-for-pr', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
