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
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Purchase invoice name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Invalid purchase invoice name provided' },
        { status: 400 }
      );
    }
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    interface InvoiceData {
      docs?: Record<string, unknown>[];
      doc?: Record<string, unknown>;
      [key: string]: unknown;
    }

    // Use ERPNext's form.load.getdoc method to get full document with child tables
    const invoiceData = await client.call<InvoiceData>('frappe.desk.form.load.getdoc', {
      doctype: 'Purchase Invoice',
      name: name.trim()
    });

    // form.load.getdoc returns data in different structure
    const invoice = invoiceData.docs?.[0] || invoiceData.doc || invoiceData;

    return NextResponse.json({
      success: true,
      data: invoice,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/purchase/invoices/[name]', siteId);
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
        { success: false, message: 'Purchase invoice name is required' },
        { status: 400 }
      );
    }
    
    const purchaseInvoiceData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedInvoice = await client.update('Purchase Invoice', name.trim(), purchaseInvoiceData);

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      message: 'Purchase Invoice berhasil diupdate'
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/invoices/[name]', siteId);
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
        { success: false, message: 'Purchase invoice name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.delete method
    await client.delete('Purchase Invoice', name.trim());

    return NextResponse.json({
      success: true,
      message: 'Purchase Invoice berhasil dihapus'
    });

  } catch (error) {
    logSiteError(error, 'DELETE /api/purchase/invoices/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
