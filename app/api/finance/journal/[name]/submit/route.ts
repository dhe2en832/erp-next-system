import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
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
        { success: false, message: 'Journal Entry name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Submit the journal entry by updating docstatus to 1
    const data = await client.update('Journal Entry', name, {
      docstatus: 1, // 1 = Submitted
    });

    return NextResponse.json({
      success: true,
      data,
      message: `Journal Entry ${name} berhasil disubmit`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/journal/[name]/submit', siteId);
    
    // Try to extract ERPNext error message
    let errorMsg = 'Gagal submit journal entry';
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
