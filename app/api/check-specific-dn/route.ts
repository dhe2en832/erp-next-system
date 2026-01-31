import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK SPECIFIC DN MAT-DN-2026-00003 ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get specific DN dengan semua fields - check yang terbaru
    console.log('Getting specific DN MAT-DN-2026-00004...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["*"]&filters=[["name","=","MAT-DN-2026-00004"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    
    console.log('Specific DN Data:', dnData);
    
    if (dnData.data && dnData.data.length > 0) {
      const dn = dnData.data[0];
      
      // Check jika DN memiliki items
      console.log('DN Details:', {
        name: dn.name,
        customer: dn.customer,
        status: dn.status,
        total_qty: dn.total_qty,
        grand_total: dn.grand_total,
        remarks: dn.remarks
      });
      
      // Get items untuk DN ini
      console.log('Getting items for this DN...');
      const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","${dn.name}"]]`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
      
      return NextResponse.json({
        success: true,
        delivery_note: dn,
        items: itemsData.data || [],
        analysis: {
          has_items: itemsData.data && itemsData.data.length > 0,
          item_count: itemsData.data?.length || 0,
          has_so_reference: dn.remarks?.includes('Based on Sales Order:') || false,
          so_reference: dn.remarks?.match(/Based on Sales Order: ([A-Z0-9-]+)/)?.[1] || null
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'DN MAT-DN-2026-00003 not found'
      });
    }

  } catch (error: unknown) {
    console.error('Check specific DN error:', error);
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
