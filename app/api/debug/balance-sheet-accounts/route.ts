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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Cirebon';
    const fromDate = searchParams.get('from_date') || '2026-03-01';
    const toDate = searchParams.get('to_date') || '2026-03-31';

    const client = await getERPNextClientForRequest(request);

    // Fetch Account master
    const accountsData = await client.getList('Account', {
      fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
      filters: [['company', '=', company], ['is_group', '=', 0]],
      limit_page_length: 2000
    });

    const accountMasterMap = new Map();
    (accountsData as any[]).forEach((acc: any) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Fetch GL Entries
    const glFilters: any[] = [
      ['company', '=', company],
      ['is_cancelled', '=', 0],
      ['voucher_type', '!=', 'Closing Entry'],
      ['posting_date', '>=', fromDate],
      ['posting_date', '<=', toDate]
    ];

    const glData = await client.getList('GL Entry', {
      fields: ['account', 'debit', 'credit', 'voucher_no'],
      filters: glFilters,
      limit_page_length: 5000
    });

    // Filter out closing entries
    const closingVouchers = new Set<string>();
    (glData as any[]).forEach((entry: any) => {
      if (entry.account && entry.account.includes('Laba Periode Berjalan')) {
        closingVouchers.add(entry.voucher_no);
      }
    });
    
    const filteredGlData = glData.filter((entry: any) => !closingVouchers.has(entry.voucher_no));

    // Aggregate by account
    const accountMap = new Map();
    (filteredGlData as any[]).forEach((entry: any) => {
      if (!accountMap.has(entry.account)) {
        accountMap.set(entry.account, { account: entry.account, debit: 0, credit: 0 });
      }
      const row = accountMap.get(entry.account);
      row.debit += entry.debit || 0;
      row.credit += entry.credit || 0;
    });

    // Process Balance Sheet accounts
    const BALANCE_SHEET_ROOT_TYPES = ['Asset', 'Liability', 'Equity'];
    const allAccounts = Array.from(accountMap.values())
      .map((row: any) => {
        const master = accountMasterMap.get(row.account);
        const rootType = master?.root_type || '';
        const accountType = master?.account_type || '';
        const accountName = master?.account_name || '';
        const balance = row.debit - row.credit;
        
        const isBalanceSheet = BALANCE_SHEET_ROOT_TYPES.includes(rootType);
        const isTemporary = accountType === 'Temporary';
        const isPembukaan = accountName.includes('Pembukaan sementara');
        const isExcluded = !isBalanceSheet || isTemporary || isPembukaan || balance === 0;
        
        return {
          account: row.account,
          account_name: accountName,
          root_type: rootType,
          account_type: accountType,
          debit: row.debit,
          credit: row.credit,
          balance: balance,
          is_balance_sheet: isBalanceSheet,
          is_temporary: isTemporary,
          is_pembukaan: isPembukaan,
          is_excluded: isExcluded,
          reason: !isBalanceSheet ? 'Not BS account' : 
                  isTemporary ? 'Temporary account' :
                  isPembukaan ? 'Pembukaan sementara' :
                  balance === 0 ? 'Zero balance' : 'Included'
        };
      })
      .filter((a: any) => a.root_type === 'Asset'); // Only show Asset accounts for debugging

    const totalAsset = allAccounts
      .filter((a: any) => !a.is_excluded)
      .reduce((sum: number, a: any) => sum + a.balance, 0);

    return NextResponse.json({
      success: true,
      data: {
        total_asset: totalAsset,
        accounts: allAccounts.sort((a: any, b: any) => b.balance - a.balance)
      }
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/balance-sheet-accounts', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
