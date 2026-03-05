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
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use ERPNext's make_delivery_note method
    const data = await client.call('erpnext.stock.doctype.delivery_note.delivery_note.make_delivery_note', {
      source_name: name,
      target_doc: null // Create new delivery note
    });

    // The response should contain the delivery note data
    const deliveryNoteData = data.docs?.[0] || data.doc || data.message || data;
    
    return NextResponse.json({
      success: true,
      data: deliveryNoteData,
      message: 'Delivery Note created successfully from Sales Order'
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/delivery-notes/from-sales-order/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
