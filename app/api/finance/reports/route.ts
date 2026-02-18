import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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

    let erpNextUrl = '';

    switch (report) {
      case 'trial-balance':
        // Simple GL Entry query with valid fields only
        erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${encodeURIComponent(`[["company","=","${company}"]${fromDate ? `,["posting_date",">=","${fromDate}"]` : ''}${toDate ? `,["posting_date","<=","${toDate}"]` : ''}]`)}&order_by=account&limit_page_length=1000`;
        break;
      
      case 'balance-sheet':
        // Use GL Entry for balance sheet calculation (filter by account type in processing)
        erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${encodeURIComponent(`[["company","=","${company}"]${fromDate ? `,["posting_date",">=","${fromDate}"]` : ''}${toDate ? `,["posting_date","<=","${toDate}"]` : ''}]`)}&order_by=account&limit_page_length=1000`;
        break;
      
      case 'profit-loss':
        // Use GL Entry for P&L calculation (filter by account type in processing)
        erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["account","debit","credit","posting_date"]&filters=${encodeURIComponent(`[["company","=","${company}"]${fromDate ? `,["posting_date",">=","${fromDate}"]` : ''}${toDate ? `,["posting_date","<=","${toDate}"]` : ''}]`)}&order_by=account&limit_page_length=1000`;
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid report type' },
          { status: 400 }
        );
    }

    console.log(`Financial Reports (${report}) ERPNext URL:`, erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: _h,
      }
    );

    const data = await response.json();
    console.log(`Financial Reports (${report}) response:`, data);

    if (response.ok) {
      let processedData = [];

      if (report === 'trial-balance') {
        // Process GL Entry data for trial balance
        const accountMap = new Map();
        
        (data.data || []).forEach((entry: { 
          account: string; 
          debit?: number; 
          credit?: number; 
          posting_date?: string;
        }) => {
          const account = entry.account;
          if (!accountMap.has(account)) {
            accountMap.set(account, {
              account: entry.account,
              account_name: entry.account, // Use account code as name
              debit: 0,
              credit: 0,
              balance: 0,
              account_type: 'Unknown'
            });
          }
          const accountEntry = accountMap.get(account);
          accountEntry.debit += entry.debit || 0;
          accountEntry.credit += entry.credit || 0;
          accountEntry.balance = accountEntry.debit - accountEntry.credit;
        });
        
        processedData = Array.from(accountMap.values());
      } else if (report === 'balance-sheet') {
        // Process GL Entry data for balance sheet - filter for Asset, Liability, Equity
        const accountMap = new Map();
        
        (data.data || []).forEach((entry: { 
          account: string; 
          debit?: number; 
          credit?: number; 
          posting_date?: string;
        }) => {
          const account = entry.account;
          if (!accountMap.has(account)) {
            accountMap.set(account, {
              account: entry.account,
              account_name: entry.account,
              balance: 0,
              account_type: 'Asset' // Default for balance sheet
            });
          }
          const accountEntry = accountMap.get(account);
          // For balance sheet: Assets = Debit - Credit, Liabilities/Equity = Credit - Debit
          const amount = (entry.debit || 0) - (entry.credit || 0);
          accountEntry.balance += amount;
        });
        
        // Filter for balance sheet accounts (simplified - would need account lookup in real implementation)
        processedData = Array.from(accountMap.values()).filter(account => 
          account.balance !== 0 // Only show accounts with balances
        );
      } else if (report === 'profit-loss') {
        // Process GL Entry data for profit & loss - filter for Income, Expense
        const accountMap = new Map();
        
        (data.data || []).forEach((entry: { 
          account: string; 
          debit?: number; 
          credit?: number; 
          posting_date?: string;
        }) => {
          const account = entry.account;
          if (!accountMap.has(account)) {
            accountMap.set(account, {
              account: entry.account,
              account_name: entry.account,
              amount: 0,
              account_type: 'Income' // Default for P&L
            });
          }
          const accountEntry = accountMap.get(account);
          // For P&L: Income = Credit - Debit, Expense = Debit - Credit
          const amount = (entry.credit || 0) - (entry.debit || 0);
          accountEntry.amount += amount;
        });
        
        // Filter for P&L accounts (simplified - would need account lookup in real implementation)
        processedData = Array.from(accountMap.values()).filter(account => 
          account.amount !== 0 // Only show accounts with amounts
        );
      } else {
        processedData = data.data || [];
      }

      return NextResponse.json({
        success: true,
        data: processedData,
        message: data.message
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || `Failed to fetch ${report}` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Financial Reports API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
