import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== TEST SO FILTERING FINAL ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // 1. Get semua DN items dengan cara berbeda
    console.log('1. Getting all DN items (alternative method)...');
    const dnItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["parent","against_sales_order","item_code"]&limit_page_length=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // 2. Get semua SO
    console.log('2. Getting all Sales Orders...');
    const soResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","status"]&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnItemsData = dnItemsResponse.ok ? await dnItemsResponse.json() : { data: [] };
    const soData = soResponse.ok ? await soResponse.json() : { data: [] };
    
    console.log('DN Items Count:', dnItemsData.data?.length || 0);
    console.log('SO Count:', soData.data?.length || 0);
    
    // Extract SO references dari DN items
    const soReferences = new Set();
    dnItemsData.data?.forEach((item: any) => {
      if (item.against_sales_order) {
        soReferences.add(item.against_sales_order);
        console.log(`✅ Found SO reference: ${item.against_sales_order} from DN: ${item.parent}, Item: ${item.item_code}`);
      }
    });
    
    console.log('All SO References Found:', Array.from(soReferences));
    
    // Filter SO yang belum ada DN
    const availableSOs = soData.data?.filter((so: any) => !soReferences.has(so.name)) || [];
    const filteredSOs = soData.data?.filter((so: any) => soReferences.has(so.name)) || [];
    
    return NextResponse.json({
      success: true,
      analysis: {
        total_dn_items: dnItemsData.data?.length || 0,
        total_sales_orders: soData.data?.length || 0,
        so_references_found: Array.from(soReferences),
        available_sales_orders: availableSOs,
        filtered_sales_orders: filteredSOs
      },
      specific_check: {
        'SAL-ORD-2026-00014': {
          exists_in_so_list: soData.data?.some((so: any) => so.name === 'SAL-ORD-2026-00014'),
          has_dn_reference: soReferences.has('SAL-ORD-2026-00014'),
          should_be_filtered: soReferences.has('SAL-ORD-2026-00014'),
          status: soReferences.has('SAL-ORD-2026-00014') ? '❌ SHOULD BE FILTERED' : '✅ SHOULD APPEAR'
        },
        'SAL-ORD-2026-00019': {
          exists_in_so_list: soData.data?.some((so: any) => so.name === 'SAL-ORD-2026-00019'),
          has_dn_reference: soReferences.has('SAL-ORD-2026-00019'),
          should_be_filtered: soReferences.has('SAL-ORD-2026-00019'),
          status: soReferences.has('SAL-ORD-2026-00019') ? '❌ SHOULD BE FILTERED' : '✅ SHOULD APPEAR'
        }
      },
      conclusion: {
        filtering_working: soReferences.size > 0,
        total_filtered: filteredSOs.length,
        total_available: availableSOs.length
      }
    });

  } catch (error: unknown) {
    console.error('Test SO filtering final error:', error);
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
