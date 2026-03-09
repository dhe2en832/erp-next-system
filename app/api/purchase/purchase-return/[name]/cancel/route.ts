import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '@/utils/erp-error';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/purchase/purchase-return/[name]/cancel
 * Cancel submitted purchase return (change docstatus from 1 to 2)
 * Requirements: 12.6
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
    
    // Cancel the Purchase Return using client method
    const result = await client.cancel('Purchase Receipt', name);
    
    const returnData = result.docs?.[0] || result.doc || result.data || result;
    return NextResponse.json({ 
      success: true, 
      data: returnData, 
      message: 'Retur Pembelian berhasil dibatalkan' 
    });

  } catch (error) {
    logSiteError(error, 'POST /api/purchase/purchase-return/[name]/cancel', siteId);
    
    // Try to parse ERPNext-specific errors
    const errorMessage = error instanceof Error 
      ? parseErpError({ message: error.message }, 'Gagal membatalkan Retur Pembelian')
      : 'Internal server error';
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
