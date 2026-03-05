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

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama surat jalan diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Fetch full delivery note with items using form.load.getdoc
    const result = await client.call('frappe.desk.form.load.getdoc', {
      doctype: 'Delivery Note',
      name: name,
    });

    if (result.message && result.message.docs && result.message.docs.length > 0) {
      const deliveryNote = result.message.docs[0];

      return NextResponse.json({
        success: true,
        data: deliveryNote,
      });
    } else {
      // Fallback: Try using resource API with fields parameter to include child tables
      const deliveryNote = await client.get('Delivery Note', name);
      
      return NextResponse.json({
        success: true,
        data: deliveryNote,
      });
    }

  } catch (error) {
    logSiteError(error, 'GET /api/sales/delivery-notes/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
