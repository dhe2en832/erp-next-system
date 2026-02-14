import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Terms Template?fields=["name"]&limit_page_length=100&order_by=name`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data || [] });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payment terms' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Payment Terms API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Payment Terms Template`;

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: body }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || data.exc || 'Failed to create payment terms template' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Payment Terms POST API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
