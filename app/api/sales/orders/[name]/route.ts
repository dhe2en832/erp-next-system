import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter - be more specific
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Order name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Invalid order name provided' },
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
    
    // Use ERPNext's form.load.getdoc method to get full document with child tables
    interface RefreshedDoc {
      docs?: Record<string, unknown>[];
      doc?: Record<string, unknown>;
      [key: string]: unknown;
    }
    const orderData = await client.call<RefreshedDoc>('frappe.desk.form.load.getdoc', {
      doctype: 'Sales Order',
      name: name.trim()
    });

    // form.load.getdoc returns data in different structure
    // The actual document data is in docs or doc
    const order = orderData.docs?.[0] || orderData.doc || orderData;

    return NextResponse.json({
      success: true,
      data: order,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/sales/orders/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
