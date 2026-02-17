'use server';

import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'No authentication available' }, { status: 401 });
    }

    const limit = 500;
    const url = `${ERPNEXT_API_URL}/api/resource/Supplier Group?fields=["name"]&limit_page_length=${limit}`;

    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok && Array.isArray(data.data)) {
      const groups = data.data.map((g: any) => g.name).filter(Boolean);
      return NextResponse.json({ success: true, data: groups });
    }

    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to fetch supplier groups' },
      { status: response.status }
    );
  } catch (error) {
    console.error('Supplier Groups API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
