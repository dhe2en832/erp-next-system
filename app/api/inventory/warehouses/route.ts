import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]]`;
    
    // Add search filter if provided
    const search = searchParams.get('search');
    if (search) {
      filters = `[["company","=","${company}"],["warehouse_name","like","%${search}%"]]`;
    }

    // Build ERPNext URL
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Warehouse?fields=["name","warehouse_name","company","is_group","parent_warehouse"]&filters=${encodeURIComponent(filters)}&order_by=warehouse_name&limit_page_length=500`;

    console.log('Warehouses ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      }
    );

    const data = await response.json();
    console.log('Warehouses response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch warehouses' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Warehouses API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { warehouse_name, is_group, parent_warehouse, company } = body;

    if (!warehouse_name || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse name and company are required' },
        { status: 400 }
      );
    }

    // Try API Key authentication for POST (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for POST requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for warehouse POST');
    } else {
      // Fallback to session
      const cookies = request.cookies;
      const sid = cookies.get('sid')?.value;
      
      if (!sid) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication for warehouse POST');
    }

    const warehouseData = {
      doctype: 'Warehouse',
      warehouse_name,
      company,
      ...(is_group && { is_group: 1 }),
      ...(parent_warehouse && { parent_warehouse })
    };

    console.log('Creating warehouse:', warehouseData);

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Warehouse`, {
      method: 'POST',
      headers,
      body: JSON.stringify(warehouseData),
    });

    const data = await response.json();
    
    console.log('Create Warehouse Response:', {
      status: response.status,
      warehouseData,
      erpNextResponse: data
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Warehouse created successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create warehouse' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Warehouse creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, warehouse_name, is_group, parent_warehouse, company } = body;

    if (!name || !warehouse_name || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse name, ID, and company are required' },
        { status: 400 }
      );
    }

    // Try API Key authentication for PUT (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for PUT requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for warehouse PUT');
    } else {
      // Fallback to session
      const cookies = request.cookies;
      const sid = cookies.get('sid')?.value;
      
      if (!sid) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication for warehouse PUT');
    }

    const warehouseData = {
      warehouse_name,
      company,
      ...(is_group && { is_group: 1 }),
      ...(parent_warehouse && { parent_warehouse })
    };

    console.log('Updating warehouse:', { name, warehouseData });

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Warehouse/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(warehouseData),
    });

    const data = await response.json();
    
    console.log('Update Warehouse Response:', {
      status: response.status,
      name,
      warehouseData,
      erpNextResponse: data
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Warehouse updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to update warehouse' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Warehouse update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
