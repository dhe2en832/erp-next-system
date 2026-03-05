import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client (uses API Key authentication)
    const client = await getERPNextClientForRequest(request);

    // Get current logged user id
    const whoamiData = await client.call('frappe.auth.get_logged_user', {});
    const userId = whoamiData.message || whoamiData;

    // If no user logged in, return 401
    if (!userId || userId === 'Guest') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user detail + roles
    const userData = await client.get('User', userId);
    const roles = (userData.roles || []).map((r: any) => r.role);

    return NextResponse.json({
      success: true,
      data: {
        name: userData.name,
        full_name: userData.full_name,
        email: userData.email,
        username: userData.username,
        roles,
        enabled: userData.enabled,
        user_type: userData.user_type,
      },
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/auth/me', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
