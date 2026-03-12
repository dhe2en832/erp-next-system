import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';
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

    // Validate date range (Bug #4 fix)
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Bug #6 fix: Query Account master to get Cash/Bank accounts by account_type
    const accountsData = await client.getList<{ name: string }>('Account', {
      fields: ['name'],
      filters: [['company', '=', company], ['account_type', 'in', ['Cash', 'Bank']]],
      limit_page_length: 500
    });

    const cashBankAccounts = accountsData.map((acc) => acc.name);

    // Handle empty cashBankAccounts case
    if (cashBankAccounts.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch GL Entries for these accounts
    const filters: [string, string, string | string[]][] = [
      ['company', '=', company],
      ['account', 'in', cashBankAccounts],
    ];

    if (fromDate) filters.push(['posting_date', '>=', fromDate]);
    if (toDate) filters.push(['posting_date', '<=', toDate]);

    interface CashFlowGLEntry {
      account: string;
      posting_date: string;
      debit: number;
      credit: number;
      voucher_type: string;
      voucher_no: string;
    }

    const glData = await client.getList<CashFlowGLEntry>('GL Entry', {
      fields: ['account', 'posting_date', 'debit', 'credit', 'voucher_type', 'voucher_no'],
      filters,
      order_by: 'posting_date desc',
      limit_page_length: 500
    });

    // Sort entries by posting_date ascending for proper balance calculation
    const sortedEntries = [...glData].sort((a, b) => {
      const dateA = new Date(a.posting_date).getTime();
      const dateB = new Date(b.posting_date).getTime();
      return dateA - dateB;
    });

    // Calculate running balance
    let runningBalance = 0;
    const entries = sortedEntries.map((entry) => {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;
      runningBalance += debit - credit;
      
      return {
        ...entry,
        balance: runningBalance,
        formatted_debit: formatCurrency(debit),
        formatted_credit: formatCurrency(credit),
      };
    });
    
    // Reverse to show most recent first
    entries.reverse();
    
    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/cash-flow', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
