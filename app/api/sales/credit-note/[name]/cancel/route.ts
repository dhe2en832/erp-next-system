import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * POST /api/sales/credit-note/[name]/cancel
 * Cancel credit note (changes docstatus from 1 to 2)
 * 
 * This triggers:
 * - GL Entry reversal for accounting transaction
 * - Stock ledger entry cancellation
 * - Reversal of returned_qty in original Sales Invoice
 * - Commission adjustment reversal in original Sales Invoice
 * 
 * Requirements: 3.6, 3.7, 9.8
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
    const currentDoc = await client.get('Sales Invoice', name) as any;
    
    if (!currentDoc.is_return) {
      return NextResponse.json(
        { success: false, message: 'Dokumen ini bukan credit note (return document)' },
        { status: 400 }
      );
    }
    
    if (currentDoc.docstatus !== 1) {
      return NextResponse.json(
        { success: false, message: 'Hanya credit note dengan status Submitted yang dapat dibatalkan' },
        { status: 400 }
      );
    }

    // Validate Accounting Period for posting_date (Requirement 3.7, 9.8)
    try {
      const periods = await client.getList('Accounting Period', {
        fields: ['name', 'period_name', 'status', 'start_date', 'end_date'],
        filters: [
          ['company', '=', currentDoc.company],
          ['start_date', '<=', currentDoc.posting_date],
          ['end_date', '>=', currentDoc.posting_date],
        ],
        limit_page_length: 1
      });

      if (periods && periods.length > 0) {
        const period = periods[0];
        if (period.status === 'Closed' || period.status === 'Permanently Closed') {
          return NextResponse.json(
            { 
              success: false, 
              message: `Tidak dapat membatalkan Credit Note: Periode akuntansi ${period.period_name} sudah ditutup. Silakan pilih tanggal pada periode yang masih terbuka.` 
            },
            { status: 400 }
          );
        }
      }
    } catch (periodError) {
      console.warn('Failed to validate accounting period, continuing:', periodError);
      // Continue without blocking if period check fails
    }

    // Cancel the document using ERPNext's cancel method
    const cancelledDoc = await client.cancel('Sales Invoice', name);
    
    // Transform response to match frontend expectations
    return NextResponse.json({
      success: true,
      data: {
        ...cancelledDoc,
        status: 'Cancelled',
        sales_invoice: cancelledDoc.return_against,
        custom_notes: cancelledDoc.return_notes,
      },
      message: 'Credit Note cancelled successfully. All adjustments have been reversed.',
    });

  } catch (error) {
    logSiteError(error, 'POST /api/sales/credit-note/[name]/cancel', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
