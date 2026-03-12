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

    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Get GL Entries for "Expenses Included In Asset Valuation" (ongkir masuk HPP)
    const hppFilters: [string, string, string | number][] = [
      ['company', '=', company],
      ['account', 'like', '%Expenses Included In Asset Valuation%']
    ];
    if (from_date) hppFilters.push(['posting_date', '>=', from_date]);
    if (to_date) hppFilters.push(['posting_date', '<=', to_date]);

    interface AcquisitionGLEntry {
      name: string;
      posting_date: string;
      account: string;
      debit: number;
      credit: number;
      voucher_type: string;
      voucher_no: string;
      remarks?: string;
    }

    const hppData = await client.getList<AcquisitionGLEntry>('GL Entry', {
      fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'remarks'],
      filters: hppFilters,
      order_by: 'posting_date desc',
      limit_page_length: 200
    });

    // Get GL Entries for operational expenses (ongkir NOT in HPP)
    const expFilters: [string, string, string | number][] = [
      ['company', '=', company],
      ['account', 'like', '%Freight%']
    ];
    if (from_date) expFilters.push(['posting_date', '>=', from_date]);
    if (to_date) expFilters.push(['posting_date', '<=', to_date]);

    const expData = await client.getList<AcquisitionGLEntry>('GL Entry', {
      fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'remarks'],
      filters: expFilters,
      order_by: 'posting_date desc',
      limit_page_length: 200
    });

    const results = {
      hpp_costs: (hppData || []).map((e) => ({ ...e, category: 'Masuk HPP', amount: e.debit - e.credit })),
      operational_costs: (expData || []).map((e) => ({ ...e, category: 'Beban Operasional', amount: e.debit - e.credit }))
    };

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/acquisition-costs', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
