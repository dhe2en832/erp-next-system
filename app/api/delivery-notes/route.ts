import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { company, status, exclude_invoiced } = await request.json();

    console.log('Delivery Notes API Request:', { company, status, exclude_invoiced });

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({ 
        success: false, 
        message: 'API credentials not configured',
        debug: {
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
          baseUrl
        }
      }, { status: 500 });
    }

    // Build filter query
    const filters: string[] = [];
    filters.push(`["company", "=", "${company}"]`);
    
    if (status && Array.isArray(status)) {
      filters.push(`["status", "in", ${JSON.stringify(status)}]`);
    } else if (status) {
      filters.push(`["status", "=", "${status}"]`);
    }

    console.log('Filters:', filters);

    // Get Delivery Notes with "To Bill" status (ready for invoicing)
    // Use correct DocType name: "Delivery Note"
    const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status","sales_order","items"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=100`;
    
    console.log('DN URL:', dnUrl);
    
    const response = await fetch(dnUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('DN Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DN API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('DN Response keys:', Object.keys(data));
    const deliveryNotes = data.data || [];

    console.log('Initial DN count:', deliveryNotes.length);

    // Skip exclude_invoiced filtering for now to simplify
    // TODO: Implement exclude_invoiced logic later
    
    return NextResponse.json({
      success: true,
      data: deliveryNotes,
      message: `Found ${deliveryNotes.length} delivery notes`
    });

  } catch (error) {
    console.error('Error fetching delivery notes:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch delivery notes',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
