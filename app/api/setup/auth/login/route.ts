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
    const { usr, pwd } = await request.json();

    let loginId = usr;

    // Check if usr is a username (not email and not Administrator)
    if (usr !== 'Administrator' && !usr.includes('@')) {
      try {
        // Get site-aware client for user lookup
        const client = await getERPNextClientForRequest(request);
        
        // Look up email by username - use frappe.client.get_list to bypass permission check
        const usersResult = await client.call('frappe.client.get_list', {
          doctype: 'User',
          fields: ['name', 'email', 'username'],
          filters: [['username', '=', usr]]
        });
        
        const users = usersResult?.data || usersResult || [];

        if (users && users.length > 0) {
          loginId = users[0].email || users[0].name;
        }
      } catch (lookupError) {
        // Continue with original usr if lookup fails
        console.error('User lookup failed:', lookupError);
      }
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Determine API URL based on site
    const apiUrl = siteId 
      ? `https://${siteId.replace(/-/g, '.')}`
      : (process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000');

    // Step 1: Login to ERPNext using direct fetch to capture session cookie
    const loginResponse = await fetch(`${apiUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr: loginId,
        pwd
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(errorData?.message || errorData?.exc || 'Login failed');
    }

    const loginData = await loginResponse.json();
    
    // Extract session cookie from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    let sessionId: string | null = null;
    
    if (setCookieHeader) {
      const sidMatch = setCookieHeader.match(/sid=([^;]+)/);
      if (sidMatch) {
        sessionId = sidMatch[1];
      }
    }

    // Step 2: Get user's allowed companies
    const companies = await client.getList('Company', {
      fields: ['name', 'company_name', 'country', 'abbr'],
      limit_page_length: 100
    });

    // Step 3: Fetch roles using session cookie to get actual user
    let roles: string[] = [];
    let actualUserId = loginId;
    
    if (sessionId) {
      try {
        // Use session cookie to get actual logged-in user
        const whoamiResponse = await fetch(`${apiUrl}/api/method/frappe.auth.get_logged_user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sid=${sessionId}`,
          },
          body: JSON.stringify({}),
        });
        
        if (whoamiResponse.ok) {
          const whoamiData = await whoamiResponse.json();
          actualUserId = whoamiData.message || whoamiData;
        }
      } catch (err) {
        console.error('Failed to get logged user with session', err);
      }
    }
    
    try {
      const userData = await client.get('User', actualUserId);
      roles = (userData.roles || []).map((r: any) => r.role);
    } catch (err) {
      console.error('Failed to fetch roles during login', err);
    }

    // Step 4: Return login success with companies and roles
    const response = NextResponse.json({
      success: true,
      message: loginData.message,
      full_name: loginData.full_name,
      home_page: loginData.home_page,
      companies: companies,
      needs_company_selection: companies.length >= 1,
      roles: roles,
    });
    
    // Set site-specific session cookie if we got one from ERPNext
    if (sessionId && siteId) {
      const cookieName = `sid_${siteId}`;
      response.cookies.set(cookieName, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800, // 7 days
      });
      console.log(`[Login] Set session cookie: ${cookieName}`);
    } else if (sessionId) {
      // Fallback to generic sid if no siteId (backward compatibility)
      response.cookies.set('sid', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800, // 7 days
      });
      console.log('[Login] Set generic session cookie (no siteId)');
    }
    
    return response;

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/auth/login', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
