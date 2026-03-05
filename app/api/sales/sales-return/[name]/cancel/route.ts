import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * POST /api/sales/sales-return/[name]/cancel
 * Cancel a submitted sales return document (change status from Submitted to Cancelled)
 * 
 * This endpoint:
 * 1. Validates the document is in Submitted status
 * 2. Calls ERPNext cancel method (sets docstatus to 2)
 * 3. Triggers inventory reversal (decreases stock quantities)
 * 4. Returns updated document with Cancelled status
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
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Cancel the sales return using client method
    const cancelledDoc = await client.cancel('Sales Return', name);
    
    return NextResponse.json({
      success: true,
      data: cancelledDoc,
      message: 'Sales Return cancelled successfully'
    });
    
  } catch (error) {
    logSiteError(error, 'POST /api/sales/sales-return/[name]/cancel', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
