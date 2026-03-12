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
      const params: Record<string, unknown> = { company };
      if (supplier) {
        params.supplier = supplier;
      }
      
      interface CustomResponse {
        message?: {
          data?: Record<string, unknown>[];
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }
      const data = await client.call<CustomResponse>('fetch_po_list_for_pr', params);
      
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
    } catch {
      // Fallback to standard ERPNext API
    }

    // Build filters array
    const filters: (string | number | boolean | null | string[])[][] = [
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Partially Delivered"]] // Not fully delivered
    ];

    // Add supplier filter if provided
    if (supplier) {
      filters.push(["supplier", "=", supplier]);
    }
    
    interface POData {
      name: string;
      supplier: string;
      supplier_name: string;
      transaction_date: string;
      company: string;
      grand_total: number;
      status: string;
      per_received: number;
      [key: string]: unknown;
    }
    const orders = await client.getList<POData>('Purchase Order', {
      fields: ['name', 'supplier', 'supplier_name', 'transaction_date', 'company', 'grand_total', 'status', 'per_received'],
      filters,
      order_by: 'transaction_date desc',
      limit_page_length: 100
    });

    // Filter out POs that are already fully received (per_received >= 100)
    const filteredPOs = orders.filter((po: POData) => {
      const perReceived = po.per_received || 0;
      return perReceived < 100;
    });

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: filteredPOs.map((po: POData) => ({
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
