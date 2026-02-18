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

    // Get all HPP GL Entries
    const hppFilters = [['company', '=', company], ['account', 'like', '%HPP%']];
    if (from_date) hppFilters.push(['posting_date', '>=', from_date]);
    if (to_date) hppFilters.push(['posting_date', '<=', to_date]);

    const hppUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no"]&filters=${encodeURIComponent(JSON.stringify(hppFilters))}&order_by=posting_date desc&limit_page_length=500`;
    const hppResp = await fetch(hppUrl, { headers: _h });
    const hppData = await hppResp.json();

    // Get Sales Invoice total for comparison
    const siFilters = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) siFilters.push(['posting_date', '>=', from_date]);
    if (to_date) siFilters.push(['posting_date', '<=', to_date]);

    const siUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["grand_total"]&filters=${encodeURIComponent(JSON.stringify(siFilters))}&limit_page_length=999`;
    const siResp = await fetch(siUrl, { headers: _h });
    const siData = await siResp.json();

    const totalHPP = (hppData.data || []).reduce((sum: number, e: any) => sum + (e.debit || 0) - (e.credit || 0), 0);
    const totalSales = (siData.data || []).reduce((sum: number, si: any) => sum + (si.grand_total || 0), 0);
    const hppPercentage = totalSales > 0 ? (totalHPP / totalSales) * 100 : 0;

    const results = {
      entries: hppData.data || [],
      summary: {
        total_hpp: totalHPP,
        total_sales: totalSales,
        hpp_percentage: hppPercentage,
        warning: hppPercentage > 80 ? 'HPP > 80% dari Sales, margin sangat tipis!' : hppPercentage > 100 ? 'HPP > Sales! Ada masalah!' : null
      }
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('HPP Reconciliation API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
