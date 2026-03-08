import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

interface GlEntry {
  account: string;
  debit?: number;
  credit?: number;
  posting_date?: string;
}

interface AccountMaster {
  name: string;
  account_name: string;
  account_type: string;
  root_type: string;
  parent_account: string;
  is_group: number;
  account_number?: string;
}

// root_type values in ERPNext: Asset, Liability, Equity, Income, Expense
const BALANCE_SHEET_ROOT_TYPES = ['Asset', 'Liability', 'Equity'];
const PL_ROOT_TYPES = ['Income', 'Expense'];

// Map ERPNext root_type to Indonesian label
const ROOT_TYPE_LABEL: Record<string, string> = {
  Asset: 'Aktiva',
  Liability: 'Kewajiban',
  Equity: 'Ekuitas',
  Income: 'Pendapatan',
  Expense: 'Beban',
};

// Map ERPNext account_type to Indonesian sub-category for grouping
const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  'Bank': 'Bank',
  'Cash': 'Kas',
  'Receivable': 'Piutang Usaha',
  'Payable': 'Hutang Usaha',
  'Stock': 'Persediaan',
  'Fixed Asset': 'Aset Tetap',
  'Accumulated Depreciation': 'Akumulasi Penyusutan',
  'Tax': 'Pajak',
  'Chargeable': 'Biaya yang Dapat Dibebankan',
  'Capital Work in Progress': 'Aset dalam Pembangunan',
  'Cost of Goods Sold': 'Harga Pokok Penjualan',
  'Depreciation': 'Penyusutan',
  'Expense Account': 'Beban Operasional',
  'Expenses Included In Asset Valuation': 'Beban Penilaian Aset',
  'Income Account': 'Pendapatan Usaha',
  'Temporary': 'Sementara',
  'Round Off': 'Pembulatan',
  'Write Off': 'Penghapusan',
  'Equity': 'Ekuitas',
};

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const report = searchParams.get('report');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company || !report) {
      return NextResponse.json(
        { success: false, message: 'Company and report type are required' },
        { status: 400 }
      );
    }

    if (!['trial-balance', 'balance-sheet', 'profit-loss'].includes(report)) {
      return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch Account master for this company to get root_type and account_type
    const accountsData = await client.getList('Account', {
      fields: ['name', 'account_name', 'account_type', 'root_type', 'parent_account', 'is_group', 'account_number'],
      filters: [['company', '=', company], ['is_group', '=', 0]],
      limit_page_length: 2000
    });

    // Build lookup map: account name (full) → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    accountsData.forEach((acc: AccountMaster) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Fetch GL Entries
    const glFilters: any[] = [['company', '=', company]];
    if (fromDate) {
      glFilters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      glFilters.push(['posting_date', '<=', toDate]);
    }

    const glData = await client.getList('GL Entry', {
      fields: ['account', 'debit', 'credit', 'posting_date'],
      filters: glFilters,
      order_by: 'account',
      limit_page_length: 5000
    });

    // Aggregate GL entries by account
    const accountMap = new Map<string, { account: string; debit: number; credit: number }>();
    glData.forEach((entry: GlEntry) => {
      if (!accountMap.has(entry.account)) {
        accountMap.set(entry.account, { account: entry.account, debit: 0, credit: 0 });
      }
      const row = accountMap.get(entry.account)!;
      row.debit += entry.debit || 0;
      row.credit += entry.credit || 0;
    });

    let processedData: unknown[] = [];

    if (report === 'trial-balance') {
      processedData = Array.from(accountMap.values())
        .map(row => {
          const master = accountMasterMap.get(row.account);
          const accountName = master?.account_name || row.account;
          const accountNumber = master?.account_number || '';
          const rootType = master?.root_type || '';
          const accountType = master?.account_type || '';
          return {
            account: row.account,
            account_name: accountName,
            account_number: accountNumber,
            root_type: rootType,
            account_type: accountType,
            debit: row.debit,
            credit: row.credit,
            balance: row.debit - row.credit,
          };
        })
        .sort((a, b) => a.account.localeCompare(b.account));
    } else if (report === 'balance-sheet') {
      // Bug #1 Fix: Calculate Net P/L from Income and Expense accounts
      let netProfitLoss = 0;
      Array.from(accountMap.values()).forEach(row => {
        const master = accountMasterMap.get(row.account);
        const rootType = master?.root_type || '';
        if (rootType === 'Income') {
          // Income: credit normal balance
          netProfitLoss += (row.credit - row.debit);
        } else if (rootType === 'Expense') {
          // Expense: debit normal balance (subtract from net P/L)
          netProfitLoss -= (row.debit - row.credit);
        }
      });

      // Process Balance Sheet accounts
      const balanceSheetAccounts = Array.from(accountMap.values())
        .map(row => {
          const master = accountMasterMap.get(row.account);
          const rootType = master?.root_type || '';
          if (!BALANCE_SHEET_ROOT_TYPES.includes(rootType)) return null;
          const balance = row.debit - row.credit;
          if (balance === 0) return null;
          const accountType = master?.account_type || '';
          const subCategory = ACCOUNT_TYPE_LABEL[accountType] || accountType || ROOT_TYPE_LABEL[rootType] || rootType;
          return {
            account: row.account,
            account_name: master?.account_name || row.account,
            account_number: master?.account_number || '',
            root_type: rootType,
            root_type_label: ROOT_TYPE_LABEL[rootType] || rootType,
            account_type: accountType,
            sub_category: subCategory,
            balance: balance,
          };
        })
        .filter(Boolean);

      // Add Net P/L as a virtual Equity account if non-zero
      // Net P/L is added to Equity with the SAME sign (profit = positive equity, loss = negative equity)
      if (Math.abs(netProfitLoss) > 0.01) {
        balanceSheetAccounts.push({
          account: '__net_profit_loss__',
          account_name: 'Laba/Rugi Berjalan',
          account_number: '',
          root_type: 'Equity',
          root_type_label: 'Ekuitas',
          account_type: 'Equity',
          sub_category: 'Laba/Rugi Berjalan',
          balance: netProfitLoss, // Positive for profit, negative for loss (will reduce equity)
        });
      }

      processedData = balanceSheetAccounts.sort((a: any, b: any) => a.account.localeCompare(b.account));
    } else if (report === 'profit-loss') {
      processedData = Array.from(accountMap.values())
        .map(row => {
          const master = accountMasterMap.get(row.account);
          const rootType = master?.root_type || '';
          if (!PL_ROOT_TYPES.includes(rootType)) return null;
          // Income: credit normal balance → amount = credit - debit (positive = income)
          // Expense: debit normal balance → amount = debit - credit (positive = expense)
          const amount = rootType === 'Income'
            ? (row.credit - row.debit)
            : (row.debit - row.credit);
          if (amount === 0) return null;
          const accountType = master?.account_type || '';
          const subCategory = ACCOUNT_TYPE_LABEL[accountType] || accountType || ROOT_TYPE_LABEL[rootType] || rootType;
          return {
            account: row.account,
            account_name: master?.account_name || row.account,
            account_number: master?.account_number || '',
            root_type: rootType,
            root_type_label: ROOT_TYPE_LABEL[rootType] || rootType,
            account_type: accountType,
            sub_category: subCategory,
            amount: amount,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.account.localeCompare(b.account));
    }

    return NextResponse.json({ success: true, data: processedData });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
