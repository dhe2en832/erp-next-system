import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

interface SalesOrderItem {
  item_code: string;
  qty: number;
  delivered_qty: number;
  remaining_qty?: number;
  [key: string]: unknown;
}

interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  items?: SalesOrderItem[];
  sales_team?: Array<{ sales_person: string }>;
  [key: string]: unknown;
}

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
    const soFilters: (string | number | string[])[][] = [
      ['docstatus', '=', 1],
      ['per_delivered', '<', 100],
    ];
    if (company) soFilters.push(['company', '=', company]);
    if (customer) soFilters.push(['customer', '=', customer]);
    if (search) soFilters.push(['customer_name', 'like', `%${search}%`]);

    const salesOrders = await client.getList<SalesOrder>('Sales Order', {
      fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'delivery_date', 'per_delivered', 'payment_terms_template', 'custom_notes_so'],
      filters: soFilters,
      limit_page_length: 100,
      order_by: 'transaction_date desc'
    });

    let filteredOrders = salesOrders;

    // If sales_person filter, check SO's sales_team child table
    if (salesPerson && salesOrders.length > 0) {
      const filteredByPerson: SalesOrder[] = [];
      for (const so of salesOrders) {
        try {
          const detailData = await client.get<SalesOrder>('Sales Order', so.name);
          const salesTeam = detailData.sales_team || [];
          if (salesTeam.some((m) => m.sales_person === salesPerson)) {
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

    // Step 2: Get all DNs that reference ini SOs
    const soWithDN = new Set<string>();
    if (filteredOrders.length > 0) {
      const soNames = filteredOrders.map((so) => so.name);
      
      const dnItemsResult = await client.call('frappe.client.get_list', {
        doctype: 'Delivery Note Item',
        fields: ['parent', 'against_sales_order'],
        filters: [['against_sales_order', 'in', soNames]],
        limit: 1000
      }) as Record<string, unknown>;
      
      const dnItems = (dnItemsResult?.data as Record<string, unknown>[]) || (dnItemsResult as unknown as Record<string, unknown>[]) || [];
      dnItems.forEach((item) => {
        if (item.against_sales_order) soWithDN.add(String(item.against_sales_order));
      });
    }

    // Step 3: Filter out SOs that already have DN and calculate remaining items
    const results = await Promise.all(filteredOrders.filter((so) => !soWithDN.has(so.name)).map(async (so) => {
      try {
        const detailData = await client.get<SalesOrder>('Sales Order', so.name);
        
        // Calculate remaining items
        const items = (detailData.items || []).map((item) => {
          const qty = item.qty || 0;
          const deliveredQty = item.delivered_qty || 0;
          const remainingQty = qty - deliveredQty;
          
          return {
            ...item,
            remaining_qty: remainingQty
          };
        }).filter((item) => item.remaining_qty > 0);

        if (items.length > 0) {
          return {
            ...so,
            items
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching detail for SO ${so.name}:`, error);
        return null;
      }
    }));

    const availableOrders = results.filter((r): r is NonNullable<typeof r> => r !== null);

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
