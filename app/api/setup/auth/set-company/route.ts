import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { company } = await request.json();

    const sid = request.cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Set company as session default in ERPNext (optional but recommended)
    try {
      await client.call('frappe.utils.setup_docs.set_session_default', {
        default_company: company
      });
    } catch {
      console.log('Failed to set session default in ERPNext, but continuing...');
    }

    // Store selected company in a secure cookie
    const responseNext = NextResponse.json({
      success: true,
      message: 'Company set successfully',
      company: company,
    });

    responseNext.cookies.set('selected_company', company, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return responseNext;

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/auth/set-company', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
