import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const company = request.cookies.get('selected_company')?.value || '';
    
    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Build company filters
    const companyFilter = company ? [['company', '=', company]] : [];
    const buildFilters = (extra: (string | number | boolean | null | string[])[][]) => 
      company ? [['company', '=', company], ...extra] : extra;

    // Run all queries in parallel using client methods
    const [
      items,
      soAll,
      soPending,
      siAll,
      siOutstanding,
      payments,
      poAll,
      poPending,
      monthlySalesInvoices,
    ] = await Promise.all([
      client.getList('Item', { fields: ['name'], limit: 1000 }),
      client.getList('Sales Order', { fields: ['name'], filters: companyFilter, limit: 500 }),
      client.getList('Sales Order', { 
        fields: ['name'], 
        filters: buildFilters([['status', 'in', 'Draft,To Deliver and Bill,To Bill,To Deliver']]),
        limit: 500 
      }),
      client.getList('Sales Invoice', { fields: ['name'], filters: companyFilter, limit: 500 }),
      client.getList('Sales Invoice', { 
        fields: ['name', 'outstanding_amount'], 
        filters: buildFilters([['outstanding_amount', '>', '0'], ['docstatus', '=', '1']]),
        limit: 500 
      }),
      client.getList('Payment Entry', { 
        fields: ['name'], 
        filters: buildFilters([['docstatus', '=', '1']]),
        limit: 500 
      }),
      client.getList('Purchase Order', { fields: ['name'], filters: companyFilter, limit: 500 }),
      client.getList('Purchase Order', { 
        fields: ['name'], 
        filters: buildFilters([['status', 'in', 'Draft,To Receive and Bill,To Bill,To Receive']]),
        limit: 500 
      }),
      client.getList('Sales Invoice', { 
        fields: ['name', 'posting_date', 'grand_total'], 
        filters: buildFilters([['docstatus', '=', '1']]),
        limit: 2000 
      }),
    ]);

    // Calculate outstanding amount
    interface InvoiceSummary {
      outstanding_amount?: number;
      posting_date?: string;
      grand_total?: number;
      [key: string]: unknown;
    }

    const outstandingAmount = ((siOutstanding || []) as InvoiceSummary[]).reduce(
      (sum: number, inv: InvoiceSummary) => sum + (inv.outstanding_amount || 0),
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

    ((monthlySalesInvoices || []) as InvoiceSummary[]).forEach((inv: InvoiceSummary) => {
      if (!inv.posting_date) return;
      const key = inv.posting_date.substring(0, 7);
      if (key in monthlyMap) {
        monthlyMap[key] += (inv.grand_total || 0);
      }
    });

    const monthly_sales = Object.entries(monthlyMap).map(([month, total]) => ({ month, total }));

    return NextResponse.json({
      success: true,
      data: {
        total_items: items?.length || 0,
        total_sales_orders: soAll?.length || 0,
        pending_orders: soPending?.length || 0,
        total_invoices: siAll?.length || 0,
        outstanding_invoices: siOutstanding?.length || 0,
        outstanding_amount: outstandingAmount,
        total_payments: payments?.length || 0,
        total_purchase_orders: poAll?.length || 0,
        pending_purchase_orders: poPending?.length || 0,
        monthly_sales,
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/dashboard', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
