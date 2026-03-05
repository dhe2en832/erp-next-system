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
        
        // Look up email by username
        const users = await client.getList('User', {
          fields: ['name', 'email', 'username'],
          filters: [['username', '=', usr]]
        });

        if (users && users.length > 0) {
          loginId = users[0].email || users[0].name;
        }
      } catch (lookupError) {
        // Continue with original usr if lookup fails
      }
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Step 1: Login to ERPNext
    const loginData = await client.call('login', {
      usr: loginId,
      pwd
    });

    // Step 2: Get user's allowed companies
    const companies = await client.getList('Company', {
      fields: ['name', 'company_name', 'country', 'abbr'],
      limit_page_length: 100
    });

    // Step 3: Fetch roles
    let roles: string[] = [];
    try {
      const whoamiData = await client.call('frappe.auth.get_logged_user', {});
      const userId = whoamiData.message || whoamiData;
      
      const userData = await client.get('User', userId);
      roles = (userData.roles || []).map((r: any) => r.role);
    } catch (err) {
      console.error('Failed to fetch roles during login', err);
    }

    // Step 4: Return login success with companies and roles
    return NextResponse.json({
      success: true,
      message: loginData.message,
      full_name: loginData.full_name,
      home_page: loginData.home_page,
      companies: companies,
      needs_company_selection: companies.length >= 1,
      roles: roles,
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/auth/login', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
