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

    // Fetch selling price lists only
    const url = `${ERPNEXT_API_URL}/api/resource/Price List?fields=["name"]&filters=${encodeURIComponent(JSON.stringify([["selling","=",1]]))}&limit_page_length=None`;
    const resp = await fetch(url, { method: 'GET', headers });
    const data = await resp.json();

    if (resp.ok && Array.isArray(data.data)) {
      const lists = data.data.map((p: any) => p.name).filter(Boolean);
      return NextResponse.json({ success: true, data: lists });
    }

    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to fetch price lists' },
      { status: resp.status }
    );
  } catch (error) {
    console.error('Price lists GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
