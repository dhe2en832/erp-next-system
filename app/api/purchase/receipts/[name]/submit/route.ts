import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';
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
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Purchase Receipt name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Submit the Purchase Receipt using client method
    const result = await client.submit('Purchase Receipt', name);
    
    const receiptData = result.docs?.[0] || result.doc || result.data || result;
    return NextResponse.json({ 
      success: true, 
      data: receiptData, 
      message: 'Purchase Receipt berhasil diajukan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/purchase/receipts/[name]/submit', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal mengajukan Purchase Receipt')
      : 'Internal server error';
    
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
