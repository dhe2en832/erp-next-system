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
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const report = searchParams.get('report');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) { _h['Authorization'] = `token ${_ak}:${_as}`; } else { _h['Cookie'] = `sid=${sid}`; }

    if (!company || !report) {
      return NextResponse.json(
        { success: false, message: 'Company and report type are required' },
        { status: 400 }
      );
    }

    if (!['trial-balance', 'balance-sheet', 'profit-loss'].includes(report)) {
      return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });
    }

    // Fetch Account master for this company to get root_type and account_type
    const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","root_type","parent_account","is_group","account_number"]&filters=${encodeURIComponent(`[["company","=","${company}"],["is_group","=",0]]`)}&limit_page_length=2000`;
    const accountsResp = await fetch(accountsUrl, { method: 'GET', headers: _h });
    const accountsData = await accountsResp.json();

    // Build lookup map: account name (full) → master data
    const accountMasterMap = new Map<string, AccountMaster>();
    (accountsData.data || []).forEach((acc: AccountMaster) => {
      accountMasterMap.set(acc.name, acc);
    });

    // Fetch GL Entries
    const dateFilters = `${fromDate ? `,"posting_date",">=","${fromDate}"` : ''}${toDate ? `,"posting_date","<=","${toDate}"` : ''}`;
    const glFilters = encodeURIComponent(`[["company","=","${company}"]${fromDate ? `,[\"posting_date\",\">=\",\"${fromDate}\"]` : ''}${toDate ? `,[\"posting_date\",\"<=\",\"${toDate}\"]` : ''}]`);
    const glUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${glFilters}&order_by=account&limit_page_length=5000`;
    void dateFilters;

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
      processedData = Array.from(accountMap.values())
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
        .filter(Boolean)
        .sort((a: any, b: any) => a.account.localeCompare(b.account));
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
  } catch (error) {
    console.error('Financial Reports API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
