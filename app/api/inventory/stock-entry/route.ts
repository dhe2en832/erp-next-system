import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const orderBy = searchParams.get('order_by');

    console.log('Stock Entry API Parameters:', { filters, orderBy });

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse filters array (similar to payment API)
    let filtersArray: any[] = [];
    
    if (filters) {
      try {
        // Handle URL-encoded filters
        const decodedFilters = decodeURIComponent(filters);
        filtersArray = JSON.parse(decodedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
        // Try parsing directly if decoding fails
        try {
          filtersArray = JSON.parse(filters);
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
      }
    }
    
    console.log('Parsed filters array:', filtersArray);

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Stock Entry?fields=["name","posting_date","posting_time","purpose","company","from_warehouse","to_warehouse","total_amount","docstatus"]&limit_page_length=100&order_by=posting_date desc,posting_time desc`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }

    console.log('Stock Entry ERPNext URL:', erpNextUrl);

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
    console.log('Stock Entry ERPNext Response:', {
      status: response.status,
      dataCount: data.data?.length || 0,
      firstFew: data.data?.slice(0, 3)?.map((e: any) => ({ 
        name: e.name, 
        from_warehouse: e.from_warehouse, 
        to_warehouse: e.to_warehouse,
        purpose: e.purpose
      }))
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch stock entries' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Entry API error:', error);
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

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { purpose, posting_date, posting_time, from_warehouse, to_warehouse, items, company } = body;

    // Validate based on purpose
    if (!purpose || !company) {
      return NextResponse.json(
        { success: false, message: 'Purpose and company are required' },
        { status: 400 }
      );
    }

    // Material Receipt needs to_warehouse
    if (purpose === 'Material Receipt' && !to_warehouse) {
      return NextResponse.json(
        { success: false, message: 'Target warehouse is required for Material Receipt' },
        { status: 400 }
      );
    }

    // Material Issue needs from_warehouse
    if (purpose === 'Material Issue' && !from_warehouse) {
      return NextResponse.json(
        { success: false, message: 'Source warehouse is required for Material Issue' },
        { status: 400 }
      );
    }

    // Material Transfer needs both warehouses
    if (purpose === 'Material Transfer' && (!from_warehouse || !to_warehouse)) {
      return NextResponse.json(
        { success: false, message: 'Both source and target warehouses are required for Material Transfer' },
        { status: 400 }
      );
    }

    // Calculate total quantities
    const total_qty = items.reduce((total: number, item: any) => {
      return total + (item.transfer_qty || item.qty || 0);
    }, 0);

    const entryData = {
      doctype: 'Stock Entry',
      purpose,
      posting_date,
      posting_time,
      company,
      from_warehouse,
      ...(to_warehouse && { to_warehouse }),
      total_qty,
      stock_entry_type: purpose, // Map purpose to stock_entry_type
      items: items.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        transfer_qty: item.qty, // Use qty since transfer_qty removed
        ...(item.serial_no && { serial_no: item.serial_no }),
        ...(item.batch_no && { batch_no: item.batch_no })
      }))
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Stock Entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
      body: JSON.stringify(entryData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create stock entry' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Entry creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
