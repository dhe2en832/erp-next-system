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

    const filters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '>', '0'],
    ];

    const invoices = await client.getList('Purchase Invoice', {
      fields: ['name', 'supplier', 'supplier_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 500
    });
    
    // Fetch Purchase Returns
    const returnFilters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['is_return', '=', '1'],
    ];

    const returnsMap = new Map<string, number>();
    try {
      const returnsData = await client.getList('Purchase Invoice', {
        fields: ['name', 'return_against', 'grand_total', 'outstanding_amount'],
        filters: returnFilters,
        limit_page_length: 500
      });

      returnsData.forEach((ret: any) => {
        const originalInvoice = ret.return_against || ret.name;
        const returnAmount = Math.abs(ret.grand_total || 0);
        returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
      });
    } catch (error) {
      console.error('Error fetching purchase returns:', error);
      // Continue without returns if fetch fails
    }
    
    // Adjust outstanding amounts for returns
    const apData = invoices
      .map((inv: any) => {
        const returnAmount = returnsMap.get(inv.name) || 0;
        const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
        
        return {
          voucher_no: inv.name,
          supplier: inv.supplier,
          supplier_name: inv.supplier_name,
          posting_date: inv.posting_date,
          due_date: inv.due_date,
          invoice_grand_total: inv.grand_total,
          outstanding_amount: adjustedOutstanding,
          return_amount: returnAmount,
          formatted_grand_total: formatCurrency(inv.grand_total),
          formatted_outstanding: formatCurrency(adjustedOutstanding),
          formatted_return_amount: formatCurrency(returnAmount),
        };
      })
      .filter((inv: any) => inv.outstanding_amount > 0);
    
    return NextResponse.json({ success: true, data: apData, total_records: apData.length });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/accounts-payable', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
