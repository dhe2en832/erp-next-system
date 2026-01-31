import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK SPECIFIC SO SAL-ORD-2026-00014 ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get specific SO
    console.log('Getting specific SO...');
    const soResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["*"]&filters=[["name","=","SAL-ORD-2026-00014"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const soData = soResponse.ok ? await soResponse.json() : { data: [] };
    
    console.log('SO Data:', soData);
    
    if (soData.data && soData.data.length > 0) {
      const so = soData.data[0];
      
      // Get items untuk SO ini
      console.log('Getting items for this SO...');
      const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order Item?fields=["*"]&filters=[["parent","=","${so.name}"]]`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
      
      return NextResponse.json({
        success: true,
        sales_order: so,
        items: itemsData.data || [],
        analysis: {
          has_items: itemsData.data && itemsData.data.length > 0,
          item_count: itemsData.data?.length || 0,
          total_amount: so.grand_total || 0,
          status: so.status
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'SO SAL-ORD-2026-00014 not found'
      });
    }

  } catch (error: unknown) {
    console.error('Check specific SO error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
