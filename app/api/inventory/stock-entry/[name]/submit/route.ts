import { NextRequest, NextResponse } from 'next/server';
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
    const { name: entryName } = await params;

    // console.log('Submitting stock entry:', entryName);

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.submit('Stock Entry', entryName);
    
    // console.log('Submit Stock Entry Response:', {
    //   entryName,
    //   erpNextResponse: data
    // });

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Stock Entry submitted successfully'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/inventory/stock-entry/[name]/submit', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
