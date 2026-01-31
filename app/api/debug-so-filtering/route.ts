import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG SO FILTERING ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // 1. Get semua DN untuk melihat SO references
    console.log('1. Getting all Delivery Notes...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","remarks"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // 2. Get DN items untuk melihat against_sales_order
    console.log('2. Getting DN Items with SO references...');
    const dnItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["parent","against_sales_order","so_detail"]&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // 3. Get semua SO untuk comparison
    console.log('3. Getting all Sales Orders...');
    const soResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","status"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    const dnItemsData = dnItemsResponse.ok ? await dnItemsResponse.json() : { data: [] };
    const soData = soResponse.ok ? await soResponse.json() : { data: [] };
    
    console.log('DN Data:', dnData);
    console.log('DN Items Data:', dnItemsData);
    console.log('SO Data:', soData);
    
    // Extract SO references dari DN
    const soReferences = new Set();
    
    // Method 1: From DN items against_sales_order
    dnItemsData.data?.forEach((item: any) => {
      if (item.against_sales_order) {
        soReferences.add(item.against_sales_order);
        console.log(`Found SO reference in items: ${item.against_sales_order}`);
      }
    });
    
    // Method 2: From DN remarks
    dnData.data?.forEach((dn: any) => {
      if (dn.remarks && dn.remarks.includes('Based on Sales Order:')) {
        const soMatch = dn.remarks.match(/Based on Sales Order: ([A-Z0-9-]+)/);
        if (soMatch && soMatch[1]) {
          soReferences.add(soMatch[1]);
          console.log(`Found SO reference in remarks: ${soMatch[1]}`);
        }
      }
    });
    
    console.log('All SO References:', Array.from(soReferences));
    
    // Filter SO yang belum ada DN
    const availableSOs = soData.data?.filter((so: any) => !soReferences.has(so.name)) || [];
    
    return NextResponse.json({
      success: true,
      analysis: {
        all_delivery_notes: dnData.data || [],
        all_dn_items: dnItemsData.data || [],
        all_sales_orders: soData.data || [],
        so_references_found: Array.from(soReferences),
        available_sales_orders: availableSOs
      },
      specific_check: {
        'SAL-ORD-2026-00014': {
          exists_in_so_list: soData.data?.some((so: any) => so.name === 'SAL-ORD-2026-00014'),
          has_dn_reference: soReferences.has('SAL-ORD-2026-00014'),
          should_be_filtered: soReferences.has('SAL-ORD-2026-00014')
        }
      }
    });

  } catch (error: unknown) {
    console.error('Debug SO filtering error:', error);
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
