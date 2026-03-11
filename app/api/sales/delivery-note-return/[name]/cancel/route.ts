import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/sales/delivery-note-return/[name]/cancel
 * Cancel delivery note return (changes docstatus from 1 to 2)
 * 
 * This triggers:
 * - Inventory reversal (stock decreases for cancelled returns)
 * - Stock ledger entry cancellation
 * - Return cancellation hooks
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.6, 9.7
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // First, verify document exists and is in Submitted status
    const currentDoc = await client.get('Delivery Note', name) as any;
    
    if (!currentDoc.is_return) {
      return NextResponse.json(
        { success: false, message: 'This is not a return document' },
        { status: 400 }
      );
    }
    
    if (currentDoc.docstatus !== 1) {
      return NextResponse.json(
        { success: false, message: 'Only Submitted documents can be cancelled' },
        { status: 400 }
      );
    }

    // Cancel the document
    const cancelledDoc = await client.cancel('Delivery Note', name);
    
    // Transform response to match frontend expectations
    return NextResponse.json({
      success: true,
      data: {
        ...cancelledDoc,
        status: 'Cancelled',
        delivery_note: cancelledDoc.return_against,
        custom_notes: cancelledDoc.return_notes,
      },
      message: 'Return cancelled successfully. Stock adjustments have been reversed.',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/delivery-note-return/[name]/cancel', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
