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
    const company = searchParams.get('company') || 'Berkat Abadi Cirebon';

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Search for Hutang Komisi Sales account (Payable type, not group)
    // Try multiple search patterns
    const searchPatterns = [
      // Pattern 1: Account name containing "Komisi" and account_type = Payable
      [["account_type","=","Payable"],["company","=",company],["is_group","=",0],["name","like","%Komisi%"]],
      // Pattern 2: Account name containing "Hutang Komisi"
      [["account_type","=","Payable"],["company","=",company],["is_group","=",0],["name","like","%Hutang Komisi%"]],
      // Pattern 3: Parent account is 2115 - Hutang Lain-lain
      [["account_type","=","Payable"],["company","=",company],["is_group","=",0],["parent_account","like","%2115%"]],
    ];

    let commissionAccount = null;

    for (const filters of searchPatterns) {
      const data = await client.getList('Account', {
        fields: ['name', 'account_name', 'account_number', 'parent_account'],
        filters,
        limit_page_length: 5
      });
      
      if (data && data.length > 0) {
        // Find account with "Komisi" in name
        commissionAccount = data.find((a: any) => 
          a.name.toLowerCase().includes('komisi') || 
          a.account_name?.toLowerCase().includes('komisi')
        ) || data[0];
        break;
      }
    }

    // If still not found, try all Payable accounts and look for commission-related
    if (!commissionAccount) {
      const data = await client.getList('Account', {
        fields: ['name', 'account_name', 'account_number', 'parent_account'],
        filters: [["account_type","=","Payable"],["company","=",company],["is_group","=",0]],
        limit_page_length: 20
      });
      
      commissionAccount = data?.find((a: any) => 
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
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/commission/account', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
