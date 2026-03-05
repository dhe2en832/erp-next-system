import { NextRequest, NextResponse } from 'next/server';
import { validateDateRange } from '@/utils/report-validation';
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
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const limit = searchParams.get('limit') || '100';

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company required' }, { status: 400 });
    }

    // Validate date range
    const dateValidation = validateDateRange(from_date, to_date);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // Query Account master to get COGS accounts
    const accountsData = await client.getList('Account', {
      fields: ['name'],
      filters: [['company', '=', company], ['account_type', '=', 'Cost of Goods Sold']],
      limit_page_length: 500
    });

    const cogsAccounts = (accountsData || []).map((acc: any) => acc.name);

    // Handle empty cogsAccounts case
    if (cogsAccounts.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0 });
    }

    // Get GL Entries for COGS accounts
    const filters: any[][] = [
      ['company', '=', company],
      ['account', 'in', cogsAccounts]
    ];
    if (from_date) filters.push(['posting_date', '>=', from_date]);
    if (to_date) filters.push(['posting_date', '<=', to_date]);

    const data = await client.getList('GL Entry', {
      fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'remarks'],
      filters,
      order_by: 'debit desc,posting_date desc',
      limit_page_length: parseInt(limit)
    });

    const entries = (data || []).map((e: any) => {
      const amount = (e.debit || 0) - (e.credit || 0);
      return {
        ...e,
        amount,
        formatted_debit: formatCurrency(e.debit || 0),
        formatted_credit: formatCurrency(e.credit || 0),
        formatted_amount: formatCurrency(Math.abs(amount)),
      };
    });

    const total = entries.reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);

    return NextResponse.json({
      success: true,
      data: entries,
      total,
      formatted_total: formatCurrency(total),
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/hpp-ledger', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
