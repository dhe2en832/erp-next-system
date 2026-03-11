import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';
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

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch outstanding Sales Invoices
    const filters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '>', '0'],
    ];

    const invoices = await client.getList('Sales Invoice', {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 500
    });
    
    // Fetch Sales Returns
    const returnFilters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['is_return', '=', '1'],
    ];

    const returnsMap = new Map<string, number>();
    try {
      const returnsData = await client.getList('Sales Invoice', {
        fields: ['name', 'return_against', 'grand_total', 'outstanding_amount'],
        filters: returnFilters,
        limit_page_length: 500
      });

      (returnsData as any[]).forEach((ret: any) => {
        const originalInvoice = ret.return_against || ret.name;
        const returnAmount = Math.abs(ret.grand_total || 0);
        returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
      });
    } catch (error) {
      console.error('Error fetching sales returns:', error);
      // Continue without returns if fetch fails
    }
    
    // Fetch sales team for each invoice and adjust outstanding amounts
    const invoicesWithSales = await Promise.all(
      invoices.map(async (inv: any) => {
        try {
          const salesTeamData = await client.get('Sales Invoice', inv.name) as any;
          
          // Get first sales person from sales_team child table
          const salesPerson = salesTeamData.sales_team?.[0]?.sales_person || '';
          
          // Adjust outstanding amount for returns
          const returnAmount = returnsMap.get(inv.name) || 0;
          const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
          
          return {
            voucher_no: inv.name,
            customer: inv.customer,
            customer_name: inv.customer_name,
            posting_date: inv.posting_date,
            due_date: inv.due_date,
            invoice_grand_total: inv.grand_total,
            outstanding_amount: adjustedOutstanding,
            return_amount: returnAmount,
            voucher_type: 'Sales Invoice',
            sales_person: salesPerson,
            formatted_grand_total: formatCurrency(inv.grand_total),
            formatted_outstanding: formatCurrency(adjustedOutstanding),
            formatted_return_amount: formatCurrency(returnAmount),
          };
        } catch (error) {
          console.error(`Error fetching sales team for ${inv.name}:`, error);
          
          // Adjust outstanding amount for returns even if sales team fetch fails
          const returnAmount = returnsMap.get(inv.name) || 0;
          const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
          
          return {
            voucher_no: inv.name,
            customer: inv.customer,
            customer_name: inv.customer_name,
            posting_date: inv.posting_date,
            due_date: inv.due_date,
            invoice_grand_total: inv.grand_total,
            outstanding_amount: adjustedOutstanding,
            return_amount: returnAmount,
            voucher_type: 'Sales Invoice',
            sales_person: '',
            formatted_grand_total: formatCurrency(inv.grand_total),
            formatted_outstanding: formatCurrency(adjustedOutstanding),
            formatted_return_amount: formatCurrency(returnAmount),
          };
        }
      })
    );
    
    // Filter out invoices with zero outstanding after returns
    const filteredInvoices = invoicesWithSales.filter(inv => inv.outstanding_amount > 0);
    
    return NextResponse.json({ success: true, data: filteredInvoices, total_records: filteredInvoices.length });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/accounts-receivable', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
