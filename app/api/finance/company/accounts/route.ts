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
    // console.log('=== GET COMPANY ACCOUNTS ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      if (!sid) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized - No session or API key found' },
          { status: 401 }
        );
      }
    }

    const client = await getERPNextClientForRequest(request);

    interface CompanyData {
      default_bank_account?: string;
      default_cash_account?: string;
      default_receivable_account?: string;
      default_payable_account?: string;
      default_advance_account?: string;
    }

    // Fetch company default accounts from ERPNext
    const companyData = await client.get<CompanyData>('Company', company);

    if (companyData) {
      // Fetch available accounts for dropdowns
      const accountsData = await client.getList('Account', {
        fields: ['name', 'account_type', 'root_type', 'company'],
        filters: [
          ['company', '=', company],
          ['is_group', '=', 0]
        ],
        order_by: 'name',
        limit_page_length: 500
      });
      
      const companyAccounts = {
        default_bank_account: companyData.default_bank_account,
        default_cash_account: companyData.default_cash_account,
        default_receivable_account: companyData.default_receivable_account,
        default_payable_account: companyData.default_payable_account,
        default_advance_account: companyData.default_advance_account,
        available_accounts: accountsData || []
      };

      return NextResponse.json({
        success: true,
        data: companyAccounts,
        message: `Found ${accountsData?.length || 0} available accounts`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch company accounts'
      }, { status: 400 });
    }

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/company/accounts', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
