import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '@/utils/erp-error';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/purchase/debit-note/[name]/cancel
 * Cancel submitted debit note (change docstatus from 1 to 2)
 * Requirements: 13.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama Debit Memo diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Cancel the Debit Note using client method
    const result = await client.cancel('Purchase Invoice', name) as Record<string, unknown>;
    
    const debitNoteData = (result && typeof result === 'object') 
      ? ((result.docs as unknown[])?.[0] || result.doc || result.data || result)
      : result;
    return NextResponse.json({ 
      success: true, 
      data: debitNoteData, 
      message: 'Debit Memo berhasil dibatalkan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/purchase/debit-note/[name]/cancel', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal membatalkan Debit Memo')
      : 'Internal server error';
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
