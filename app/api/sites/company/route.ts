import { NextRequest, NextResponse } from 'next/server';
import { loadSiteCredentials } from '@/lib/site-credentials';
import { SiteConfig } from '@/lib/env-config';

/**
 * POST /api/sites/company
 * 
 * Fetches company name for a site from server-side (no CORS issues)
 */
export async function POST(request: NextRequest) {
  try {
    const { siteId, apiUrl, apiKey, apiSecret } = await request.json();

    if (!apiUrl || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing site credentials' }, { status: 400 });
    }

    // Load credentials from environment if 'env' marker is used
    let finalApiKey = apiKey;
    let finalApiSecret = apiSecret;

    if (apiKey === 'env' || apiSecret === 'env') {
      const credentials = loadSiteCredentials({ 
        id: siteId, 
        apiKey, 
        apiSecret 
      } as SiteConfig);
      finalApiKey = credentials.apiKey;
      finalApiSecret = credentials.apiSecret;
    }

    const url = `${apiUrl}/api/resource/Company?fields=["name","company_name"]&limit_page_length=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${finalApiKey}:${finalApiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return NextResponse.json({
          companyName: data.data[0].company_name || data.data[0].name
        });
      }
    }

    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
