import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { calculateNetIncome } from '@/lib/calculate-net-income';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    
    const period_name = searchParams.get('period_name');
    const company = searchParams.get('company');
    const format = searchParams.get('format') || 'json';

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period details - use getList with minimal fields to reduce server script impact
    // console.log('[DEBUG] Fetching period:', period_name);
    let period: any = null;
    try {
      const periodList = await client.getList('Accounting Period', {
        filters: [['name', '=', period_name]],
        fields: ['name', 'period_name', 'company', 'start_date', 'end_date', 'status', 'closed_by', 'closed_on', 'closing_journal_entry'],
        limit: 1,
      });
      
      // console.log('[DEBUG] Period fetched:', periodList?.length || 0);
      
      if (!periodList || periodList.length === 0) {
        return NextResponse.json(
          { success: false, error: 'NOT_FOUND', message: `Accounting Period not found: ${period_name}` },
          { status: 404 }
        );
      }
      
      period = periodList[0];
      // console.log('[DEBUG] Period data:', JSON.stringify(period, null, 2));
    } catch (err: any) {
      console.error('[DEBUG] Error fetching period:', err);
      // If error contains "net_income", it's from a server script - log and continue
      if (err.message && err.message.includes('net_income')) {
        console.error('[DEBUG] Server script error detected, attempting workaround...');
        // Try to get just the basic fields
        try {
          const basicPeriod = await client.getList('Accounting Period', {
            filters: [['name', '=', period_name]],
            fields: ['name', 'company', 'start_date', 'end_date'],
            limit: 1,
          });
          if (basicPeriod && basicPeriod.length > 0) {
            const basicData = basicPeriod[0] as any;
            period = {
              name: basicData.name,
              company: basicData.company,
              start_date: basicData.start_date,
              end_date: basicData.end_date,
              period_name: basicData.name,
              status: 'Open',
              closed_by: null,
              closed_on: null,
              closing_journal_entry: null,
            };
            // console.log('[DEBUG] Using basic period data:', period);
          } else {
            throw err;
          }
        } catch (retryErr) {
          throw err; // throw original error
        }
      } else {
        throw err;
      }
    }

    // Get GL entries for the period (EXCLUDE closing journal entries)
    // Closing journal entries should NOT be included in P/L calculation
    
    // First, get all cancelled Journal Entries in this period
    const cancelledJournals = await client.getList('Journal Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
        ['docstatus', '=', 2], // Cancelled
      ],
      fields: ['name'],
      limit: 10000,
    });
    
    const cancelledVoucherNos = cancelledJournals.map((j: any) => j.name);
    // console.log('[DEBUG] Cancelled journals:', cancelledVoucherNos);
    
    const filters: any[] = [
      ['company', '=', company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['is_cancelled', '=', 0], // Exclude cancelled entries (if field exists)
    ];
    
    // Exclude cancelled journal entries by voucher_no
    if (cancelledVoucherNos.length > 0) {
      // Use multiple != filters instead of 'not in' which might not work
      cancelledVoucherNos.forEach(voucherNo => {
        filters.push(['voucher_no', '!=', voucherNo]);
      });
    }
    
    // CRITICAL: Exclude closing journal entry from P/L calculation
    // Method 1: Exclude by voucher_no if period has closing_journal_entry
    if (period.closing_journal_entry) {
      filters.push(['voucher_no', '!=', period.closing_journal_entry]);
    }
    
    // Method 2: Exclude all Journal Entries with voucher_type = 'Closing Entry'
    // This catches ALL closing entries, even if not linked to this specific period
    filters.push(['voucher_type', '!=', 'Closing Entry']);
    
    // console.log('[DEBUG] GL Entry filters:', JSON.stringify(filters, null, 2));
    
    const glEntries = await client.getList('GL Entry', {
      filters,
      fields: ['account', 'debit', 'credit', 'posting_date', 'voucher_type', 'voucher_no'],
      limit: 10000,
    });
    
    // console.log('[DEBUG] GL Entries count:', glEntries.length);
    // console.log('[DEBUG] Sample GL entries:', glEntries.slice(0, 3).map((e: any) => ({
    //   voucher_no: e.voucher_no,
    //   account: e.account,
    //   debit: e.debit,
    //   credit: e.credit
    // })));

    // Get account details to determine root_type
    const accounts = await client.getList('Account', {
      filters: [['company', '=', company]],
      fields: ['name', 'account_name', 'root_type', 'account_type', 'is_group'],
      limit: 10000,
    });

    const accountMap = new Map(accounts.map((acc: any) => [acc.name, acc]));

    // Aggregate by account
    const accountBalances: Record<string, { 
      account: string;
      account_name: string;
      root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
      account_type: string;
      is_group: boolean;
      debit: number; 
      credit: number; 
      balance: number;
      is_nominal: boolean;
    }> = {};
    
    glEntries.forEach((entry: any) => {
      const accountInfo = accountMap.get(entry.account);
      const rootType = accountInfo?.root_type || 'Asset';
      const isNominal = rootType === 'Income' || rootType === 'Expense';
      
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = { 
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: rootType as 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense',
          account_type: accountInfo?.account_type || 'Unknown',
          is_group: accountInfo?.is_group || false,
          debit: 0, 
          credit: 0, 
          balance: 0,
          is_nominal: isNominal
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      
      // Calculate balance correctly based on account type
      if (rootType === 'Income') {
        // Income accounts: normally Credit (Cr - Dr)
        accountBalances[entry.account].balance = accountBalances[entry.account].credit - accountBalances[entry.account].debit;
      } else if (rootType === 'Expense') {
        // Expense accounts: normally Debit (Dr - Cr)
        accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
      } else {
        // Asset, Liability, Equity: Dr - Cr
        accountBalances[entry.account].balance = accountBalances[entry.account].debit - accountBalances[entry.account].credit;
      }
    });

    const allAccounts = Object.values(accountBalances);
    const nominal_accounts = allAccounts.filter(a => a.root_type === 'Income' || a.root_type === 'Expense');
    const real_accounts = allAccounts.filter(a => a.root_type === 'Asset' || a.root_type === 'Liability' || a.root_type === 'Equity');
    
    // Calculate net income using shared utility
    const { totalIncome, totalExpense, netIncome } = calculateNetIncome(nominal_accounts);

    const summary = {
      period: {
        name: period.name,
        period_name: period.period_name || period.name,
        company: period.company,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status || 'Open',
        closed_by: period.closed_by || null,
        closed_on: period.closed_on || null,
      },
      closing_journal: period.closing_journal_entry ? {
        name: period.closing_journal_entry,
      } : null,
      nominal_accounts,
      real_accounts,
      net_income: netIncome,
      total_debit: allAccounts.reduce((sum, b) => sum + b.debit, 0),
      total_credit: allAccounts.reduce((sum, b) => sum + b.credit, 0),
    };

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // For PDF/Excel, return JSON for now (client will handle formatting)
    return NextResponse.json({
      success: true,
      data: summary,
      format,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/accounting-period/reports/closing-summary', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
