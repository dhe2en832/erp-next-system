import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Check if Sales Team is a child table
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","sales_team"]&limit_page_length=1`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();
    console.log('Sales Team Debug Response:', { status: response.status, data });

    // Also check Sales Team doctype
    const teamUrl = `${ERPNEXT_API_URL}/api/resource/Sales Team?fields=["*"]&limit_page_length=1`;
    const teamResponse = await fetch(teamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const teamData = await teamResponse.json();

    return NextResponse.json({
      success: true,
      salesOrderData: data,
      salesTeamData: teamData,
    });
  } catch (error) {
    console.error('Sales Team Debug Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
