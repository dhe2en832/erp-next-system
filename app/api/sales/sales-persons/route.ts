import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Get sales person master data from Sales Person doctype
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Person?fields=["name","sales_person_name"]&limit_page_length=50`;
    
    if (search) {
      erpNextUrl += `&filters=[["sales_person_name","like","%${search}%"]]`;
    }

    console.log('Sales Persons ERPNext URL:', erpNextUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try session-based authentication first
    if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      // Fallback to API key authentication
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;
      
      if (apiKey && apiSecret) {
        headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      } else {
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

    const data = await response.json();
    console.log('Sales Persons API Response:', { status: response.status, data });

    if (response.ok && data.data) {
      // Transform sales person master data
      const salesPersonsList = data.data.map((person: any) => ({
        name: person.name,
        full_name: person.sales_person_name || person.name,
        email: person.email || '',
        category: getCategoryFromName(person.sales_person_name || person.name),
        allocated_percentage: 0,
        allocated_amount: 0,
      }));

      return NextResponse.json({
        success: true,
        data: salesPersonsList,
        total: salesPersonsList.length,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sales persons' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Persons API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to categorize sales persons based on their names
function getCategoryFromName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('deden')) {
    return 'Deden';
  } else if (lowerName.includes('kantor')) {
    return 'Kantor';
  } else if (lowerName.includes('tim penjualan') || lowerName.includes('tim')) {
    return 'Tim Penjualan';
  }
  return 'Lainnya';
}
