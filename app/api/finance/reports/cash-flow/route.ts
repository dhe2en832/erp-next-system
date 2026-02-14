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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch GL Entries for Cash/Bank accounts
    const fields = ['account', 'posting_date', 'debit', 'credit', 'voucher_type', 'voucher_no'];
    const filters: string[][] = [
      ['company', '=', company],
      ['account', 'like', '%Kas%'],
    ];

    if (fromDate) filters.push(['posting_date', '>=', fromDate]);
    if (toDate) filters.push(['posting_date', '<=', toDate]);

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=500`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      // Also try to fetch Bank account entries
      const bankFilters: string[][] = [
        ['company', '=', company],
        ['account', 'like', '%Bank%'],
      ];
      if (fromDate) bankFilters.push(['posting_date', '>=', fromDate]);
      if (toDate) bankFilters.push(['posting_date', '<=', toDate]);

      const bankUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(bankFilters))}&order_by=posting_date desc&limit_page_length=500`;

      let bankEntries: any[] = [];
      try {
        const bankResponse = await fetch(bankUrl, { method: 'GET', headers });
        if (bankResponse.ok) {
          const bankData = await bankResponse.json();
          bankEntries = bankData.data || [];
        }
      } catch {
        // Continue without bank entries
      }

      const allEntries = [...(data.data || []), ...bankEntries].sort((a, b) =>
        new Date(b.posting_date).getTime() - new Date(a.posting_date).getTime()
      );

      return NextResponse.json({ success: true, data: allEntries });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch cash flow data' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Cash Flow Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
