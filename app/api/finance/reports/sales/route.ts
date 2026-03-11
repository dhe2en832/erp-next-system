import { NextRequest, NextResponse } from 'next/server';
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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Validate date range
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    const filters: any[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
    ];

    if (fromDate) filters.push(['transaction_date', '>=', fromDate]);
    if (toDate) filters.push(['transaction_date', '<=', toDate]);

    const data = await client.getList('Sales Order', {
      fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'status', 'per_delivered', 'per_billed'],
      filters,
      order_by: 'transaction_date desc',
      limit_page_length: 500
    });

    const salesOrders = data || [];
    
    // Fetch sales team for each sales order
    const ordersWithSales = await Promise.all(
      salesOrders.map(async (order: any) => {
        try {
          const salesTeamData = await client.get('Sales Order', order.name) as any;
          
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
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/sales', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
