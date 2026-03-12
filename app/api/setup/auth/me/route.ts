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
    // CRITICAL: ONLY use session cookie (sid) for authentication
    // This ensures we get the actual logged-in user, not the API Key owner (Administrator)
    // API Key is used for other operations that require admin privileges, but NOT for user identity
    
    // Try site-specific cookie first, then fallback to generic sid
    const cookieName = siteId ? `sid_${siteId}` : 'sid';
    let sid = request.cookies.get(cookieName)?.value;
    
    // Fallback to generic sid if site-specific not found
    if (!sid && siteId) {
      sid = request.cookies.get('sid')?.value;
    }
    
    if (!sid) {
      console.log(`[/me] No session cookie found (tried: ${cookieName}${siteId ? ', sid' : ''})`);
      return NextResponse.json({ success: false, message: 'Unauthorized - No session' }, { status: 401 });
    }
    
    console.log(`[/me] Using session cookie: ${cookieName}`);
    
    // Determine API URL based on site
    const apiUrl = siteId 
      ? `https://${siteId.replace(/-/g, '.')}`
      : (process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000');

    // Get current logged user id using ONLY session cookie
    const whoamiResponse = await fetch(`${apiUrl}/api/method/frappe.auth.get_logged_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      body: JSON.stringify({}),
    });

    if (!whoamiResponse.ok) {
      return NextResponse.json({ success: false, message: 'Session expired or invalid' }, { status: 401 });
    }

    const whoamiData = await whoamiResponse.json();
    const userId = whoamiData.message || whoamiData;

    // If no user logged in, return 401
    if (!userId || userId === 'Guest') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user detail + roles using API Key (requires admin privilege to read roles)
    // But we use the userId from session cookie to ensure we get the correct user
    const client = await getERPNextClientForRequest(request);
    interface UserDoc {
      name: string;
      full_name?: string;
      email?: string;
      username?: string;
      enabled?: number;
      user_type?: string;
      roles?: { role: string }[];
      [key: string]: unknown;
    }
    const userData = await client.get<UserDoc>('User', userId);
    const roles = (userData.roles || []).map((r: { role: string }) => r.role);

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
