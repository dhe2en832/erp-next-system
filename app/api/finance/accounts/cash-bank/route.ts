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

/**
 * GET /api/finance/accounts/cash-bank?company=CompanyName
 * Returns accounts with account_type Cash or Bank for dropdown selection.
 */
export async function GET(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || '';

    const filters: any[] = [
      ['account_type', 'in', ['Cash', 'Bank']],
      ['is_group', '=', 0],
    ];
    if (company) {
      filters.push(['company', '=', company]);
    }

    const fields = ['name', 'account_name', 'account_type', 'company'];
    const erpUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=100&order_by=account_name`;

    const response = await fetch(erpUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data || [] });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch accounts' },
        { status: response.status }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
