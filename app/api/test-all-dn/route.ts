import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== ALL DELIVERY NOTES TEST ===');
    
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }
    
    // Get ALL Delivery Notes without status filter
    const company = 'Entitas 1 (Demo)';
    const filters = `[["company", "=", "${company}"]]`;
    
    const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status","sales_order"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=20`;
    
    console.log('All DN URL:', dnUrl);
    
    const response = await fetch(dnUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('All DN Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('All DN Response Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch all Delivery Notes',
        status: response.status,
        error: errorText
      }, { status: 500 });
    }
    
    const data = await response.json();
    const allDeliveryNotes = data.data || [];
    
    console.log('All DN Count:', allDeliveryNotes.length);
    
    // Group by status
    const statusGroups = allDeliveryNotes.reduce((acc: any, dn: any) => {
      if (!acc[dn.status]) acc[dn.status] = [];
      acc[dn.status].push(dn);
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      message: `Found ${allDeliveryNotes.length} total delivery notes`,
      total: allDeliveryNotes.length,
      statusGroups: Object.keys(statusGroups).reduce((acc: any, status: string) => {
        acc[status] = statusGroups[status].length;
        return acc;
      }, {}),
      deliveryNotes: allDeliveryNotes.map((dn: any) => ({
        name: dn.name,
        customer: dn.customer,
        status: dn.status,
        posting_date: dn.posting_date,
        grand_total: dn.grand_total,
        sales_order: dn.sales_order
      }))
    });
    
  } catch (error) {
    console.error('All DN Test Error:', error);
    return NextResponse.json({
      success: false,
      message: 'All DN Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
