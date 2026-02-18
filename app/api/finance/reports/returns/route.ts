import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company required' }, { status: 400 });
    }

    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    if (_ak && _as) { _h['Authorization'] = `token ${_ak}:${_as}`; } else { _h['Cookie'] = `sid=${sid}`; }

    // Sales Returns
    const srFilters = [['company', '=', company], ['is_return', '=', 1], ['docstatus', '=', 1]];
    if (from_date) srFilters.push(['posting_date', '>=', from_date]);
    if (to_date) srFilters.push(['posting_date', '<=', to_date]);

    const srUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","posting_date","customer","customer_name","grand_total","return_against"]&filters=${encodeURIComponent(JSON.stringify(srFilters))}&order_by=posting_date desc&limit_page_length=100`;
    const srResp = await fetch(srUrl, { headers: _h });
    const srData = await srResp.json();

    // Purchase Returns
    const prFilters = [['company', '=', company], ['is_return', '=', 1], ['docstatus', '=', 1]];
    if (from_date) prFilters.push(['posting_date', '>=', from_date]);
    if (to_date) prFilters.push(['posting_date', '<=', to_date]);

    const prUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","posting_date","supplier","supplier_name","grand_total","return_against"]&filters=${encodeURIComponent(JSON.stringify(prFilters))}&order_by=posting_date desc&limit_page_length=100`;
    const prResp = await fetch(prUrl, { headers: _h });
    const prData = await prResp.json();

    const results = {
      sales_returns: (srData.data || []).map((r: any) => ({ ...r, type: 'Retur Penjualan' })),
      purchase_returns: (prData.data || []).map((r: any) => ({ ...r, type: 'Retur Pembelian' }))
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Returns API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
