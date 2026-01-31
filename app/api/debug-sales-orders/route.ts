import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Debug Sales Orders - Company:', company);
    
    // Test 1: Get ALL sales orders untuk melihat status yang tersedia
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","delivery_date"]&limit_page_length=10`;
    
    if (company) {
      erpNextUrl += `&filters=[["company","=","${company}"]]`;
    }
    
    console.log('Debug Sales Orders - URL (All):', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Debug Sales Orders - Response:', { status: response.status, data });

    if (response.ok && data.data) {
      // Extract unique statuses
      const statuses = [...new Set(data.data.map((so: any) => so.status))];
      const ordersByStatus = data.data.reduce((acc: any, so: any) => {
        if (!acc[so.status]) acc[so.status] = [];
        acc[so.status].push(so);
        return acc;
      }, {});

      return NextResponse.json({
        success: true,
        debug: {
          company,
          total_orders: data.data.length,
          unique_statuses: statuses,
          orders_by_status: Object.keys(ordersByStatus).map(status => ({
            status,
            count: ordersByStatus[status].length,
            orders: ordersByStatus[status].map((so: any) => ({
              name: so.name,
              customer: so.customer,
              status: so.status,
              grand_total: so.grand_total
            }))
          })),
          all_orders: data.data.map((so: any) => ({
            name: so.name,
            customer: so.customer,
            status: so.status,
            grand_total: so.grand_total,
            transaction_date: so.transaction_date,
            delivery_date: so.delivery_date
          }))
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch sales orders',
          error: data.message || 'Unknown error'
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Debug Sales Orders API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
