import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG DN ITEMS MYSTERY ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Test 1: Cek DN dengan total amount > 0
    console.log('Test 1: Check DN with grand_total > 0...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","grand_total","total_qty"]&filters=[["grand_total",">",0]]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    
    console.log('DN with grand_total > 0:', dnData.data?.length || 0);
    
    // Test 2: Cek DN items dengan berbagai cara
    const testMethods = [];
    
    for (const dn of dnData.data || []) {
      console.log(`\n=== Testing DN: ${dn.name} (Total: ${dn.grand_total}, Qty: ${dn.total_qty}) ===`);
      
      const tests = [];
      
      // Method 1: Standard API
      try {
        const itemsResponse1 = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?filters=[["parent","=","${dn.name}"]]`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        const itemsData1 = itemsResponse1.ok ? await itemsResponse1.json() : { data: [] };
        tests.push({
          method: 'Standard API',
          status: itemsResponse1.status,
          count: itemsData1.data?.length || 0
        });
      } catch (error) {
        tests.push({
          method: 'Standard API',
          status: 'Error',
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Method 2: With fields
      try {
        const itemsResponse2 = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","${dn.name}"]]`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        const itemsData2 = itemsResponse2.ok ? await itemsResponse2.json() : { data: [] };
        tests.push({
          method: 'With Fields',
          status: itemsResponse2.status,
          count: itemsData2.data?.length || 0
        });
      } catch (error) {
        tests.push({
          method: 'With Fields',
          status: 'Error',
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Method 3: Check if DN has children (alternative approach)
      try {
        const childrenResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${dn.name}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        const dnDetail = childrenResponse.ok ? await childrenResponse.json() : { data: {} };
        tests.push({
          method: 'DN Detail',
          status: childrenResponse.status,
          has_items_field: 'items' in (dnDetail.data || {}),
          items_in_detail: dnDetail.data?.items || []
        });
      } catch (error) {
        tests.push({
          method: 'DN Detail',
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      testMethods.push({
        dn_name: dn.name,
        grand_total: dn.grand_total,
        total_qty: dn.total_qty,
        tests: tests
      });
    }
    
    // Test 4: Check all Delivery Note Items (tanpa filter)
    console.log('\nTest 4: Check ALL Delivery Note Items...');
    try {
      const allItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?limit_page_length=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      const allItemsData = allItemsResponse.ok ? await allItemsResponse.json() : { data: [] };
      
      console.log('All DN Items Count:', allItemsData.data?.length || 0);
      
      // Group by parent
      const itemsByParent = {};
      allItemsData.data?.forEach((item: any) => {
        if (!itemsByParent[item.parent]) {
          itemsByParent[item.parent] = [];
        }
        itemsByParent[item.parent].push(item);
      });
      
      return NextResponse.json({
        success: true,
        analysis: {
          dn_with_total_gt_zero: dnData.data?.length || 0,
          all_dn_items_count: allItemsData.data?.length || 0,
          items_by_parent: itemsByParent,
          mystery_solved: Object.keys(itemsByParent).length > 0
        },
        detailed_tests: testMethods,
        conclusion: {
          if_items_exist: "Items exist in database but API filter not working",
          if_no_items: "Items really don't exist - ERPNext frontend has different behavior",
          if_permission_issue: "Items exist but API user can't read them"
        },
        key_question: {
          question: "Why does ERPNext frontend allow DN creation without items?",
          possible_answers: [
            "Frontend uses different user with different permissions",
            "Frontend auto-creates items that API can't see",
            "Frontend bypasses validation that API enforces",
            "Items are stored in different table/structure"
          ]
        }
      });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to get all items',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error: unknown) {
    console.error('Debug DN items mystery error:', error);
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
