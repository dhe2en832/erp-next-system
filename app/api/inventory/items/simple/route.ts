import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters from frontend
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    const company = searchParams.get('company');
    const searchTerm = searchParams.get('search');

    console.log('Testing Items with pagination...');
    console.log('Parameters:', { limit, start, company, searchTerm });

    // Get total count using pagination loop
    let totalCount = 0;
    try {
      totalCount = 0;
      let pageStart = 0;
      const pageSize = 100;
      
      while (true) {
        let pageUrl = `${ERPNEXT_API_URL}/api/resource/Item?fields=["name"]&limit_page_length=${pageSize}&limit_start=${pageStart}`;
        if (searchTerm) {
          pageUrl += `&filters=[["item_name","like","%${searchTerm}%"]]`;
        }        
        const pageResponse = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sid=${sid}`,
          },
        });
        const pageData = await pageResponse.json();
        
        if (!pageResponse.ok || !pageData.data || pageData.data.length === 0) {
          break;
        }
        
        totalCount += pageData.data.length;
        
        if (pageData.data.length < pageSize) {
          break;
        }
        
        pageStart += pageSize;
      }
      console.log('Total count:', totalCount, searchTerm ? `(search: ${searchTerm})` : '');
    } catch (error) {
      console.log('Error getting total count:', error);
    }

    // Build ERPNext URL with dynamic pagination
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Item?fields=["item_code","item_name","item_group","stock_uom","opening_stock","last_purchase_rate"]&limit_page_length=${limit}&limit_start=${start}`;
    
    console.log('ERPNext URL:', erpNextUrl);
    
    // Add search filter if provided (remove company filter)
    if (searchTerm) {
      erpNextUrl += `&filters=[["item_name","like","%${searchTerm}%"]]`;
      console.log('Search filter applied for:', searchTerm);
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Items API - Status:', response.status);
    console.log('Items API - Full response structure:', JSON.stringify(data, null, 2));
    
    // Log structure details
    if (data.data && data.data.length > 0) {
      console.log('First item structure:', JSON.stringify(data.data[0], null, 2));
      console.log('Available fields:', Object.keys(data.data[0]));
      console.log('Price fields check:', {
        last_purchase_rate: data.data[0].last_purchase_rate,
        valuation_rate: data.data[0].valuation_rate
      });
    }

    if (response.ok) {
      const totalRecords = totalCount || data.data?.length || 0;
      console.log('API Response - Total records:', totalRecords);
      console.log('API Response - Data length:', data.data?.length || 0);
      
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: totalRecords,
        message: 'Items fetched successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch Items' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Items simple test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
