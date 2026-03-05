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
    const company = searchParams.get('company');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch expense accounts, cash/bank accounts, and cost centers in parallel
    const [expenseAccounts, cashBankAccounts, costCenters] = await Promise.all([
      // Fetch expense accounts (account type: Expense Account or Expense)
      client.getList('Account', {
        fields: ['name', 'account_name', 'account_number'],
        filters: [["account_type","=","Expense Account"]],
        limit_page_length: 10
      }),
      // Fetch cash/bank accounts
      client.getList('Account', {
        fields: ['name', 'account_name', 'account_number'],
        filters: [["account_type","in",["Cash","Bank"]]],
        limit_page_length: 10
      }),
      // Fetch cost centers
      client.getList('Cost Center', {
        fields: ['name', 'cost_center_name'],
        limit_page_length: 10
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        expense_accounts: expenseAccounts || [],
        cash_bank_accounts: cashBankAccounts || [],
        cost_centers: costCenters || [],
      }
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/commission/accounts', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
