import { NextRequest, NextResponse } from 'next/server';
import { SalesInvoiceWithItems, SalesInvoiceDetailsResponse } from '@/types/sales-invoice-details';
import { validateDateRange } from '@/utils/report-validation';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Validate required parameters
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Validate date range
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await getERPNextClientForRequest(request);

    // Build filters for ERPNext API
    const filters: any[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company]
    ];

    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }

    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // Fetch list of sales invoices
    const listData = await client.getList('Sales Invoice', {
      fields: [
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'status',
        'docstatus',
        'grand_total',
        'outstanding_amount'
      ],
      filters,
      limit_page_length: 500
    });

    const invoices = listData || [];

    // Fetch details for each invoice in parallel
    const detailPromises = invoices.map(async (invoice: any) => {
      try {
        const detailData = await client.get('Sales Invoice', invoice.name);
        
        // Get first sales person from sales_team child table
        const salesPerson = detailData.data.sales_team?.[0]?.sales_person || '';
        
        return {
          name: detailData.data.name,
          customer: detailData.data.customer,
          customer_name: detailData.data.customer_name,
          posting_date: detailData.data.posting_date,
          due_date: detailData.data.due_date,
          status: detailData.data.status,
          docstatus: detailData.data.docstatus,
          grand_total: detailData.data.grand_total,
          outstanding_amount: detailData.data.outstanding_amount,
          sales_person: salesPerson,
          items: (detailData.data.items || []).map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            qty: item.qty,
            uom: item.uom,
            rate: item.rate,
            discount_percentage: item.discount_percentage,
            discount_amount: item.discount_amount || 0,
            tax_amount: item.tax_amount || 0,
            amount: item.amount
          }))
        };
      } catch (error) {
        console.error(`Error fetching details for ${invoice.name}:`, error);
        return {
          ...invoice,
          items: []
        };
      }
    });

    const invoicesWithItems: SalesInvoiceWithItems[] = await Promise.all(detailPromises);

    const response: SalesInvoiceDetailsResponse = {
      success: true,
      data: invoicesWithItems,
      message: 'Data retrieved successfully'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/sales-invoice-details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
