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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Try ERPNext custom method first
    try {
      const data = await client.call<Record<string, unknown>>('fetch_pr_detail_for_pi', { pr });
      return NextResponse.json(data);
    } catch {
      // Fallback to standard ERPNext API
    }

    // Get Purchase Receipt with items
    const prData = await client.get<Record<string, unknown>>('Purchase Receipt', pr);
    
    // Transform to expected format
    const transformedData = {
      success: true,
      data: {
        name: prData.name as string,
        supplier: prData.supplier as string,
        supplier_name: prData.supplier_name as string,
        posting_date: prData.posting_date as string,
        company: prData.company as string,
        currency: (prData.currency as string) || 'IDR',
        custom_notes_pr: '', // Not available in standard API
        items: ((prData.items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          qty: item.qty as number, // Original PR qty
          received_qty: (item.received_qty as number) || (item.qty as number), // Actual received quantity
          rejected_qty: (item.rejected_qty as number) || 0, // Actual rejected quantity
          accepted_qty: ((item.received_qty as number) || (item.qty as number)) - ((item.rejected_qty as number) || 0), // Calculated accepted
          billed_qty: (item.billed_qty as number) || 0, // Already billed quantity
          outstanding_qty: ((item.received_qty as number) || (item.qty as number)) - ((item.rejected_qty as number) || 0) - ((item.billed_qty as number) || 0), // Available for billing
          uom: (item.uom as string) || 'Nos',
          rate: item.rate as number,
          warehouse: (item.warehouse as string) || 'Stores - EN',
          purchase_receipt: prData.name as string,
          purchase_receipt_item: item.name as string, // This should be the PR item name
          purchase_order: (item.purchase_order as string) || '',
          purchase_order_item: (item.purchase_order_item as string) || ''
        }))
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
