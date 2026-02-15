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
    const invoiceNo = searchParams.get('invoice_no');
    const customerName = searchParams.get('customer_name');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Build filters - show ALL submitted invoices with commission (paid & unpaid)
    const filters: string[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '=', '0'],
    ];

    // Optional: filter by status (commission paid status)
    if (status === 'paid') {
      filters.push(['custom_commission_paid', '=', '1']);
    } else if (status === 'unpaid') {
      filters.push(['custom_commission_paid', '=', '0']);
    }
    // if status is 'all' or not provided, show both

    const fields = [
      'name', 'customer', 'customer_name', 'posting_date', 'grand_total',
      'base_grand_total', 'outstanding_amount', 'custom_total_komisi_sales',
      'custom_commission_paid', 'status', 'sales_team'
    ];

    const start = (page - 1) * limit;
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_start=${start}&limit_page_length=${limit}`;

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
          'base_grand_total', 'outstanding_amount', 'custom_total_komisi_sales', 'status', 'sales_team'
        ];
        const fallbackUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=${encodeURIComponent(JSON.stringify(fallbackFields))}&filters=${encodeURIComponent(JSON.stringify(fallbackFilters))}&order_by=posting_date desc&limit_start=${start}&limit_page_length=${limit}`;

        const fallbackResponse = await fetch(fallbackUrl, { method: 'GET', headers });
        const fallbackData = await fallbackResponse.json();

        if (fallbackResponse.ok) {
          let invoices = (fallbackData.data || []).filter((inv: any) =>
            (inv.custom_total_komisi_sales || 0) > 0
          );

          // Fetch sales_team for each invoice (child table not returned by default)
          if (invoices.length > 0) {
            const invoicesWithSalesTeam = await Promise.all(
              invoices.map(async (inv: any) => {
                try {
                  const detailUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}?fields=["sales_team"]`;
                  const detailResponse = await fetch(detailUrl, { method: 'GET', headers });
                  const detailData = await detailResponse.json();
                  if (detailResponse.ok && detailData.data) {
                    return { ...inv, sales_team: detailData.data.sales_team || [] };
                  }
                } catch (err) {
                  console.error(`Error fetching sales_team for ${inv.name}:`, err);
                }
                return { ...inv, sales_team: [] };
              })
            );
            invoices = invoicesWithSalesTeam;
          }

          // Apply frontend filters
          invoices = applyFrontendFilters(invoices, { invoiceNo, customerName, salesPerson, dateFrom, dateTo });
          const total = invoices.length;
          const paginated = invoices.slice(0, limit);

          return NextResponse.json({ success: true, data: paginated, total, page, limit });
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

    // Fetch sales_team for each invoice (child table not returned by default)
    if (invoices.length > 0) {
      const invoicesWithSalesTeam = await Promise.all(
        invoices.map(async (inv: any) => {
          try {
            const detailUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}?fields=["sales_team"]`;
            const detailResponse = await fetch(detailUrl, { method: 'GET', headers });
            const detailData = await detailResponse.json();
            if (detailResponse.ok && detailData.data) {
              return { ...inv, sales_team: detailData.data.sales_team || [] };
            }
          } catch (err) {
            console.error(`Error fetching sales_team for ${inv.name}:`, err);
          }
          return { ...inv, sales_team: [] };
        })
      );
      invoices = invoicesWithSalesTeam;
    }

    // Apply frontend filters
    invoices = applyFrontendFilters(invoices, { invoiceNo, customerName, salesPerson, dateFrom, dateTo });

    // Get total count for pagination
    const totalUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name"]&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=0`;
    let total = invoices.length;
    try {
      const totalResponse = await fetch(totalUrl, { method: 'GET', headers });
      const totalData = await totalResponse.json();
      if (totalResponse.ok && totalData.data) {
        total = totalData.data.filter((inv: any) => (inv.custom_total_komisi_sales || 0) > 0).length;
      }
    } catch {
      // Use local count as fallback
    }

    return NextResponse.json({ success: true, data: invoices, total, page, limit });
  } catch (error) {
    console.error('Payable Invoices API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

function applyFrontendFilters(invoices: any[], filters: any) {
  let result = invoices;

  if (filters.invoiceNo) {
    const search = filters.invoiceNo.toLowerCase();
    result = result.filter(inv => inv.name?.toLowerCase().includes(search));
  }

  if (filters.customerName) {
    const search = filters.customerName.toLowerCase();
    result = result.filter(inv =>
      inv.customer_name?.toLowerCase().includes(search) ||
      inv.customer?.toLowerCase().includes(search)
    );
  }

  if (filters.salesPerson) {
    const search = filters.salesPerson.toLowerCase();
    result = result.filter(inv =>
      inv.sales_team?.some((member: any) =>
        member.sales_person?.toLowerCase().includes(search)
      )
    );
  }

  if (filters.dateFrom) {
    result = result.filter(inv => inv.posting_date >= filters.dateFrom);
  }

  if (filters.dateTo) {
    result = result.filter(inv => inv.posting_date <= filters.dateTo);
  }

  return result;
}
