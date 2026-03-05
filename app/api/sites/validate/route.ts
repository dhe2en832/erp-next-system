import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sites/validate
 * 
 * Validates ERPNext site connection from server-side (no CORS issues)
 * 
 * Request body:
 * {
 *   "siteUrl": "https://demo.batasku.cloud",
 *   "apiKey": "xxx",
 *   "apiSecret": "yyy"
 * }
 * 
 * Response:
 * {
 *   "valid": true,
 *   "message": "Site is accessible"
 * }
 * or
 * {
 *   "valid": false,
 *   "message": "Error message"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteUrl, apiKey, apiSecret } = body;

    // Validate input
    if (!siteUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Missing required fields: siteUrl, apiKey, apiSecret',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(siteUrl);
    } catch {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid URL format',
        },
        { status: 400 }
      );
    }

    // Try to ping ERPNext API from server-side (no CORS issues!)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${siteUrl}/api/method/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        return NextResponse.json({
          valid: true,
          message: 'Site is accessible',
          data: data,
        });
      } else {
        // Handle different HTTP status codes
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({
            valid: false,
            message: 'Invalid API Key or Secret',
          });
        } else if (response.status === 404) {
          return NextResponse.json({
            valid: false,
            message: 'Site not found or ping endpoint not available',
          });
        } else {
          return NextResponse.json({
            valid: false,
            message: `Site returned HTTP ${response.status}`,
          });
        }
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json({
            valid: false,
            message: 'Timeout: Site did not respond within 10 seconds',
          });
        } else {
          return NextResponse.json({
            valid: false,
            message: `Network error: ${fetchError.message}`,
          });
        }
      }

      return NextResponse.json({
        valid: false,
        message: 'Unknown error occurred',
      });
    }
  } catch (error) {
    console.error('[Validate Site API] Error:', error);
    
    return NextResponse.json(
      {
        valid: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
