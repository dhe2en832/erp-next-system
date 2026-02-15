import { NextRequest, NextResponse } from 'next/server';

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
    const company = searchParams.get('company') || 'Berkat Abadi Cirebon';

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch expense accounts (account type: Expense Account or Expense)
    const expenseRes = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Account?filters=[["account_type","=","Expense Account"]]&fields=["name","account_name","account_number"]&limit=10`,
      { headers }
    );

    // Fetch cash/bank accounts
    const cashRes = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Account?filters=[["account_type","in",["Cash","Bank"]]]&fields=["name","account_name","account_number"]&limit=10`,
      { headers }
    );

    // Fetch cost centers
    const ccRes = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Cost Center?fields=["name","cost_center_name"]&limit=10`,
      { headers }
    );

    const [expenseData, cashData, ccData] = await Promise.all([
      expenseRes.json(),
      cashRes.json(),
      ccRes.json()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        expense_accounts: expenseData.data || [],
        cash_bank_accounts: cashData.data || [],
        cost_centers: ccData.data || [],
      }
    });
  } catch (error) {
    console.error('Commission accounts API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
