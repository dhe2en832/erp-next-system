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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Purchase receipt name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Invalid purchase receipt name provided' },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use ERPNext's form.load.getdoc method to get full document with child tables
    interface ReceiptData {
      docs?: Record<string, unknown>[];
      doc?: Record<string, unknown>;
      [key: string]: unknown;
    }
    const receiptData = await client.call<ReceiptData>('frappe.desk.form.load.getdoc', {
      doctype: 'Purchase Receipt',
      name: name.trim()
    });

    // form.load.getdoc returns data in different structure
    const receipt = receiptData.docs?.[0] || receiptData.doc || receiptData;

    return NextResponse.json({
      success: true,
      data: receipt,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/purchase/receipts/[name]', siteId);
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
        { success: false, message: 'Purchase receipt name is required' },
        { status: 400 }
      );
    }
    
    const purchaseReceiptData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedReceipt = await client.update('Purchase Receipt', name.trim(), purchaseReceiptData);

    return NextResponse.json({
      success: true,
      data: updatedReceipt,
      message: 'Purchase Receipt berhasil diupdate'
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/receipts/[name]', siteId);
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
        { success: false, message: 'Purchase receipt name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.delete method
    await client.delete('Purchase Receipt', name.trim());

    return NextResponse.json({
      success: true,
      message: 'Purchase Receipt berhasil dihapus'
    });

  } catch (error) {
    logSiteError(error, 'DELETE /api/purchase/receipts/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
