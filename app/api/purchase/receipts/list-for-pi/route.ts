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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Try ERPNext custom method first
    try {
      const data = await client.call<Record<string, unknown>>('fetch_pr_list_for_pi', { company });
      
      // client.call() already returns normalized {success, data} structure
      // Just pass it through
      return NextResponse.json(data);
    } catch {
      // Fallback to standard ERPNext API
    }

    // Get submitted Purchase Receipts that can be billed
    const filters: (string | number | boolean | null | string[])[][] = [
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Completed", "To Bill"]]
    ];
    
    interface ReceiptSummary {
      name: string;
      supplier: string;
      supplier_name: string;
      posting_date: string;
      company: string;
      grand_total: number;
      per_billed?: number;
      [key: string]: unknown;
    }
    const receipts = await client.getList<ReceiptSummary>('Purchase Receipt', {
      fields: ['name', 'supplier', 'supplier_name', 'posting_date', 'company', 'grand_total', 'per_billed'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 100
    });

    // Return consistent structure
    return NextResponse.json({
      success: true,
      data: receipts.map((pr: ReceiptSummary) => ({
        name: pr.name,
        supplier: pr.supplier,
        supplier_name: pr.supplier_name,
        posting_date: pr.posting_date,
        company: pr.company,
        grand_total: pr.grand_total,
        per_billed: pr.per_billed || 0
      }))
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/receipts/list-for-pi', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
