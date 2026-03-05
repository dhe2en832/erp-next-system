import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pr: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // For Next.js 16 app router, params is a Promise
    const resolvedParams = await params;
    const { pr } = resolvedParams;

    if (!pr) {
      return NextResponse.json(
        { success: false, message: 'Purchase Receipt name is required' },
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
      const data = await client.call('fetch_pr_detail_for_pi', { pr });
      return NextResponse.json(data);
    } catch (customMethodError) {
      // Fallback to standard ERPNext API
    }

    // Get Purchase Receipt with items
    const prData = await client.get('Purchase Receipt', pr);
    
    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: {
          name: prData.name,
          supplier: prData.supplier,
          supplier_name: prData.supplier_name,
          posting_date: prData.posting_date,
          company: prData.company,
          currency: prData.currency || 'IDR',
          custom_notes_pr: '', // Not available in standard API
          items: (prData.items || []).map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.qty, // Original PR qty
            received_qty: item.received_qty || item.qty, // Actual received quantity
            rejected_qty: item.rejected_qty || 0, // Actual rejected quantity
            accepted_qty: (item.received_qty || item.qty) - (item.rejected_qty || 0), // Calculated accepted
            billed_qty: item.billed_qty || 0, // Already billed quantity
            outstanding_qty: (item.received_qty || item.qty) - (item.rejected_qty || 0) - (item.billed_qty || 0), // Available for billing
            uom: item.uom || 'Nos',
            rate: item.rate,
            warehouse: item.warehouse || 'Stores - EN',
            purchase_receipt: prData.name,
            purchase_receipt_item: item.name, // This should be the PR item name
            purchase_order: item.purchase_order || '',
            purchase_order_item: item.purchase_order_item || ''
          }))
        }
      }
    };

    return NextResponse.json(transformedData);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/receipts/detail-for-pi/[pr]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
