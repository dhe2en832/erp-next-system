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

    // Get site-aware client (handles API key auth)
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
    const returnFilters: [string, string, string | number][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['is_return', '=', '1'],
    ];

    const returnsMap = new Map<string, number>();
    try {
      interface SalesInvoiceReturn {
        name: string;
        return_against?: string;
        grand_total: number;
        outstanding_amount: number;
      }
      const returnsData = await client.getList<SalesInvoiceReturn>('Sales Invoice', {
        fields: ['name', 'return_against', 'grand_total', 'outstanding_amount'],
        filters: returnFilters,
        limit_page_length: 500
      });

      returnsData.forEach((ret) => {
        const originalInvoice = ret.return_against || ret.name;
        const returnAmount = Math.abs(ret.grand_total || 0);
        returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
      });
    } catch (error) {
      console.error('Error fetching sales returns:', error);
      // Continue without returns if fetch fails
    }
    
    interface SalesInvoiceBasic {
      name: string;
      customer: string;
      customer_name: string;
      posting_date: string;
      due_date: string;
      grand_total: number;
      outstanding_amount: number;
      status: string;
    }
    const invoiceList = invoices as unknown as SalesInvoiceBasic[];

    // Fetch all sales team data in ONE query using the child doctype
    // This avoids N+1 individual fetches per invoice
    const salesPersonMap = new Map<string, string>();
    try {
      interface SalesTeamRow {
        parent: string;
        sales_person: string;
        idx: number;
      }
      const invoiceNames = invoiceList.map(inv => inv.name);
      const salesTeamRows = await client.getList<SalesTeamRow>('Sales Invoice Team', {
        fields: ['parent', 'sales_person', 'idx'],
        filters: [['parent', 'in', invoiceNames.join(',')]],
        limit_page_length: 2000,
        order_by: 'parent asc, idx asc',
      });
      // Keep only the first sales_person per invoice (lowest idx)
      salesTeamRows.forEach((row) => {
        if (!salesPersonMap.has(row.parent)) {
          salesPersonMap.set(row.parent, row.sales_person || '');
        }
      });
    } catch (error) {
      console.error('Error fetching sales team batch:', error);
      // Continue without sales person data
    }

    // Build result — no per-invoice API calls needed
    const invoicesWithSales = invoiceList.map((inv) => {
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
        sales_person: salesPersonMap.get(inv.name) || '',
        formatted_grand_total: formatCurrency(inv.grand_total),
        formatted_outstanding: formatCurrency(adjustedOutstanding),
        formatted_return_amount: formatCurrency(returnAmount),
      };
    });
    
    // Filter out invoices with zero outstanding after returns
    const filteredInvoices = invoicesWithSales.filter(inv => inv.outstanding_amount > 0);
    
    return NextResponse.json({ success: true, data: filteredInvoices, total_records: filteredInvoices.length });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/accounts-receivable', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
