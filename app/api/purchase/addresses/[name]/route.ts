import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

type ParamsInput = { params: { name: string } | Promise<{ name: string }> };

async function resolveName(params: ParamsInput['params']): Promise<string> {
  if (params && typeof (params as any).then === 'function') {
    const resolved = await (params as Promise<{ name: string }>);
    return resolved.name;
  }
  return (params as { name: string }).name;
}

export async function GET(request: NextRequest, { params }: ParamsInput) {
  try {
    const name = await resolveName(params);
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

    const url = `${ERPNEXT_API_URL}/api/resource/Address/${name}`;
    let resp = await fetch(url, { method: 'GET', headers });
    let data = await resp.json();

    if (resp.ok && data.data) {
      return NextResponse.json({ success: true, data: data.data });
    }

    // fallback: search by address_title
    try {
      const searchUrl = `${ERPNEXT_API_URL}/api/resource/Address?fields=["name","address_title","address_line1","city"]&filters=${encodeURIComponent(JSON.stringify([["address_title","=",name]]))}&limit_page_length=1`;
      const searchResp = await fetch(searchUrl, { method: 'GET', headers });
      const searchData = await searchResp.json();
      if (searchResp.ok && Array.isArray(searchData.data) && searchData.data.length > 0) {
        const actualName = searchData.data[0].name;
        const detailUrl = `${ERPNEXT_API_URL}/api/resource/Address/${actualName}`;
        resp = await fetch(detailUrl, { method: 'GET', headers });
        data = await resp.json();
        if (resp.ok && data.data) {
          return NextResponse.json({ success: true, data: data.data });
        }
      }
    } catch (err) {
      console.error('Address detail fallback error:', err);
    }

    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to fetch address detail' },
      { status: resp.status }
    );
  } catch (error) {
    console.error('Address detail GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
