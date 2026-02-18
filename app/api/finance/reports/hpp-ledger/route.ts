import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const limit = searchParams.get('limit') || '100';

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

    // Get GL Entries for COGS accounts
    const filters = [
      ['company', '=', company],
      ['account', 'like', '%HPP%']
    ];
    if (from_date) filters.push(['posting_date', '>=', from_date]);
    if (to_date) filters.push(['posting_date', '<=', to_date]);

    const url = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no","remarks"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=debit desc,posting_date desc&limit_page_length=${limit}`;

    const response = await fetch(url, { method: 'GET', headers: _h });
    const data = await response.json();

    if (response.ok) {
      const entries = (data.data || []).map((e: any) => ({
        ...e,
        amount: (e.debit || 0) - (e.credit || 0)
      }));

      return NextResponse.json({
        success: true,
        data: entries,
        total: entries.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0)
      });
    }

    return NextResponse.json({ success: false, message: 'Failed to fetch HPP ledger' }, { status: response.status });
  } catch (error: any) {
    console.error('HPP Ledger API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
