import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * POST /api/sales/sales-return/[name]/submit
 * Submit a sales return document (change status from Draft to Submitted)
 * 
 * This endpoint:
 * 1. Validates the document is in Draft status
 * 2. Calls ERPNext submit method (sets docstatus to 1)
 * 3. Triggers inventory updates (increases stock quantities)
 * 4. Returns updated document with Submitted status
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
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Submit the sales return using client method
    const submittedDoc = await client.submit('Sales Return', name);
    
    return NextResponse.json({
      success: true,
      data: submittedDoc,
      message: 'Sales Return submitted successfully'
    });
    
  } catch (error) {
    logSiteError(error, 'POST /api/sales/sales-return/[name]/submit', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
