import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DELIVERY NOTES WORKING API ===');
    
    const { company, status, exclude_invoiced } = await request.json();

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ 
        success: false, 
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Build filters exactly like working API
    const filters: string[] = [];
    filters.push(`["company", "=", "${company}"]`);
    
    if (status && Array.isArray(status)) {
      filters.push(`["status", "in", ${JSON.stringify(status)}]`);
    } else if (status) {
      filters.push(`["status", "=", "${status}"]`);
    }

    console.log('Filters:', filters);

    // Use same URL structure as working /api/delivery-note
    const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status","sales_order"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=100`;
    
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
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch Delivery Notes',
        status: response.status,
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    const deliveryNotes = data.data || [];

    console.log('DN Count:', deliveryNotes.length);

    // Skip exclude_invoiced for now
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
