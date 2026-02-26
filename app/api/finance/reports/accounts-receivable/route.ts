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

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch outstanding Sales Invoices
    const fields = ['name', 'customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'];
    const filters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '>', '0'],
    ];

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=500`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      const invoices = data.data || [];
      
      // Fetch sales team for each invoice
      const invoicesWithSales = await Promise.all(
        invoices.map(async (inv: any) => {
          try {
            const salesTeamUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${inv.name}?fields=["sales_team"]`;
            const salesTeamResponse = await fetch(salesTeamUrl, { method: 'GET', headers });
            const salesTeamData = await salesTeamResponse.json();
            
            // Get first sales person from sales_team child table
            const salesPerson = salesTeamData.data?.sales_team?.[0]?.sales_person || '';
            
            return {
              voucher_no: inv.name,
              customer: inv.customer,
              customer_name: inv.customer_name,
              posting_date: inv.posting_date,
              due_date: inv.due_date,
              invoice_grand_total: inv.grand_total,
              outstanding_amount: inv.outstanding_amount,
              voucher_type: 'Sales Invoice',
              sales_person: salesPerson,
            };
          } catch (error) {
            console.error(`Error fetching sales team for ${inv.name}:`, error);
            return {
              voucher_no: inv.name,
              customer: inv.customer,
              customer_name: inv.customer_name,
              posting_date: inv.posting_date,
              due_date: inv.due_date,
              invoice_grand_total: inv.grand_total,
              outstanding_amount: inv.outstanding_amount,
              voucher_type: 'Sales Invoice',
              sales_person: '',
            };
          }
        })
      );
      
      return NextResponse.json({ success: true, data: invoicesWithSales, total_records: invoicesWithSales.length });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch accounts receivable' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('AR Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
