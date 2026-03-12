import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '@/utils/erp-error';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/purchase/debit-note/[name]/submit
 * Submit draft debit note (change docstatus from 0 to 1)
 * Requirements: 13.5
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
    
    // Submit the Debit Note using client method
    const result = await client.submit('Purchase Invoice', name) as any;
    
    const debitNoteData = result.docs?.[0] || result.doc || result.data || result;
    return NextResponse.json({ 
      success: true, 
      data: debitNoteData, 
      message: 'Debit Memo berhasil diajukan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/purchase/debit-note/[name]/submit', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal mengajukan Debit Memo')
      : 'Internal server error';
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
