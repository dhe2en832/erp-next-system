import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Get session cookie for authentication
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    console.log('Fetching PR list for company:', company);

    // Try ERPNext custom method first
    try {
      const erpNextUrl = `${ERPNEXT_API_URL}/api/method/fetch_pr_list_for_pi?company=${encodeURIComponent(company)}`;
      console.log('Trying custom method:', erpNextUrl);
      
      const response = await fetch(erpNextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
        credentials: 'include',
      });

      console.log('ERPNext Custom Method Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('ERPNext Custom Method Response:', data);
        console.log('Custom method returned items:', data.message?.data?.length || 0);
        
        // Add debug info to response
        const debuggedData = {
          ...data,
          debug: {
            method: 'custom',
            source: 'fetch_pr_list_for_pi',
            items_count: data.message?.data?.length || 0,
            erpNext_url: erpNextUrl
          }
        };
        
        return NextResponse.json(debuggedData);
      } else {
        const errorData = await response.text();
        console.log('Custom method failed:', errorData);
      }
    } catch (customMethodError) {
      console.log('Custom method not available, using standard API...', customMethodError);
    }

    // Fallback to standard ERPNext API
    console.log('Using standard ERPNext API for Purchase Receipts...');
    
    // Get submitted Purchase Receipts that can be billed
    const filters = JSON.stringify([
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Completed", "To Bill"]]
    ]);
    
    const standardUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Receipt?fields=["name","supplier","supplier_name","posting_date","company","grand_total","per_billed"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=100`;
    
    console.log('Standard API URL:', standardUrl);
    console.log('Filters being used:', filters);
    
    const response = await fetch(standardUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
    });

    console.log('Standard API Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API Error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch purchase receipts list' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Standard API Response:', data);
    console.log('Standard API returned items:', data.data?.length || 0);

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: (data.data || []).map((pr: any) => ({
          name: pr.name,
          supplier: pr.supplier,
          supplier_name: pr.supplier_name,
          posting_date: pr.posting_date,
          company: pr.company,
          grand_total: pr.grand_total,
          per_billed: pr.per_billed || 0 // Use actual value or default to 0
        }))
      }
    };

    console.log('Transformed data items:', transformedData.message.data.length);
    console.log('Final transformed data:', JSON.stringify(transformedData, null, 2));

    // Add debug info to response
    const debuggedData = {
      ...transformedData,
      debug: {
        method: 'standard',
        source: 'standard_api',
        items_count: transformedData.message.data.length,
        erpNext_url: standardUrl,
        filters: filters
      }
    };

    return NextResponse.json(debuggedData);

  } catch (error) {
    console.error('PR List API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
