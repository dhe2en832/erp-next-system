import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== FIND DN WITH SO REFERENCE ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get semua DN yang tersedia
    console.log('Getting all available Delivery Notes...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","status","grand_total","posting_date"]&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    
    console.log('DN Response Status:', dnResponse.status);
    console.log('Total DN Found:', dnData.data?.length || 0);
    
    if (dnData.data && dnData.data.length > 0) {
      const dnList = dnData.data;
      const dnWithSORef = [];
      
      // Check each DN untuk SO reference
      for (const dn of dnList) {
        console.log(`\nChecking DN: ${dn.name}`);
        
        // Get items untuk DN ini
        const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["item_code","against_sales_order","so_detail"]&filters=[["parent","=","${dn.name}"]]`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
        
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
        
        // Jika ada SO reference, tambahkan ke list
        if (soReferences.size > 0) {
          dnWithSORef.push({
            dn_name: dn.name,
            customer: dn.customer,
            status: dn.status,
            grand_total: dn.grand_total,
            posting_date: dn.posting_date,
            so_references: Array.from(soReferences),
            item_count: itemsData.data?.length || 0,
            has_items: itemsData.data && itemsData.data.length > 0
          });
        } else {
          console.log(`  ❌ No SO reference found`);
        }
      }
      
      return NextResponse.json({
        success: true,
        summary: {
          total_dn_checked: dnList.length,
          dn_with_so_ref: dnWithSORef.length,
          dn_without_so_ref: dnList.length - dnWithSORef.length
        },
        all_delivery_notes: dnList.map(dn => ({
          name: dn.name,
          customer: dn.customer,
          status: dn.status,
          grand_total: dn.grand_total
        })),
        dn_with_so_references: dnWithSORef,
        so_references_found: [...new Set(dnWithSORef.flatMap(dn => dn.so_references))],
        filtering_impact: {
          so_to_hide: [...new Set(dnWithSORef.flatMap(dn => dn.so_references))],
          total_so_to_filter: [...new Set(dnWithSORef.flatMap(dn => dn.so_references))].length,
          message: dnWithSORef.length > 0 ? 
            `🚫 ${[...new Set(dnWithSORef.flatMap(dn => dn.so_references))].length} SO akan disembunyikan dari dialog` : 
            '✅ Tidak ada SO yang akan difilter (belum ada DN dengan SO reference)'
        }
      });
      
    } else {
      return NextResponse.json({
        success: false,
        message: 'No Delivery Notes found',
        status: dnResponse.status
      });
    }

  } catch (error: unknown) {
    console.error('Find DN with SO ref error:', error);
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
