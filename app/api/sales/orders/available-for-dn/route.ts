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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || '';
    const customer = searchParams.get('customer') || '';
    const salesPerson = searchParams.get('sales_person') || '';
    const search = searchParams.get('search') || '';

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Step 1: Fetch submitted SOs with remaining delivery qty
    const soFilters: any[] = [
      ['docstatus', '=', 1],
      ['per_delivered', '<', 100],
    ];
    if (company) soFilters.push(['company', '=', company]);
    if (customer) soFilters.push(['customer', '=', customer]);
    if (search) soFilters.push(['customer_name', 'like', `%${search}%`]);

    const salesOrders = await client.getList('Sales Order', {
      fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'delivery_date', 'per_delivered', 'payment_terms_template', 'custom_notes_so'],
      filters: soFilters,
      limit_page_length: 100,
      order_by: 'transaction_date desc'
    });

    let filteredOrders = salesOrders;

    // If sales_person filter, check SO's sales_team child table
    if (salesPerson && salesOrders.length > 0) {
      const filteredByPerson: any[] = [];
      for (const so of salesOrders) {
        try {
          const detailData = await client.get('Sales Order', so.name);
          const salesTeam = detailData.sales_team || [];
          if (salesTeam.some((m: any) => m.sales_person === salesPerson)) {
            filteredByPerson.push(so);
          }
        } catch {
          filteredByPerson.push(so);
        }
      }
      filteredOrders = filteredByPerson;
    }

    if (filteredOrders.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Step 2: Get all DN Items that reference any SO (both draft and submitted DNs)
    const dnItemFilters = [
      ['against_sales_order', 'is', 'set'],
      ['docstatus', 'in', [0, 1]],
    ];

    const dnItems = await client.getList('Delivery Note Item', {
      fields: ['against_sales_order'],
      filters: dnItemFilters,
      limit_page_length: 0
    });

    const soWithDN = new Set<string>();
    dnItems.forEach((item: any) => {
      if (item.against_sales_order) {
        soWithDN.add(item.against_sales_order);
      }
    });

    // Step 3: Filter out SOs that already have DN
    const availableOrders = filteredOrders.filter((so: any) => !soWithDN.has(so.name));

    return NextResponse.json({
      success: true,
      data: availableOrders,
      meta: {
        total_submitted: filteredOrders.length,
        excluded_with_dn: filteredOrders.length - availableOrders.length,
        available: availableOrders.length,
      }
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/orders/available-for-dn', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
