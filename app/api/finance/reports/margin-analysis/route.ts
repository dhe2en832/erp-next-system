import { NextRequest, NextResponse } from 'next/server';
import { validateDateRange } from '@/utils/report-validation';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

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

    // Validate date range
    const dateValidation = validateDateRange(from_date, to_date);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Fetch purchase invoice items for avg buy price
    const piFilters: any[][] = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) piFilters.push(['posting_date', '>=', from_date]);
    if (to_date) piFilters.push(['posting_date', '<=', to_date]);

    const piData = await client.getList('Purchase Invoice', {
      fields: ['name', 'posting_date'],
      filters: piFilters,
      limit_page_length: 500
    });

    // Fetch sales invoice items for avg sell price
    const siFilters: any[][] = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) siFilters.push(['posting_date', '>=', from_date]);
    if (to_date) siFilters.push(['posting_date', '<=', to_date]);

    const siData = await client.getList('Sales Invoice', {
      fields: ['name', 'posting_date'],
      filters: siFilters,
      limit_page_length: 500
    });

    // Aggregate by item
    const itemMap = new Map<string, { item_code: string; item_name: string; buy_total: number; buy_qty: number; sell_total: number; sell_qty: number }>();

    // Process purchase items
    for (const pi of (piData || [])) {
      const itemsData = await client.get('Purchase Invoice', pi.name);
      
      for (const item of (itemsData.items || [])) {
        if (!itemMap.has(item.item_code)) {
          itemMap.set(item.item_code, { item_code: item.item_code, item_name: item.item_name || item.item_code, buy_total: 0, buy_qty: 0, sell_total: 0, sell_qty: 0 });
        }
        const entry = itemMap.get(item.item_code)!;
        entry.buy_total += (item.amount || 0);
        entry.buy_qty += (item.qty || 0);
      }
    }

    // Process sales items
    for (const si of (siData || [])) {
      const itemsData = await client.get('Sales Invoice', si.name);
      
      for (const item of (itemsData.items || [])) {
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
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/margin-analysis', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
