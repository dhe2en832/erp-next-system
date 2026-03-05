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
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

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

    // Get all HPP GL Entries
    const hppFilters: any[][] = [['company', '=', company], ['account', 'like', '%HPP%']];
    if (from_date) hppFilters.push(['posting_date', '>=', from_date]);
    if (to_date) hppFilters.push(['posting_date', '<=', to_date]);

    const hppData = await client.getList('GL Entry', {
      fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no'],
      filters: hppFilters,
      order_by: 'posting_date desc',
      limit_page_length: 500
    });

    // Get Sales Invoice total for comparison
    const siFilters: any[][] = [['company', '=', company], ['docstatus', '=', 1]];
    if (from_date) siFilters.push(['posting_date', '>=', from_date]);
    if (to_date) siFilters.push(['posting_date', '<=', to_date]);

    const siData = await client.getList('Sales Invoice', {
      fields: ['grand_total'],
      filters: siFilters,
      limit_page_length: 999
    });

    const totalHPP = (hppData || []).reduce((sum: number, e: any) => sum + (e.debit || 0) - (e.credit || 0), 0);
    const totalSales = (siData || []).reduce((sum: number, si: any) => sum + (si.grand_total || 0), 0);
    const hppPercentage = totalSales > 0 ? (totalHPP / totalSales) * 100 : 0;

    const results = {
      entries: hppData || [],
      summary: {
        total_hpp: totalHPP,
        total_sales: totalSales,
        hpp_percentage: hppPercentage,
        warning: hppPercentage > 80 ? 'HPP > 80% dari Sales, margin sangat tipis!' : hppPercentage > 100 ? 'HPP > Sales! Ada masalah!' : null
      }
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/hpp-reconciliation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
