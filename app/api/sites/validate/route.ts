import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sites/validate
 * 
 * Validates site connection from server-side (no CORS issues)
 */
export async function POST(request: NextRequest) {
  try {
    const { apiUrl, apiKey, apiSecret } = await request.json();

    if (!apiUrl || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing site credentials' }, { status: 400 });
    }

    const url = `${apiUrl}/api/method/ping`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return NextResponse.json({
      valid: response.ok,
      status: response.status,
      statusText: response.statusText,
      message: response.ok ? 'Connection successful' : `Connection failed: ${response.statusText}`
    });
  } catch (error) {
    return NextResponse.json({ 
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      message: error instanceof Error ? error.message : 'Connection failed' 
    }, { status: 500 });
  }
}
