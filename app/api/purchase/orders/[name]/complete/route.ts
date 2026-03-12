import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Complete the purchase order by updating docstatus and action
    interface UpdateResult {
      docs?: Record<string, unknown>[];
      doc?: Record<string, unknown>;
      data?: Record<string, unknown>;
      [key: string]: unknown;
    }
    const data = await client.update<UpdateResult>('Purchase Order', name, {
      docstatus: 1, // Submit document
      action: 'complete',
    });

    const orderData = data.docs?.[0] || data.doc || data.data || data;
    
    return NextResponse.json({
      success: true,
      data: orderData,
      message: 'Purchase Order berhasil di complete'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/orders/[name]/complete', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
