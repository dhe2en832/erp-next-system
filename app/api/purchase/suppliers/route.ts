import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Suppliers API - ERPNext URL:', ERPNEXT_API_URL);
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '500';

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication (like payment API)
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log('Suppliers API - API Key Available:', !!apiKey);
    console.log('Suppliers API - API Secret Available:', !!apiSecret);
    console.log('Suppliers API - Session ID Available:', !!sid);
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for suppliers');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for suppliers');
    } else {
      console.log('No authentication found - returning 401');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build filters with simple structure (like customers API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = [];
    
    // Always filter by supplier_type first
    filters.push(["supplier_type", "=", "Company"]);
    
    if (search && search.trim()) {
      // Add search condition - search by name first (simple approach)
      const searchTrim = search.trim();
      filters.push(["name", "like", `%${searchTrim}%`]);
    }

    console.log('Suppliers API - Search term:', search);
    console.log('Suppliers API - Company filter:', company);
    console.log('Suppliers API - Final filters:', filters);

    const filtersString = JSON.stringify(filters);

    // Build ERPNext URL sederhana - hanya ambil name dan supplier_name
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier?fields=["name","supplier_name"]&filters=${encodeURIComponent(filtersString)}&order_by=supplier_name&limit_page_length=${limit}`;

    console.log('Suppliers ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Suppliers response:', data);
    console.log('First supplier data sample:', data.data && data.data.length > 0 ? data.data[0] : 'No data');
    
    // Log all available fields untuk debugging
    if (data.data && data.data.length > 0) {
      console.log('Available fields in supplier:', Object.keys(data.data[0]));
    }

    // If search is provided, also search by supplier_name and combine results
    let finalData = data.data || [];
    
    if (search && search.trim() && response.ok) {
      try {
        console.log('Performing hybrid search - also searching by supplier_name');
        
        // Second API call to search by supplier_name
        const supplierNameFilters = [
          ["supplier_type", "=", "Company"],
          ["supplier_name", "like", `%${search.trim()}%`]
        ];
        
        const supplierNameFiltersString = JSON.stringify(supplierNameFilters);
        const supplierNameUrl = `${ERPNEXT_API_URL}/api/resource/Supplier?fields=["name","supplier_name"]&filters=${encodeURIComponent(supplierNameFiltersString)}&order_by=supplier_name&limit_page_length=${limit}`;
        
        console.log('Supplier name search URL:', supplierNameUrl);
        
        const supplierNameResponse = await fetch(supplierNameUrl, {
          method: 'GET',
          headers,
        });
        
        if (supplierNameResponse.ok) {
          const supplierNameData = await supplierNameResponse.json();
          console.log('Supplier name search response:', supplierNameData);
          
          // Combine and deduplicate results
          const supplierNameResults = supplierNameData.data || [];
          const combinedResults = [...finalData, ...supplierNameResults];
          
          // Remove duplicates based on name field
          const uniqueResults = combinedResults.filter((item, index, self) =>
            index === self.findIndex((t) => t.name === item.name)
          );
          
          finalData = uniqueResults;
          console.log('Combined unique results:', finalData.length);
        }
      } catch (error) {
        console.error('Error in hybrid search:', error);
        // Continue with original results if hybrid search fails
      }
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: finalData,
        message: `Suppliers fetched successfully${search ? ' (hybrid search)' : ''}`
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch suppliers' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Suppliers API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const sid = request.cookies.get('sid')?.value;

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
    // Let ERPNext generate name via naming series
    delete body.name;
    if (!body.naming_series) {
      body.naming_series = 'SUP-.#####';
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier`;

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
        { success: false, message: data.message || data.exc || 'Failed to create supplier' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Supplier POST API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
