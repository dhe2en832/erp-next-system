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
        { success: false, message: 'Purchase order name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Invalid purchase order name provided' },
        { status: 400 }
      );
    }
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use ERPNext's form.load.getdoc method to get full document with child tables
    const orderData = await client.call('frappe.desk.form.load.getdoc', {
      doctype: 'Purchase Order',
      name: name.trim()
    }) as any;

    // form.load.getdoc returns data in different structure
    // The actual document data is in docs or doc
    const order = orderData.docs?.[0] || orderData.doc || orderData;

    return NextResponse.json({
      success: true,
      data: order,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/purchase/orders/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Purchase order name is required' },
        { status: 400 }
      );
    }
    
    const purchaseOrderData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedOrder = await client.update('Purchase Order', name.trim(), purchaseOrderData);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/orders/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Purchase order name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.delete method
    await client.delete('Purchase Order', name.trim());

    return NextResponse.json({
      success: true,
      message: 'Purchase order deleted successfully',
    });

  } catch (error) {
    logSiteError(error, 'DELETE /api/purchase/orders/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
