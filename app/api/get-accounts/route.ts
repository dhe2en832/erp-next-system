import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('Getting expense accounts...');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get expense accounts
    const accountResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name"]&filters=[["account_type","=","Expense Account"]]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // Get cost centers
    const costCenterResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Cost Center?fields=["name","cost_center_name"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const accountData = accountResponse.ok ? await accountResponse.json() : { data: [] };
    const costCenterData = costCenterResponse.ok ? await costCenterResponse.json() : { data: [] };
    
    console.log('Account Data:', accountData);
    console.log('Cost Center Data:', costCenterData);
    
    return NextResponse.json({
      success: true,
      expense_accounts: accountData.data || [],
      cost_centers: costCenterData.data || []
    });

  } catch (error: unknown) {
    console.error('Get accounts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
