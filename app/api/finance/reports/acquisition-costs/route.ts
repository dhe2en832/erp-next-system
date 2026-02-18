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

    // Get GL Entries for "Expenses Included In Asset Valuation" (ongkir masuk HPP)
    const hppFilters = [
      ['company', '=', company],
      ['account', 'like', '%Expenses Included In Asset Valuation%']
    ];
    if (from_date) hppFilters.push(['posting_date', '>=', from_date]);
    if (to_date) hppFilters.push(['posting_date', '<=', to_date]);

    const hppUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no","remarks"]&filters=${encodeURIComponent(JSON.stringify(hppFilters))}&order_by=posting_date desc&limit_page_length=200`;
    const hppResp = await fetch(hppUrl, { headers: _h });
    const hppData = await hppResp.json();

    // Get GL Entries for operational expenses (ongkir NOT in HPP)
    const expFilters = [
      ['company', '=', company],
      ['account', 'like', '%Freight%']
    ];
    if (from_date) expFilters.push(['posting_date', '>=', from_date]);
    if (to_date) expFilters.push(['posting_date', '<=', to_date]);

    const expUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no","remarks"]&filters=${encodeURIComponent(JSON.stringify(expFilters))}&order_by=posting_date desc&limit_page_length=200`;
    const expResp = await fetch(expUrl, { headers: _h });
    const expData = await expResp.json();

    const results = {
      hpp_costs: (hppData.data || []).map((e: any) => ({ ...e, category: 'Masuk HPP', amount: e.debit - e.credit })),
      operational_costs: (expData.data || []).map((e: any) => ({ ...e, category: 'Beban Operasional', amount: e.debit - e.credit }))
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Acquisition Costs API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
