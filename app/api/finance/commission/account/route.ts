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

    // Search for Hutang Komisi Sales account (Payable type, not group)
    // Try multiple search patterns
    const searchPatterns = [
      // Pattern 1: Account name containing "Komisi" and account_type = Payable
      `[["account_type","=","Payable"],["company","=","${company}"],["is_group","=",0],["name","like","%Komisi%"]]`,
      // Pattern 2: Account name containing "Hutang Komisi"
      `[["account_type","=","Payable"],["company","=","${company}"],["is_group","=",0],["name","like","%Hutang Komisi%"]]`,
      // Pattern 3: Parent account is 2115 - Hutang Lain-lain
      `[["account_type","=","Payable"],["company","=","${company}"],["is_group","=",0],["parent_account","like","%2115%"]]`,
    ];

    let commissionAccount = null;

    for (const filters of searchPatterns) {
      const res = await fetch(
        `${ERPNEXT_API_URL}/api/resource/Account?filters=${encodeURIComponent(filters)}&fields=["name","account_name","account_number","parent_account"]&limit=5`,
        { headers }
      );
      const data = await res.json();
      
      if (data.data && data.data.length > 0) {
        // Find account with "Komisi" in name
        commissionAccount = data.data.find((a: any) => 
          a.name.toLowerCase().includes('komisi') || 
          a.account_name?.toLowerCase().includes('komisi')
        ) || data.data[0];
        break;
      }
    }

    // If still not found, try all Payable accounts and look for commission-related
    if (!commissionAccount) {
      const res = await fetch(
        `${ERPNEXT_API_URL}/api/resource/Account?filters=[["account_type","=","Payable"],["company","=","${company}"],["is_group","=",0]]&fields=["name","account_name","account_number","parent_account"]&limit=20`,
        { headers }
      );
      const data = await res.json();
      commissionAccount = data.data?.find((a: any) => 
        a.name.toLowerCase().includes('komisi') || 
        a.account_name?.toLowerCase().includes('komisi')
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        account: commissionAccount,
        account_name: commissionAccount?.name || `2150.0001 - Hutang Komisi Sales - ${company.split(' ').map((w: string) => w[0]).join('').toUpperCase()}`,
      }
    });
  } catch (error) {
    console.error('Commission account lookup API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
