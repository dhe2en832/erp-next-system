import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '20';
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=${limit}`;
    
    // Build filters array - Use simple approach that works
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = [];
    
    console.log('DEBUG - search param:', search);
    console.log('DEBUG - search.trim():', search?.trim());
    console.log('DEBUG - search condition:', search && search.trim());
    
    if (search && search.trim()) {
      const searchTrim = search.trim();
      console.log('DEBUG - Building search filter for:', searchTrim);
      
      // Simple search by customer_name first
      filters.push(["customer_name", "like", `%${searchTrim}%`]);
      
      console.log('DEBUG - Filters after search:', filters);
    }
    
    // Add company filter if provided - TEMPORARILY DISABLED FOR TESTING
    // if (company) {
    //   if (filters.length > 0) {
    //     // Combine search and company filters with AND
    //     const combinedFilter = [
    //       "and",
    //       ["customer_group", "=", company],
    //       filters[0] // Get the search filter
    //     ];
    //     filters.length = 0; // Clear filters array
    //     filters.push(combinedFilter);
    //   } else {
    //     // Only company filter
    //     filters.push(["customer_group", "=", company]);
    //   }
    // }
    
    if (filters.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    console.log('Customers ERPNext URL:', erpNextUrl);
    console.log('Request params:', { search, limit, company });
    console.log('Search term value:', search);
    console.log('Search term trimmed:', search?.trim());
    console.log('Filters being applied:', filters);
    console.log('Final URL:', erpNextUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try session-based authentication first
    if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication');
    } else {
      // Fallback to API key authentication
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;
      
      if (apiKey && apiSecret) {
        headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
        console.log('Using API key authentication');
      } else {
        console.log('No authentication available');
        return NextResponse.json(
          { success: false, message: 'No authentication available' },
          { status: 401 }
        );
      }
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    console.log('Customers API Raw Response Status:', response.status);
    console.log('Customers API Raw Response Headers:', Object.fromEntries(response.headers.entries()));

    let data;
    try {
      const responseText = await response.text();
      console.log('Customers API Raw Response Text:', responseText);
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse API response:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid API response format' },
        { status: 500 }
      );
    }

    // If search filter causes error, try without filter
    if (!response.ok && search && search.trim()) {
      console.log('🔄 Search filter failed, trying without filter...');
      const fallbackUrl = `${ERPNEXT_API_URL}/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=${limit}`;
      
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers,
      });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log('✅ Fallback successful, got customers:', fallbackData.data?.length || 0);
        return NextResponse.json({
          success: true,
          data: fallbackData.data || [],
        });
      }
    }

    console.log('Customers API Parsed Response:', { 
      status: response.status, 
      success: response.ok,
      dataLength: data.data?.length || 0,
      hasData: !!data.data,
      message: data.message,
      excType: data.exc_type,
      data: data 
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      const errorMessage = data.message || data.exc_type || 'Failed to fetch customers';
      console.error('❌ Customers API Error Details:', {
        status: response.status,
        message: errorMessage,
        excType: data.exc_type,
        data: data
      });
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Customers API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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

    const body = await request.json();
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer`;

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: body }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || data.exc || 'Failed to create customer' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Customer POST API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
