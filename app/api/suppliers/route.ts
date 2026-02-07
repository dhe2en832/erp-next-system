import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '500';

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build filters - Enable search with proper structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = [];
    
    if (search) {
      // Search by both name and supplier_name for better user experience
      filters.push([
        "and",
        ["supplier_type", "=", "Company"],
        [
          "or", 
          ["name", "like", `%${search}%`],
          ["supplier_name", "like", `%${search}%`]
        ]
      ]);
    } else {
      // If no search, just filter by supplier_type
      filters.push(["supplier_type", "=", "Company"]);
    }

    const filtersString = filters.length > 0 ? JSON.stringify(filters) : '[]';

    // Build ERPNext URL
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier?fields=["name","supplier_name"]&filters=${encodeURIComponent(filtersString)}&order_by=supplier_name&limit_page_length=${limit}`;

    console.log('Suppliers ERPNext URL:', erpNextUrl);

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
    console.log('Suppliers response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        message: 'Suppliers fetched successfully'
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
