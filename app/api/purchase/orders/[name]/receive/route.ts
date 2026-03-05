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

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 401 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Receive the purchase order by updating docstatus and action
    const data = await client.update('Purchase Order', name, {
      docstatus: 1, // Submit document
      action: 'receive',
    });

    const orderData = data.docs?.[0] || data.doc || data.data || data;
    
    return NextResponse.json({
      success: true,
      data: orderData,
      message: 'Purchase Order berhasil di receive'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/orders/[name]/receive', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
