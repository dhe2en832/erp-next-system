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
    const salesPerson = searchParams.get('sales_person');

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Fetch submitted Sales Invoices that are fully paid (outstanding_amount = 0)
    // and where commission has not been paid yet (custom_commission_paid = 0 or not set)
    const filters: string[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '=', '0'],
    ];

    // Filter by custom_commission_paid = 0 (not yet paid)
    // Note: if the custom field doesn't exist yet, this filter will be ignored by ERPNext
    filters.push(['custom_commission_paid', '=', '0']);

    const fields = [
      'name', 'customer', 'customer_name', 'posting_date', 'grand_total',
      'base_grand_total', 'outstanding_amount', 'custom_total_komisi_sales',
      'custom_commission_paid', 'status'
    ];

    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=100`;

    // If sales_person filter is provided, we need a different approach
    // since sales_team is a child table
    if (salesPerson) {
      // First get all matching invoices, then filter by sales person in the response
      // Remove the sales person filter from ERPNext query since it's in a child table
    }

    console.log('Payable Invoices URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (!response.ok) {
      // If custom_commission_paid field doesn't exist, retry without it
      if (data.message?.includes('custom_commission_paid') || data.exc_type === 'frappe.exceptions.FieldDoesNotExistError') {
        console.log('custom_commission_paid field not found, retrying without it...');
        const fallbackFilters = [
          ['docstatus', '=', '1'],
          ['company', '=', company],
          ['outstanding_amount', '=', '0'],
        ];
        const fallbackFields = [
          'name', 'customer', 'customer_name', 'posting_date', 'grand_total',
          'base_grand_total', 'outstanding_amount', 'custom_total_komisi_sales', 'status'
        ];
        const fallbackUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(fallbackFields))}&filters=${encodeURIComponent(JSON.stringify(fallbackFilters))}&order_by=posting_date desc&limit_page_length=100`;

        const fallbackResponse = await fetch(fallbackUrl, { method: 'GET', headers });
        const fallbackData = await fallbackResponse.json();

        if (fallbackResponse.ok) {
          const invoices = (fallbackData.data || []).filter((inv: any) =>
            (inv.custom_total_komisi_sales || 0) > 0
          );
          return NextResponse.json({ success: true, data: invoices });
        }
      }

      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payable invoices' },
        { status: response.status }
      );
    }

    // Filter results: only include invoices with commission > 0
    let invoices = (data.data || []).filter((inv: any) =>
      (inv.custom_total_komisi_sales || 0) > 0
    );

    // If sales person filter was provided, fetch sales team for each invoice and filter
    if (salesPerson && invoices.length > 0) {
      const filteredInvoices = [];
      for (const inv of invoices) {
        try {
          const teamUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}?fields=["sales_team"]`;
          const teamResponse = await fetch(teamUrl, { method: 'GET', headers });
          const teamData = await teamResponse.json();

          if (teamResponse.ok && teamData.data?.sales_team) {
            const hasSalesPerson = teamData.data.sales_team.some(
              (member: any) => member.sales_person === salesPerson
            );
            if (hasSalesPerson) {
              filteredInvoices.push(inv);
            }
          }
        } catch {
          // If we can't fetch team info, include the invoice anyway
          filteredInvoices.push(inv);
        }
      }
      invoices = filteredInvoices;
    }

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Payable Invoices API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
