import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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

interface BalanceSheetLine {
  account: string;
  account_name: string;
  account_number: string;
  account_type: string;
  amount: number;
  formatted_amount: string;
}

interface BalanceSheetSummary {
  total_current_assets: number;
  total_fixed_assets: number;
  total_assets: number;
  total_current_liabilities: number;
  total_long_term_liabilities: number;
  total_liabilities: number;
  total_equity: number;
  total_liabilities_and_equity: number;
}

/**
 * Format currency in Indonesian Rupiah format
 * @param amount - The amount to format
 * @returns Formatted string like "Rp 1.000.000,00"
 */
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  
  return `Rp ${formatted}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const asOfDate = searchParams.get('as_of_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) {
      _h['Authorization'] = `token ${_ak}:${_as}`;
    } else {
      _h['Cookie'] = `sid=${sid}`;
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Fetch Account master for this company
    const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","root_type","parent_account","is_group","account_number"]&filters=${encodeURIComponent(`[["company","=","${company}"],["is_group","=",0]]`)}&limit_page_length=2000`;
    const accountsResp = await fetch(accountsUrl, { method: 'GET', headers: _h });
    const accountsData = await accountsResp.json();

    if (!accountsResp.ok) {
      return NextResponse.json(
        { success: false, message: accountsData.exc || accountsData.message || 'Failed to fetch accounts' },
        { status: accountsResp.status }
      );
    }

    // Build lookup map: account name → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    (accountsData.data || []).forEach((acc: AccountMaster) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Build GL Entry filters with as_of_date
    const glFilters: any[] = [['company', '=', company]];
    if (asOfDate) {
      glFilters.push(['posting_date', '<=', asOfDate]);
    }

    const glUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${encodeURIComponent(JSON.stringify(glFilters))}&order_by=account&limit_page_length=5000`;

    const glResp = await fetch(glUrl, { method: 'GET', headers: _h });
    const glData = await glResp.json();

    if (!glResp.ok) {
      return NextResponse.json(
        { success: false, message: glData.exc || glData.message || 'Failed to fetch GL entries' },
        { status: glResp.status }
      );
    }

    // Aggregate GL entries by account
    const accountMap = new Map<string, { account: string; debit: number; credit: number }>();
    (glData.data || []).forEach((entry: GlEntry) => {
      if (!accountMap.has(entry.account)) {
        accountMap.set(entry.account, { account: entry.account, debit: 0, credit: 0 });
      }
      const row = accountMap.get(entry.account)!;
      row.debit += entry.debit || 0;
      row.credit += entry.credit || 0;
    });

    // Process accounts for Balance Sheet
    const currentAssets: BalanceSheetLine[] = [];
    const fixedAssets: BalanceSheetLine[] = [];
    const currentLiabilities: BalanceSheetLine[] = [];
    const longTermLiabilities: BalanceSheetLine[] = [];
    const equityAccounts: BalanceSheetLine[] = [];

    Array.from(accountMap.values()).forEach(row => {
      const master = accountMasterMap.get(row.account);
      if (!master) return;

      const rootType = master.root_type;
      const accountType = master.account_type;

      // Only process Asset, Liability, and Equity accounts
      if (rootType !== 'Asset' && rootType !== 'Liability' && rootType !== 'Equity') return;

      // Calculate amount based on normal balance
      // Asset: debit normal balance → amount = debit - credit
      // Liability: credit normal balance → amount = credit - debit
      // Equity: credit normal balance → amount = credit - debit
      const amount = rootType === 'Asset'
        ? (row.debit - row.credit)
        : (row.credit - row.debit);

      if (amount === 0) return;

      const line: BalanceSheetLine = {
        account: row.account,
        account_name: master.account_name || row.account,
        account_number: master.account_number || '',
        account_type: accountType || '',
        amount: amount,
        formatted_amount: formatCurrency(amount),
      };

      // Categorize accounts
      if (rootType === 'Asset') {
        // Current Assets: Cash, Bank, Receivable, Stock, Tax (1410 - Pajak Dibayar Dimuka)
        if (
          accountType === 'Cash' ||
          accountType === 'Bank' ||
          accountType === 'Receivable' ||
          accountType === 'Stock' ||
          accountType === 'Tax' ||
          row.account.includes('1410') ||
          master.account_name.toLowerCase().includes('pajak dibayar dimuka')
        ) {
          currentAssets.push(line);
        } else {
          // Fixed Assets
          fixedAssets.push(line);
        }
      } else if (rootType === 'Liability') {
        // Current Liabilities: Payable, Tax (2210, 2230, 2240)
        if (
          accountType === 'Payable' ||
          accountType === 'Tax' ||
          row.account.includes('2210') ||
          row.account.includes('2230') ||
          row.account.includes('2240') ||
          master.account_name.toLowerCase().includes('hutang ppn') ||
          master.account_name.toLowerCase().includes('hutang pph')
        ) {
          currentLiabilities.push(line);
        } else {
          // Long-term Liabilities
          longTermLiabilities.push(line);
        }
      } else if (rootType === 'Equity') {
        equityAccounts.push(line);
      }
    });

    // Calculate summary
    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + acc.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, acc) => sum + acc.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const summary: BalanceSheetSummary = {
      total_current_assets: totalCurrentAssets,
      total_fixed_assets: totalFixedAssets,
      total_assets: totalAssets,
      total_current_liabilities: totalCurrentLiabilities,
      total_long_term_liabilities: totalLongTermLiabilities,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilitiesAndEquity,
    };

    return NextResponse.json({
      success: true,
      data: {
        current_assets: currentAssets,
        fixed_assets: fixedAssets,
        current_liabilities: currentLiabilities,
        long_term_liabilities: longTermLiabilities,
        equity: equityAccounts,
        summary: {
          ...summary,
          formatted: {
            total_current_assets: formatCurrency(summary.total_current_assets),
            total_fixed_assets: formatCurrency(summary.total_fixed_assets),
            total_assets: formatCurrency(summary.total_assets),
            total_current_liabilities: formatCurrency(summary.total_current_liabilities),
            total_long_term_liabilities: formatCurrency(summary.total_long_term_liabilities),
            total_liabilities: formatCurrency(summary.total_liabilities),
            total_equity: formatCurrency(summary.total_equity),
            total_liabilities_and_equity: formatCurrency(summary.total_liabilities_and_equity),
          },
        },
        as_of_date: asOfDate,
      },
    });
  } catch (error) {
    console.error('Balance Sheet Report API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
