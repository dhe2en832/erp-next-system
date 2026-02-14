import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

/**
 * GET /api/sales/orders/available-for-dn
 * Returns submitted SOs that:
 * 1. docstatus = 1 (submitted)
 * 2. Have items with qty > delivered_qty
 * 3. Do NOT have any existing DN (draft or submitted) referencing them
 * 
 * Optional filters: company, customer, sales_person, search
 */
export async function GET(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || '';
    const customer = searchParams.get('customer') || '';
    const salesPerson = searchParams.get('sales_person') || '';
    const search = searchParams.get('search') || '';

    // Step 1: Fetch submitted SOs with remaining delivery qty
    const soFilters: any[] = [
      ['docstatus', '=', 1],
      ['per_delivered', '<', 100],
    ];
    if (company) soFilters.push(['company', '=', company]);
    if (customer) soFilters.push(['customer', '=', customer]);
    if (search) soFilters.push(['customer_name', 'like', `%${search}%`]);

    const soFields = [
      'name', 'customer', 'customer_name', 'transaction_date',
      'grand_total', 'status', 'docstatus', 'delivery_date',
      'per_delivered', 'payment_terms_template', 'custom_notes_so'
    ];

    const soUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=${encodeURIComponent(JSON.stringify(soFields))}&filters=${encodeURIComponent(JSON.stringify(soFilters))}&limit_page_length=100&order_by=transaction_date desc`;

    const soResponse = await fetch(soUrl, { method: 'GET', headers });
    if (!soResponse.ok) {
      const errData = await soResponse.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, message: errData.message || 'Failed to fetch sales orders' },
        { status: soResponse.status }
      );
    }
    const soData = await soResponse.json();
    let salesOrders = soData.data || [];

    // If sales_person filter, we need to check SO's sales_team child table
    // ERPNext doesn't support child table filtering in resource API easily,
    // so we'll do post-filtering if needed
    if (salesPerson && salesOrders.length > 0) {
      const filteredByPerson: any[] = [];
      for (const so of salesOrders) {
        try {
          const detailUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order/${so.name}?fields=["sales_team"]`;
          const detailRes = await fetch(detailUrl, { method: 'GET', headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const salesTeam = detailData.data?.sales_team || [];
            if (salesTeam.some((m: any) => m.sales_person === salesPerson)) {
              filteredByPerson.push(so);
            }
          }
        } catch {
          // If detail fetch fails, include the SO anyway
          filteredByPerson.push(so);
        }
      }
      salesOrders = filteredByPerson;
    }

    if (salesOrders.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Step 2: Get all DN Items that reference any SO (both draft and submitted DNs)
    // Fetch DN items where against_sales_order is set, from DNs with docstatus in [0,1]
    const dnItemFilters = [
      ['against_sales_order', 'is', 'set'],
      ['docstatus', 'in', [0, 1]],
    ];

    const dnItemUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["against_sales_order"]&filters=${encodeURIComponent(JSON.stringify(dnItemFilters))}&limit_page_length=0&group_by=against_sales_order`;

    const dnItemResponse = await fetch(dnItemUrl, { method: 'GET', headers });

    const soWithDN = new Set<string>();
    if (dnItemResponse.ok) {
      const dnItemData = await dnItemResponse.json();
      (dnItemData.data || []).forEach((item: any) => {
        if (item.against_sales_order) {
          soWithDN.add(item.against_sales_order);
        }
      });
    }

    // Step 3: Filter out SOs that already have DN
    const availableOrders = salesOrders.filter((so: any) => !soWithDN.has(so.name));

    return NextResponse.json({
      success: true,
      data: availableOrders,
      meta: {
        total_submitted: salesOrders.length,
        excluded_with_dn: salesOrders.length - availableOrders.length,
        available: availableOrders.length,
      }
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
