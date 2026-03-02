import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Validate date range (Bug #4 fix)
    const { validateDateRange } = await import('@/utils/report-validation');
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Bug #6 fix: Query Account master to get Cash/Bank accounts by account_type
    const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=${encodeURIComponent(JSON.stringify(['name']))}&filters=${encodeURIComponent(JSON.stringify([['company', '=', company], ['account_type', 'in', ['Cash', 'Bank']]]))}&limit_page_length=500`;

    const accountsResp = await fetch(accountsUrl, { method: 'GET', headers });
    if (!accountsResp.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch cash/bank accounts' },
        { status: accountsResp.status }
      );
    }

    const accountsData = await accountsResp.json();
    const cashBankAccounts = (accountsData.data || []).map((acc: any) => acc.name);

    // Handle empty cashBankAccounts case
    if (cashBankAccounts.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch GL Entries for these accounts
    const fields = ['account', 'posting_date', 'debit', 'credit', 'voucher_type', 'voucher_no'];
    const filters: any[] = [
      ['company', '=', company],
      ['account', 'in', cashBankAccounts],
    ];

    if (fromDate) filters.push(['posting_date', '>=', fromDate]);
    if (toDate) filters.push(['posting_date', '<=', toDate]);

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=500`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      // Sort entries by posting_date ascending for proper balance calculation
      const sortedEntries = (data.data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.posting_date).getTime();
        const dateB = new Date(b.posting_date).getTime();
        return dateA - dateB;
      });

      // Calculate running balance
      let runningBalance = 0;
      const entries = sortedEntries.map((entry: any) => {
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
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch cash flow data' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Cash Flow Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
