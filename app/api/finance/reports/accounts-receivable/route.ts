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

    // Parse filters from frontend (JSON array format)
    let frontendFilters: [string, string, string][] = [];
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        frontendFilters = JSON.parse(filtersParam);
      } catch {
        // ignore malformed filters
      }
    }

    // Pagination
    const limitPageLength = parseInt(searchParams.get('limit_page_length') || '500');
    const limitStart = parseInt(searchParams.get('limit_start') || '0');
    const orderBy = searchParams.get('order_by') || 'posting_date desc';

    // Extract filter values from frontend filters
    let customerFilter = '';
    let voucherNoFilter = '';
    let fromDate = '';
    let toDate = '';
    let salesPersonFilter = ''; // handled post-fetch (child table)

    for (const [field, op, value] of frontendFilters) {
      if (field === 'customer_name' && op === 'like') customerFilter = value.replace(/%/g, '');
      if (field === 'voucher_no' && op === 'like') voucherNoFilter = value.replace(/%/g, '');
      if (field === 'posting_date' && op === '>=') fromDate = value;
      if (field === 'posting_date' && op === '<=') toDate = value;
      if (field === 'sales_person' && op === 'like') salesPersonFilter = value.replace(/%/g, '').toLowerCase();
    }

    // Build ERPNext filters — only fields on Sales Invoice doctype
    const erpFilters: [string, string, string | number][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '>', '0'],
      ['is_return', '=', '0'],
    ];

    if (customerFilter) erpFilters.push(['customer_name', 'like', `%${customerFilter}%`]);
    if (voucherNoFilter) erpFilters.push(['name', 'like', `%${voucherNoFilter}%`]);
    if (fromDate) erpFilters.push(['posting_date', '>=', fromDate]);
    if (toDate) erpFilters.push(['posting_date', '<=', toDate]);

    const client = await getERPNextClientForRequest(request);

    // When filtering by sales_person we need to fetch all (post-filter),
    // otherwise use pagination directly
    const fetchLimit = salesPersonFilter ? 2000 : limitPageLength;
    const fetchStart = salesPersonFilter ? 0 : limitStart;

    // Run list + count in parallel for efficiency
    const [invoices, totalCount] = await Promise.all([
      client.getList('Sales Invoice', {
        fields: ['name', 'customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'],
        filters: erpFilters,
        order_by: orderBy,
        limit_page_length: fetchLimit,
        start: fetchStart,
      }),
      client.getCount('Sales Invoice', {
        filters: erpFilters as (string | number | boolean | null | string[])[][],
      }).catch(() => 0),
    ]);

    // Fetch Sales Returns for adjustment
    const returnsMap = new Map<string, number>();
    try {
      interface SalesInvoiceReturn {
        name: string;
        return_against?: string;
        grand_total: number;
      }
      const returnsData = await client.getList<SalesInvoiceReturn>('Sales Invoice', {
        fields: ['name', 'return_against', 'grand_total'],
        filters: [
          ['docstatus', '=', '1'],
          ['company', '=', company],
          ['is_return', '=', '1'],
        ],
        limit_page_length: 1000,
      });
      returnsData.forEach((ret) => {
        const key = ret.return_against || ret.name;
        returnsMap.set(key, (returnsMap.get(key) || 0) + Math.abs(ret.grand_total || 0));
      });
    } catch {
      // continue without returns
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

    // Batch-fetch sales team (one query, not N+1)
    const salesPersonMap = new Map<string, string>();
    if (invoiceList.length > 0) {
      try {
        interface SalesTeamRow { parent: string; sales_person: string; idx: number; }
        const invoiceNames = invoiceList.map(inv => inv.name);
        const rows = await client.getList<SalesTeamRow>('Sales Invoice Team', {
          fields: ['parent', 'sales_person', 'idx'],
          filters: [['parent', 'in', invoiceNames.join(',')]],
          limit_page_length: 5000,
          order_by: 'parent asc, idx asc',
        });
        rows.forEach((row) => {
          if (!salesPersonMap.has(row.parent)) {
            salesPersonMap.set(row.parent, row.sales_person || '');
          }
        });
      } catch {
        // continue without sales person
      }
    }

    // Build result
    let result = invoiceList
      .map((inv) => {
        const returnAmount = returnsMap.get(inv.name) || 0;
        const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
        return {
          name: inv.name,
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
      })
      .filter(inv => inv.outstanding_amount > 0);

    // Post-filter by sales_person (can't do this in ERPNext query — child table)
    if (salesPersonFilter) {
      result = result.filter(inv =>
        inv.sales_person.toLowerCase().includes(salesPersonFilter)
      );
      // Apply pagination manually after filter
      const total = result.length;
      result = result.slice(limitStart, limitStart + limitPageLength);
      return NextResponse.json({ success: true, data: result, total_records: total });
    }

    // Get total count for pagination (without sales_person filter)
    let totalRecords = totalCount || result.length;

    return NextResponse.json({ success: true, data: result, total_records: totalRecords });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/accounts-receivable', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
