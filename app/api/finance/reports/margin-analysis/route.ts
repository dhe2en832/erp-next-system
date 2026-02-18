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

    // Fetch purchase invoice items for avg buy price
    const piFilters = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) piFilters.push(['posting_date', '>=', from_date]);
    if (to_date) piFilters.push(['posting_date', '<=', to_date]);

    const piUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","posting_date"]&filters=${encodeURIComponent(JSON.stringify(piFilters))}&limit_page_length=500`;
    const piResp = await fetch(piUrl, { headers: _h });
    const piData = await piResp.json();

    // Fetch sales invoice items for avg sell price
    const siFilters = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) siFilters.push(['posting_date', '>=', from_date]);
    if (to_date) siFilters.push(['posting_date', '<=', to_date]);

    const siUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","posting_date"]&filters=${encodeURIComponent(JSON.stringify(siFilters))}&limit_page_length=500`;
    const siResp = await fetch(siUrl, { headers: _h });
    const siData = await siResp.json();

    // Aggregate by item
    const itemMap = new Map<string, { item_code: string; item_name: string; buy_total: number; buy_qty: number; sell_total: number; sell_qty: number }>();

    // Process purchase items
    for (const pi of (piData.data || [])) {
      const itemsUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${pi.name}?fields=["items"]`;
      const itemsResp = await fetch(itemsUrl, { headers: _h });
      const itemsData = await itemsResp.json();
      
      for (const item of (itemsData.data?.items || [])) {
        if (!itemMap.has(item.item_code)) {
          itemMap.set(item.item_code, { item_code: item.item_code, item_name: item.item_name || item.item_code, buy_total: 0, buy_qty: 0, sell_total: 0, sell_qty: 0 });
        }
        const entry = itemMap.get(item.item_code)!;
        entry.buy_total += (item.amount || 0);
        entry.buy_qty += (item.qty || 0);
      }
    }

    // Process sales items
    for (const si of (siData.data || [])) {
      const itemsUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${si.name}?fields=["items"]`;
      const itemsResp = await fetch(itemsUrl, { headers: _h });
      const itemsData = await itemsResp.json();
      
      for (const item of (itemsData.data?.items || [])) {
        if (!itemMap.has(item.item_code)) {
          itemMap.set(item.item_code, { item_code: item.item_code, item_name: item.item_name || item.item_code, buy_total: 0, buy_qty: 0, sell_total: 0, sell_qty: 0 });
        }
        const entry = itemMap.get(item.item_code)!;
        entry.sell_total += (item.amount || 0);
        entry.sell_qty += (item.qty || 0);
      }
    }

    // Calculate margins
    const results = Array.from(itemMap.values()).map(item => {
      const avg_buy = item.buy_qty > 0 ? item.buy_total / item.buy_qty : 0;
      const avg_sell = item.sell_qty > 0 ? item.sell_total / item.sell_qty : 0;
      const margin_per_unit = avg_sell - avg_buy;
      const margin_pct = avg_sell > 0 ? ((margin_per_unit / avg_sell) * 100) : 0;

      return {
        item_code: item.item_code,
        item_name: item.item_name,
        avg_buy_price: avg_buy,
        avg_sell_price: avg_sell,
        margin_per_unit,
        margin_pct,
        buy_qty: item.buy_qty,
        sell_qty: item.sell_qty
      };
    }).sort((a, b) => a.margin_pct - b.margin_pct);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Margin Analysis API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
