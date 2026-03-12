import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '@/utils/erp-error';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/purchase/purchase-return/[name]/submit
 * Submit draft purchase return (change docstatus from 0 to 1)
 * Requirements: 12.5
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
        { success: false, message: 'Nama Retur Pembelian diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Submit the Purchase Return using client method
    const result = await client.submit('Purchase Receipt', name) as any;
    
    const returnData = result.docs?.[0] || result.doc || result.data || result;
    return NextResponse.json({ 
      success: true, 
      data: returnData, 
      message: 'Retur Pembelian berhasil diajukan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/purchase/purchase-return/[name]/submit', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal mengajukan Retur Pembelian')
      : 'Internal server error';
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
