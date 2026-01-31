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

    console.log('Debug Filter - Company:', company);
    
    // Test 1: Get ALL sales orders untuk melihat status dan docstatus yang tersedia
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","docstatus","delivery_date"]&limit_page_length=20`;
    
    if (company) {
      erpNextUrl += `&filters=[["company","=","${company}"]]`;
    }
    
    console.log('Debug Filter - URL (All):', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Debug Filter - Response:', { status: response.status, data });

    if (response.ok && data.data) {
      // Group by status and docstatus
      const statusDocstatusGroups = data.data.reduce((acc: any, so: any) => {
        const key = `${so.status} (docstatus: ${so.docstatus})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(so);
        return acc;
      }, {});

      // Test 2: Test dengan filter yang kita gunakan
      const testFilters = [
        ["company", "=", company],
        ["docstatus", "=", "1"],
        ["status", "=", "To Deliver and Bill"]
      ];
      
      const testUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","docstatus","delivery_date"]&filters=${JSON.stringify(testFilters)}`;
      
      console.log('Debug Filter - Test URL:', testUrl);
      
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers,
      });
      
      const testData = await testResponse.json();
      console.log('Debug Filter - Test Response:', { status: testResponse.status, data: testData });

      return NextResponse.json({
        success: true,
        debug: {
          company,
          total_orders: data.data.length,
          status_docstatus_groups: Object.keys(statusDocstatusGroups).map(key => ({
            group: key,
            count: statusDocstatusGroups[key].length,
            orders: statusDocstatusGroups[key].map((so: any) => ({
              name: so.name,
              customer: so.customer,
              status: so.status,
              docstatus: so.docstatus,
              grand_total: so.grand_total
            }))
          })),
          test_filter: {
            filters: testFilters,
            url: testUrl,
            result_count: testData.data?.length || 0,
            result_status: testResponse.status,
            results: testData.data?.map((so: any) => ({
              name: so.name,
              customer: so.customer,
              status: so.status,
              docstatus: so.docstatus,
              grand_total: so.grand_total
            })) || []
          },
          all_orders_raw: data.data.map((so: any) => ({
            name: so.name,
            customer: so.customer,
            status: so.status,
            docstatus: so.docstatus,
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
    console.error('Debug Filter API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
