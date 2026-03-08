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
    const company = searchParams.get('company');
    const salesPerson = searchParams.get('sales_person');
    const invoiceNo = searchParams.get('invoice_no');
    const customerName = searchParams.get('customer_name');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limitPageLength = parseInt(searchParams.get('limit_page_length') || '20', 10);
    const limitStart = parseInt(searchParams.get('limit_start') || '0', 10);

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters - show ALL submitted invoices with commission (paid & unpaid)
    const filters: any[][] = [
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

    try {
      // Try to fetch with custom_commission_paid field
      let invoices = await client.getList('Sales Invoice', {
        fields,
        filters,
        order_by: 'posting_date desc',
        limit_page_length: limitPageLength,
        start: limitStart
      });

      // Filter results: only include invoices with commission > 0
      invoices = (invoices || []).filter((inv: any) =>
        (inv.custom_total_komisi_sales || 0) > 0
      );

      // Fetch sales_team for each invoice (child table not returned by default)
      if (invoices.length > 0) {
        const invoicesWithSalesTeam = await Promise.all(
          invoices.map(async (inv: any) => {
            try {
              const detailData = await client.get('Sales Invoice', inv.name);
              if (detailData) {
                return { ...inv, sales_team: detailData.sales_team || [] };
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

      // Use filtered invoices length as total (more accurate)
      const total = invoices.length;

      return NextResponse.json({ success: true, data: invoices, total });
    } catch (error: any) {
      // If custom_commission_paid field doesn't exist, retry without it
      if (error.message?.includes('custom_commission_paid') || error.message?.includes('FieldDoesNotExistError')) {
        const fallbackFilters: any[][] = [
          ['docstatus', '=', '1'],
          ['company', '=', company],
          ['outstanding_amount', '=', '0'],
        ];
        const fallbackFields = [
          'name', 'customer', 'customer_name', 'posting_date', 'grand_total',
          'base_grand_total', 'outstanding_amount', 'custom_total_komisi_sales', 'status', 'sales_team'
        ];

        let invoices = await client.getList('Sales Invoice', {
          fields: fallbackFields,
          filters: fallbackFilters,
          order_by: 'posting_date desc',
          limit_page_length: limitPageLength,
          start: limitStart
        });

        invoices = (invoices || []).filter((inv: any) =>
          (inv.custom_total_komisi_sales || 0) > 0
        );

        // Fetch sales_team for each invoice (child table not returned by default)
        if (invoices.length > 0) {
          const invoicesWithSalesTeam = await Promise.all(
            invoices.map(async (inv: any) => {
              try {
                const detailData = await client.get('Sales Invoice', inv.name);
                if (detailData) {
                  return { ...inv, sales_team: detailData.sales_team || [] };
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

        return NextResponse.json({ success: true, data: invoices, total });
      }
      
      // Re-throw if it's a different error
      throw error;
    }
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/commission/payable-invoices', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
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
