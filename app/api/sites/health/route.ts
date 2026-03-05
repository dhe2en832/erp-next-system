import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sites/health
 * 
 * Checks site health from server-side (no CORS issues)
 * 
 * Request body:
 * {
 *   "sites": [
 *     { "id": "demo-batasku", "apiUrl": "https://demo.batasku.cloud" }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "results": [
 *     {
 *       "siteId": "demo-batasku",
 *       "isOnline": true,
 *       "responseTime": 123
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sites } = body;

    if (!sites || !Array.isArray(sites)) {
      return NextResponse.json(
        {
          error: 'Missing or invalid sites array',
        },
        { status: 400 }
      );
    }

    // Check all sites in parallel
    const results = await Promise.all(
      sites.map(async (site: { id: string; apiUrl: string }) => {
        const startTime = Date.now();

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${site.apiUrl}/api/method/ping`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseTime = Date.now() - startTime;

          return {
            siteId: site.id,
            isOnline: response.ok,
            responseTime,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;

          return {
            siteId: site.id,
            isOnline: false,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          };
        }
      })
    );

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error('[Health Check API] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
