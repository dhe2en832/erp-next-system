import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== GET SO ITEMS FOR SAL-ORD-2026-00014 ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get SO items untuk SAL-ORD-2026-00014
    console.log('Getting SO items...');
    const soItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order Item?fields=["name","item_code","item_name","qty","rate"]&filters=[["parent","=","SAL-ORD-2026-00014"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const soItemsData = soItemsResponse.ok ? await soItemsResponse.json() : { data: [] };
    
    console.log('SO Items Data:', soItemsData);
    
    return NextResponse.json({
      success: true,
      so_items: soItemsData.data || [],
      analysis: {
        item_count: soItemsData.data?.length || 0,
        available_so_item_ids: soItemsData.data?.map((item: any) => item.name) || []
      }
    });

  } catch (error: unknown) {
    console.error('Get SO items error:', error);
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
