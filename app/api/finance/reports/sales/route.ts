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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const fields = ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'status', 'per_delivered', 'per_billed'];
    const filters: string[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
    ];

    if (fromDate) filters.push(['transaction_date', '>=', fromDate]);
    if (toDate) filters.push(['transaction_date', '<=', toDate]);

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=transaction_date desc&limit_page_length=500`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      const salesOrders = data.data || [];
      
      // Fetch sales team for each sales order
      const ordersWithSales = await Promise.all(
        salesOrders.map(async (order: any) => {
          try {
            const salesTeamUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order/${order.name}?fields=["sales_team"]`;
            const salesTeamResponse = await fetch(salesTeamUrl, { method: 'GET', headers });
            const salesTeamData = await salesTeamResponse.json();
            
            // Get first sales person from sales_team child table
            const salesPerson = salesTeamData.data?.sales_team?.[0]?.sales_person || '';
            
            return {
              ...order,
              sales_person: salesPerson
            };
          } catch (error) {
            console.error(`Error fetching sales team for ${order.name}:`, error);
            return {
              ...order,
              sales_person: ''
            };
          }
        })
      );
      
      return NextResponse.json({ success: true, data: ordersWithSales });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sales report' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
