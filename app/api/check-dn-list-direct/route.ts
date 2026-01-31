import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK DN LIST DIRECT FROM ERPNEXT ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get DN list langsung dari ERPNext
    console.log('Getting DN list directly from ERPNext...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["*"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('DN List Response Status:', dnResponse.status);
    
    if (dnResponse.ok) {
      const dnData = await dnResponse.json();
      console.log('DN List Raw Response:', JSON.stringify(dnData, null, 2));
      
      // Get DN items untuk setiap DN
      const dnWithItems = [];
      
      if (dnData.data && dnData.data.length > 0) {
        for (const dn of dnData.data) {
          console.log(`\n=== Checking DN: ${dn.name} ===`);
          
          // Get items untuk DN ini
          const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","${dn.name}"]]`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authString}`
            },
          });
          
          const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
          
          console.log(`Items Response Status for ${dn.name}:`, itemsResponse.status);
          console.log(`Items Count for ${dn.name}:`, itemsData.data?.length || 0);
          
          // Extract SO references
          const soReferences = new Set();
          
          // Check items for SO references
          itemsData.data?.forEach((item: any) => {
            if (item.against_sales_order) {
              soReferences.add(item.against_sales_order);
              console.log(`  ✅ Found SO reference: ${item.against_sales_order}`);
            }
          });
          
          // Check remarks
          if (dn.remarks && dn.remarks.includes('Based on Sales Order:')) {
            const soMatch = dn.remarks.match(/Based on Sales Order: ([A-Z0-9-]+)/);
            if (soMatch && soMatch[1]) {
              soReferences.add(soMatch[1]);
              console.log(`  ✅ Found SO reference in remarks: ${soMatch[1]}`);
            }
          }
          
          dnWithItems.push({
            dn_info: dn,
            items: itemsData.data || [],
            item_count: itemsData.data?.length || 0,
            has_items: itemsData.data && itemsData.data.length > 0,
            so_references: Array.from(soReferences),
            has_so_reference: soReferences.size > 0
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        raw_erpnext_response: dnData,
        analysis: {
          total_dn_from_erpnext: dnData.data?.length || 0,
          dn_with_items: dnWithItems.filter(dn => dn.has_items).length,
          dn_with_so_ref: dnWithItems.filter(dn => dn.has_so_reference).length,
          so_references_found: [...new Set(dnWithItems.flatMap(dn => dn.so_references))]
        },
        detailed_dn_list: dnWithItems,
        summary: {
          message: dnWithItems.some(dn => dn.has_so_reference) ? 
            `🚫 Found ${[...new Set(dnWithItems.flatMap(dn => dn.so_references))].length} SO references` :
            '✅ No SO references found in any DN'
        }
      });
      
    } else {
      const errorText = await dnResponse.text();
      console.log('DN List Error Response:', errorText);
      
      return NextResponse.json({
        success: false,
        status: dnResponse.status,
        message: 'Failed to get DN list from ERPNext',
        error_response: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Check DN list direct error:', error);
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
