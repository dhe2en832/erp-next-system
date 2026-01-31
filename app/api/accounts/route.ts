import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Accounts API - Company:', company);
    console.log('Accounts API - Search:', search);

    // Build filters array
    const filters = [
      ['company', '=', company],
      ['is_group', '=', 0] // Only leaf accounts (not groups)
    ];

    // Add search filter if provided
    if (search) {
      filters.push(['account_name', 'like', `%${search}%`]);
    }

    console.log('Accounts API - Final Filters:', filters);

    // Get accounts from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","parent_account","company","is_group"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=account_name asc&limit_page_length=100`;

    console.log('Accounts API - URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
    });

    console.log('Accounts API - Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Accounts API - Response Data:', data);

      if (data.success && data.data) {
        // Format accounts for dropdown
        const formattedAccounts = data.data.map((account: any) => ({
          name: account.name,
          account_name: account.account_name,
          account_type: account.account_type,
          parent_account: account.parent_account,
          company: account.company,
          display_name: `${account.name} - ${account.account_name}`
        }));

        return NextResponse.json({
          success: true,
          data: formattedAccounts,
          message: `Found ${formattedAccounts.length} accounts`
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No accounts found',
          data: []
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Accounts API - Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch accounts from ERPNext',
        error: errorText
      });
    }

  } catch (error: any) {
    console.error('Accounts API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
