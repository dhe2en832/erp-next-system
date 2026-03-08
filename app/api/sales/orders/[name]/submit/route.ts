import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';
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
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Submit the Sales Order (will fetch latest doc automatically)
    const result = await client.submit('Sales Order', name);
    
    const orderData = result.docs?.[0] || result.doc || result.data || result;
    return NextResponse.json({ 
      success: true, 
      data: orderData, 
      message: 'Sales Order berhasil diajukan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/sales/orders/[name]/submit', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal mengajukan Sales Order')
      : 'Internal server error';
    
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
