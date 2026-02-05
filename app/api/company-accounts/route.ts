import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET COMPANY ACCOUNTS ===');
    
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for company accounts');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for company accounts');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Fetch company default accounts from ERPNext
    // Get company details with default accounts
    const companyUrl = `${ERPNEXT_API_URL}/api/resource/Company/${encodeURIComponent(company)}?fields=["default_bank_account","default_cash_account","default_receivable_account","default_payable_account","default_advance_account"]`;
    
    console.log('Company Accounts ERPNext URL:', companyUrl);

    const response = await fetch(companyUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    console.log('Company Accounts Response Status:', response.status);

    if (response.ok && data.data) {
      // Fetch available accounts for dropdowns
      const accountsUrl = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_type","company"]&filters=[["company","=", "${company}"],["is_group","=",0]]&order_by=name&limit_page_length=100`;
      
      console.log('Available Accounts ERPNext URL:', accountsUrl);
      
      const accountsResponse = await fetch(accountsUrl, {
        method: 'GET',
        headers: headers,
      });
      
      const accountsData = await accountsResponse.json();
      
      const companyAccounts = {
        ...data.data,
        available_accounts: accountsData.data || []
      };

      console.log('✅ Company accounts loaded:', {
        default_accounts: {
          bank: data.data.default_bank_account,
          cash: data.data.default_cash_account,
          receivable: data.data.default_receivable_account,
          payable: data.data.default_payable_account,
          advance: data.data.default_advance_account
        },
        available_count: accountsData.data?.length || 0
      });

      return NextResponse.json({
        success: true,
        data: companyAccounts,
        message: `Found ${accountsData.data?.length || 0} available accounts`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to fetch company accounts',
        error: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Company Accounts Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
