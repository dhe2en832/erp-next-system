import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getHeaders(): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiSecret) {
    h['Authorization'] = `token ${apiKey}:${apiSecret}`;
  }
  return h;
}

export async function GET(request: NextRequest) {
  try {
    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const company = request.cookies.get('selected_company')?.value || '';
    const headers = getHeaders();

    const cf = company ? JSON.stringify([['company', '=', company]]) : '[]';
    const cfAnd = (extra: [string, string, string][]) =>
      company
        ? JSON.stringify([['company', '=', company], ...extra])
        : JSON.stringify(extra);

    const safeJson = async (res: Response) => {
      try { return await res.json(); } catch { return { data: [] }; }
    };

    const q = (path: string, filters: string, fields: string, limit = 500) =>
      fetch(
        `${ERPNEXT_API_URL}/api/resource/${path}?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=${limit}`,
        { headers }
      );

    // Run all queries in parallel
    const [
      itemsRes,
      soAllRes,
      soPendingRes,
      siAllRes,
      siOutstandingRes,
      payRes,
      poAllRes,
      poPendingRes,
      monthlySalesRes,
    ] = await Promise.all([
      q('Item', '[]', '["name"]', 1000),
      q('Sales Order', cf, '["name"]'),
      q('Sales Order', cfAnd([['status', 'in', 'Draft,To Deliver and Bill,To Bill,To Deliver']]), '["name"]'),
      q('Sales Invoice', cf, '["name"]'),
      q('Sales Invoice', cfAnd([['outstanding_amount', '>', '0'], ['docstatus', '=', '1']]), '["name","outstanding_amount"]'),
      q('Payment Entry', cfAnd([['docstatus', '=', '1']]), '["name"]'),
      q('Purchase Order', cf, '["name"]'),
      q('Purchase Order', cfAnd([['status', 'in', 'Draft,To Receive and Bill,To Bill,To Receive']]), '["name"]'),
      // Monthly sales: last 6 months of submitted invoices
      q('Sales Invoice', cfAnd([['docstatus', '=', '1']]), '["name","posting_date","grand_total"]', 2000),
    ]);

    const [
      itemsData,
      soAllData,
      soPendingData,
      siAllData,
      siOutstandingData,
      payData,
      poAllData,
      poPendingData,
      monthlySalesData,
    ] = await Promise.all([
      safeJson(itemsRes),
      safeJson(soAllRes),
      safeJson(soPendingRes),
      safeJson(siAllRes),
      safeJson(siOutstandingRes),
      safeJson(payRes),
      safeJson(poAllRes),
      safeJson(poPendingRes),
      safeJson(monthlySalesRes),
    ]);

    // Calculate outstanding amount
    const outstandingAmount = (siOutstandingData.data || []).reduce(
      (sum: number, inv: { outstanding_amount?: number }) => sum + (inv.outstanding_amount || 0),
      0
    );

    // Build monthly sales for last 6 months
    const now = new Date();
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }

    (monthlySalesData.data || []).forEach((inv: { posting_date?: string; grand_total?: number }) => {
      if (!inv.posting_date) return;
      const key = inv.posting_date.substring(0, 7);
      if (key in monthlyMap) {
        monthlyMap[key] += inv.grand_total || 0;
      }
    });

    const monthly_sales = Object.entries(monthlyMap).map(([month, total]) => ({ month, total }));

    return NextResponse.json({
      success: true,
      data: {
        total_items: itemsData.data?.length || 0,
        total_sales_orders: soAllData.data?.length || 0,
        pending_orders: soPendingData.data?.length || 0,
        total_invoices: siAllData.data?.length || 0,
        outstanding_invoices: siOutstandingData.data?.length || 0,
        outstanding_amount: outstandingAmount,
        total_payments: payData.data?.length || 0,
        total_purchase_orders: poAllData.data?.length || 0,
        pending_purchase_orders: poPendingData.data?.length || 0,
        monthly_sales,
      },
    });
  } catch (error: unknown) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
