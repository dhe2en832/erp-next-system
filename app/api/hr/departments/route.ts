import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const fields = ['name', 'department_name'];
    const erpUrl = `${ERPNEXT_API_URL}/api/resource/Department?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=200&order_by=department_name`;
    const response = await fetch(erpUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      const departments = (data.data || []).map((d: any) => d.department_name || d.name).filter(Boolean);
      return NextResponse.json({ success: true, data: departments });
    }

    return NextResponse.json({ success: false, message: data.message || 'Failed to fetch departments' }, { status: response.status });
  } catch (error) {
    console.error('Department API Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
