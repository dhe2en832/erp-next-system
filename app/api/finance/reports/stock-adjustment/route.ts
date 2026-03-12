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

    const client = await getERPNextClientForRequest(request);

    // Get Stock Entries with purpose = "Material Issue/Receipt/Reconciliation"
    const filters: [string, string, string | number | string[]][] = [
      ['company', '=', company],
      ['docstatus', '=', 1],
      ['purpose', 'in', ['Material Receipt', 'Material Issue', 'Repack', 'Stock Reconciliation']]
    ];
    if (from_date) filters.push(['posting_date', '>=', from_date]);
    if (to_date) filters.push(['posting_date', '<=', to_date]);

    interface StockEntryBasic {
      name: string;
      posting_date: string;
      purpose: string;
      total_amount: number;
      remarks?: string;
    }

    const data = await client.getList<StockEntryBasic>('Stock Entry', {
      fields: ['name', 'posting_date', 'purpose', 'total_amount', 'remarks'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 200
    });

    // Get GL Entry for each Stock Entry to see journal impact
    const entries = [];
    for (const se of (data || [])) {
      const glFilters: [string, string, string | number][] = [['voucher_type', '=', 'Stock Entry'], ['voucher_no', '=', se.name]];
      
      interface GLEntryDetail {
        account: string;
        debit: number;
        credit: number;
      }

      const glData = await client.getList<GLEntryDetail>('GL Entry', {
        fields: ['account', 'debit', 'credit'],
        filters: glFilters,
        limit_page_length: 50
      });

      entries.push({
        ...se,
        gl_entries: glData || []
      });
    }

    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/stock-adjustment', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
