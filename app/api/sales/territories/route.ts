import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const sid = request.cookies.get('sid')?.value;

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'No authentication available' }, { status: 401 });
    }

    const url = `${ERPNEXT_API_URL}/api/resource/Territory?fields=["name"]&limit_page_length=None`;
    const resp = await fetch(url, { method: 'GET', headers });
    const data = await resp.json();

    if (resp.ok && Array.isArray(data.data)) {
      const territories = data.data.map((t: any) => t.name).filter(Boolean);
      return NextResponse.json({ success: true, data: territories });
    }

    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to fetch territories' },
      { status: resp.status }
    );
  } catch (error) {
    console.error('Territories GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
