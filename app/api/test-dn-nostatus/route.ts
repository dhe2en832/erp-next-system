import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DELIVERY NOTES NO STATUS FILTER ===');
    
    const { company } = await request.json();

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ 
        success: false, 
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Get ALL Delivery Notes without status filter first
    const filters = [`["company", "=", "${company}"]`];
    
    const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status","sales_order"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=20`;
    
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

    // Group by status to see what's available
    const statusGroups = deliveryNotes.reduce((acc: any, dn: any) => {
      if (!acc[dn.status]) acc[dn.status] = [];
      acc[dn.status].push(dn);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      message: `Found ${deliveryNotes.length} delivery notes`,
      total: deliveryNotes.length,
      statusGroups: Object.keys(statusGroups).reduce((acc: any, status: string) => {
        acc[status] = statusGroups[status].length;
        return acc;
      }, {}),
      deliveryNotes: deliveryNotes.map((dn: any) => ({
        name: dn.name,
        customer: dn.customer,
        status: dn.status,
        posting_date: dn.posting_date,
        grand_total: dn.grand_total,
        sales_order: dn.sales_order
      }))
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
