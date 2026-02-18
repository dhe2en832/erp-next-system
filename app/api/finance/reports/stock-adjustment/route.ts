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

    // Get Stock Entries with purpose = "Material Issue/Receipt/Reconciliation"
    const filters = [
      ['company', '=', company],
      ['docstatus', '=', 1],
      ['purpose', 'in', ['Material Receipt', 'Material Issue', 'Repack', 'Stock Reconciliation']]
    ];
    if (from_date) filters.push(['posting_date', '>=', from_date]);
    if (to_date) filters.push(['posting_date', '<=', to_date]);

    const url = `${ERPNEXT_API_URL}/api/resource/Stock Entry?fields=["name","posting_date","purpose","total_amount","remarks"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=200`;

    const response = await fetch(url, { method: 'GET', headers: _h });
    const data = await response.json();

    if (response.ok) {
      // Get GL Entry for each Stock Entry to see journal impact
      const entries = [];
      for (const se of (data.data || [])) {
        const glFilters = [['voucher_type', '=', 'Stock Entry'], ['voucher_no', '=', se.name]];
        const glUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit"]&filters=${encodeURIComponent(JSON.stringify(glFilters))}&limit_page_length=50`;
        const glResp = await fetch(glUrl, { headers: _h });
        const glData = await glResp.json();

        entries.push({
          ...se,
          gl_entries: glData.data || []
        });
      }

      return NextResponse.json({ success: true, data: entries });
    }

    return NextResponse.json({ success: false, message: 'Failed to fetch stock adjustments' }, { status: response.status });
  } catch (error: any) {
    console.error('Stock Adjustment API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
