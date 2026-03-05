import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/sales/delivery-note-return/[name]/submit
 * Submit delivery note return (changes docstatus from 0 to 1)
 * 
 * This triggers:
 * - Inventory updates (stock increases for returned items)
 * - Stock ledger entries
 * - Return validation hooks
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5, 9.7
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

    // First, verify document exists and is in Draft status
    const currentDoc = await client.get('Delivery Note', name);
    
    if (!currentDoc.is_return) {
      return NextResponse.json(
        { success: false, message: 'This is not a return document' },
        { status: 400 }
      );
    }
    
    if (currentDoc.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Only Draft documents can be submitted' },
        { status: 400 }
      );
    }

    // Submit the document
    const submittedDoc = await client.submit('Delivery Note', name);
    
    // Transform response to match frontend expectations
    return NextResponse.json({
      success: true,
      data: {
        ...submittedDoc,
        status: 'Submitted',
        delivery_note: submittedDoc.return_against,
        custom_notes: submittedDoc.return_notes,
      },
      message: 'Return submitted successfully. Stock has been updated.',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/delivery-note-return/[name]/submit', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
