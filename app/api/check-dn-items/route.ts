import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK DN ITEMS FOR MAT-DN-2026-00003 ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get DN items untuk MAT-DN-2026-00003
    console.log('Getting DN items for MAT-DN-2026-00003...');
    const dnItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","MAT-DN-2026-00003"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // Get DN items untuk semua DN
    console.log('Getting all DN items...');
    const allDnItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["parent","against_sales_order","so_detail","item_code"]&limit_page_length=50`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const specificItems = dnItemsResponse.ok ? await dnItemsResponse.json() : { data: [] };
    const allItems = allDnItemsResponse.ok ? await allDnItemsResponse.json() : { data: [] };
    
    console.log('Specific DN Items:', specificItems);
    console.log('All DN Items:', allItems);
    
    // Extract SO references dari semua DN items
    const soReferences = new Set();
    allItems.data?.forEach((item: any) => {
      if (item.against_sales_order) {
        soReferences.add(item.against_sales_order);
        console.log(`Found SO reference: ${item.against_sales_order} in DN: ${item.parent}`);
      }
    });
    
    return NextResponse.json({
      success: true,
      analysis: {
        specific_dn_items: specificItems.data || [],
        all_dn_items: allItems.data || [],
        so_references_found: Array.from(soReferences),
        total_dn_items: allItems.data?.length || 0
      },
      findings: {
        'MAT-DN-2026-00003_items': specificItems.data?.length || 0,
        'total_so_references': soReferences.size,
        'has_sal_ord_00014': soReferences.has('SAL-ORD-2026-00014')
      }
    });

  } catch (error: unknown) {
    console.error('Check DN items error:', error);
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
