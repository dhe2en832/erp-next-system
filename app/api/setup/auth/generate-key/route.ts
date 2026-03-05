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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Step 1: Login to ERPNext
    await client.call('login', {
      usr,
      pwd
    });

    // Step 2: Generate API Key using frappe method
    const apiKeyData = await client.call('frappe.generate_api_keys', {
      user: usr
    });

    // Step 3: Get the generated API keys from user document
    const userData = await client.get('User', usr);
    
    const apiCredentials = {
      api_key: userData.api_key,
      api_secret: userData.api_secret,
    };

    return NextResponse.json({
      success: true,
      message: 'API Key generation attempted',
      api_credentials: apiCredentials,
      generation_response: apiKeyData,
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/auth/generate-key', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
