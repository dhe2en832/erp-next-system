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
    interface AccountingPeriod {
      name: string;
      period_name: string;
      start_date: string;
      end_date: string;
      closing_journal_entry?: string;
      [key: string]: unknown;
    }
    const period = await client.get<AccountingPeriod>('Accounting Period', period_name);

    interface GLEntrySummary {
      account: string;
      debit: number;
      credit: number;
      posting_date: string;
      voucher_type: string;
      voucher_no: string;
      account_currency: string;
      [key: string]: unknown;
    }
    // Get ALL GL entries for the period (no filters)
    const glEntries = await client.getList<GLEntrySummary>('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
      ],
      fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no', 'account_currency'],
      limit_page_length: 10000,
    });

    interface AccountSummary {
      name: string;
      account_name: string;
      root_type: string;
      account_type: string;
      [key: string]: unknown;
    }
    // Get account details
    const accounts = await client.getList<AccountSummary>('Account', {
      filters: [['company', '=', company]],
      fields: ['name', 'account_name', 'root_type', 'account_type'],
      limit_page_length: 10000,
    });

    const accountMap = new Map(accounts.map((acc: AccountSummary) => [acc.name, acc]));

    // Aggregate by account
    interface AccountBalance {
      account: string;
      account_name: string;
      root_type: string;
      debit: number;
      credit: number;
      entries: {
        voucher_type: string;
        voucher_no: string;
        posting_date: string;
        debit: number;
        credit: number;
      }[];
    }
    const accountBalances: Record<string, AccountBalance> = {};
    
    glEntries.forEach((entry: GLEntrySummary) => {
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
