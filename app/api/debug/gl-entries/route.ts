import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    
    const period_name = searchParams.get('period_name');
    const company = searchParams.get('company');

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await client.get('Accounting Period', period_name) as any;

    // Get ALL GL entries for the period (no filters)
    const glEntries = await client.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
      ],
      fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no', 'account_currency'],
      limit: 10000,
    });

    // Get account details
    const accounts = await client.getList('Account', {
      filters: [['company', '=', company]],
      fields: ['name', 'account_name', 'root_type', 'account_type'],
      limit: 10000,
    });

    const accountMap = new Map(accounts.map((acc: any) => [acc.name, acc]));

    // Aggregate by account
    const accountBalances: Record<string, any> = {};
    
    glEntries.forEach((entry: any) => {
      const accountInfo = accountMap.get(entry.account);
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = { 
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: accountInfo?.root_type || 'Unknown',
          debit: 0, 
          credit: 0, 
          entries: []
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      accountBalances[entry.account].entries.push({
        voucher_type: entry.voucher_type,
        voucher_no: entry.voucher_no,
        posting_date: entry.posting_date,
        debit: entry.debit,
        credit: entry.credit,
      });
    });

    return NextResponse.json({
      success: true,
      period: {
        name: period.name,
        period_name: period.period_name,
        start_date: period.start_date,
        end_date: period.end_date,
        closing_journal_entry: period.closing_journal_entry,
      },
      total_gl_entries: glEntries.length,
      account_balances: accountBalances,
      gl_entries: glEntries,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/gl-entries', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
