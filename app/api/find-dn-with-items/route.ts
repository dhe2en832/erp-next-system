import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== FIND DN WITH ITEMS ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get semua DN
    console.log('Getting all Delivery Notes...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","status","grand_total","owner","creation"]&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    if (dnResponse.ok) {
      const dnData = await dnResponse.json();
      console.log('Total DN Found:', dnData.data?.length || 0);
      
      const dnWithItems = [];
      const dnWithoutItems = [];
      
      // Check each DN untuk items
      for (const dn of dnData.data || []) {
        console.log(`\nChecking DN: ${dn.name}`);
        
        // Get items untuk DN ini
        const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["item_code","against_sales_order","so_detail","qty","rate"]&filters=[["parent","=","${dn.name}"]]`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
        
        console.log(`Items Count: ${itemsData.data?.length || 0}`);
        
        // Extract SO references
        const soReferences = new Set();
        
        itemsData.data?.forEach((item: any) => {
          if (item.against_sales_order) {
            soReferences.add(item.against_sales_order);
            console.log(`  ✅ SO Reference: ${item.against_sales_order}`);
          }
        });
        
        const dnInfo = {
          name: dn.name,
          customer: dn.customer,
          status: dn.status,
          grand_total: dn.grand_total,
          owner: dn.owner,
          creation: dn.creation,
          item_count: itemsData.data?.length || 0,
          has_items: itemsData.data && itemsData.data.length > 0,
          so_references: Array.from(soReferences),
          has_so_reference: soReferences.size > 0,
          items: itemsData.data || []
        };
        
        if (dnInfo.has_items) {
          dnWithItems.push(dnInfo);
          console.log(`  ✅ HAS ITEMS - ${dnInfo.item_count} items`);
        } else {
          dnWithoutItems.push(dnInfo);
          console.log(`  ❌ NO ITEMS`);
        }
      }
      
      return NextResponse.json({
        success: true,
        summary: {
          total_dn_checked: dnData.data?.length || 0,
          dn_with_items: dnWithItems.length,
          dn_without_items: dnWithoutItems.length,
          dn_with_so_ref: dnWithItems.filter(dn => dn.has_so_reference).length
        },
        dn_with_items: dnWithItems,
        dn_without_items: dnWithoutItems,
        so_references_found: [...new Set(dnWithItems.flatMap(dn => dn.so_references))],
        analysis: {
          any_dn_has_items: dnWithItems.length > 0,
          any_dn_has_so_ref: dnWithItems.some(dn => dn.has_so_reference),
          filtering_possible: dnWithItems.some(dn => dn.has_so_reference),
          message: dnWithItems.length > 0 ? 
            `Found ${dnWithItems.length} DN with items` :
            'No DN has items - all DN creation failed'
        },
        key_insight: {
          if_no_items: "All DN creation methods (API & frontend) have permission issues",
          if_some_items: "Only specific users/methods can create DN with items"
        }
      });
      
    } else {
      return NextResponse.json({
        success: false,
        status: dnResponse.status,
        message: 'Failed to get DN list'
      });
    }

  } catch (error: unknown) {
    console.error('Find DN with items error:', error);
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
