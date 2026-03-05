import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/sales/delivery-note-return/[name]
 * Get delivery note return details
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.7
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use getDoc method for complete data with child tables
    const doc = await client.getDoc('Delivery Note', name);
    
    // Verify this is a return document
    if (!doc.is_return) {
      return NextResponse.json(
        { success: false, message: 'This is not a return document' },
        { status: 400 }
      );
    }
    
    // Transform to match frontend expectations
    const transformedDoc = {
      ...doc,
      delivery_note: doc.return_against,
      status: doc.docstatus === 0 ? 'Draft' : doc.docstatus === 1 ? 'Submitted' : 'Cancelled',
      custom_notes: doc.return_notes,
    };
    
    return NextResponse.json({
      success: true,
      data: transformedDoc,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/delivery-note-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/sales/delivery-note-return/[name]
 * Update delivery note return (only Draft status)
 * 
 * Requirements: 9.4, 9.7
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const updateData = await request.json();
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // First, get current document to check status
    const currentDoc = await client.get('Delivery Note', name);
    
    if (currentDoc.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Only Draft documents can be updated' },
        { status: 400 }
      );
    }

    // Transform update data
    const deliveryNoteUpdate = {
      ...updateData,
      return_notes: updateData.return_notes || updateData.custom_notes,
    };
    
    // Make quantities negative for returns
    if (deliveryNoteUpdate.items) {
      deliveryNoteUpdate.items = deliveryNoteUpdate.items.map((item: any) => ({
        ...item,
        qty: -Math.abs(item.qty),
      }));
    }

    const data = await client.update('Delivery Note', name, deliveryNoteUpdate);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/sales/delivery-note-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
