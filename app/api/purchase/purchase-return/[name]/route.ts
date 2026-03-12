import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/purchase/purchase-return/[name]
 * Fetch single purchase return details
 * Requirements: 12.3
 */
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
        { success: false, message: 'Nama Retur Pembelian diperlukan' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Nama Retur Pembelian tidak valid' },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use ERPNext's form.load.getdoc method to get full document with child tables
    interface ReturnData {
      docs?: Record<string, unknown>[];
      doc?: Record<string, unknown>;
      [key: string]: unknown;
    }
    const returnData = await client.call<ReturnData>('frappe.desk.form.load.getdoc', {
      doctype: 'Purchase Receipt',
      name: name.trim()
    });

    // form.load.getdoc returns data in different structure
    const purchaseReturn = returnData.docs?.[0] || returnData.doc || returnData;

    return NextResponse.json({
      success: true,
      data: purchaseReturn,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/purchase/purchase-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/purchase/purchase-return/[name]
 * Update draft purchase return
 * Requirements: 12.4
 */
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
        { success: false, message: 'Nama Retur Pembelian diperlukan' },
        { status: 400 }
      );
    }
    
    const purchaseReturnData = await request.json();

    // Validate docstatus - only Draft (0) can be edited
    if (purchaseReturnData.docstatus && purchaseReturnData.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Hanya Retur Pembelian dengan status Draft yang dapat diubah' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedReturn = await client.update('Purchase Receipt', name.trim(), purchaseReturnData);

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: 'Retur Pembelian berhasil diupdate'
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/purchase-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/purchase/purchase-return/[name]
 * Delete draft purchase return
 */
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
        { success: false, message: 'Nama Retur Pembelian diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.delete method
    await client.delete('Purchase Receipt', name.trim());

    return NextResponse.json({
      success: true,
      message: 'Retur Pembelian berhasil dihapus'
    });

  } catch (error) {
    logSiteError(error, 'DELETE /api/purchase/purchase-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
