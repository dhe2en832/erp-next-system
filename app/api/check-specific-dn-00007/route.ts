import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK SPECIFIC DN MAT-DN-2026-00007 ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get specific DN MAT-DN-2026-00007
    console.log('Getting specific DN MAT-DN-2026-00007...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["*"]&filters=[["name","=","MAT-DN-2026-00007"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    
    console.log('DN Response Status:', dnResponse.status);
    console.log('DN Data:', dnData);
    
    if (dnData.data && dnData.data.length > 0) {
      const dn = dnData.data[0];
      
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
      
      // Extract SO references
      const soReferences = new Set();
      const itemDetails = [];
      
      // Check items for SO references
      itemsData.data?.forEach((item: any) => {
        const itemInfo = {
          item_code: item.item_code,
          item_name: item.item_name,
          against_sales_order: item.against_sales_order,
          so_detail: item.so_detail,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount
        };
        itemDetails.push(itemInfo);
        
        if (item.against_sales_order) {
          soReferences.add(item.against_sales_order);
          console.log(`✅ Found SO reference in items: ${item.against_sales_order}`);
          console.log(`   - Item Code: ${item.item_code}`);
          console.log(`   - Item Name: ${item.item_name}`);
          console.log(`   - SO Detail: ${item.so_detail || 'N/A'}`);
          console.log(`   - Qty: ${item.qty}, Rate: ${item.rate}, Amount: ${item.amount}`);
        }
      });
      
      // Check remarks for SO references
      if (dn.remarks && dn.remarks.includes('Based on Sales Order:')) {
        const soMatch = dn.remarks.match(/Based on Sales Order: ([A-Z0-9-]+)/);
        if (soMatch && soMatch[1]) {
          soReferences.add(soMatch[1]);
          console.log(`✅ Found SO reference in remarks: ${soMatch[1]}`);
        }
      }
      
      // Check direct fields
      Object.keys(dn).forEach(key => {
        if (key.toLowerCase().includes('sales_order') && dn[key]) {
          soReferences.add(dn[key]);
          console.log(`✅ Found SO reference in field ${key}: ${dn[key]}`);
        }
      });
      
      return NextResponse.json({
        success: true,
        delivery_note: dn,
        items: itemsData.data || [],
        item_details: itemDetails,
        analysis: {
          has_items: itemsData.data && itemsData.data.length > 0,
          item_count: itemsData.data?.length || 0,
          has_so_reference: soReferences.size > 0,
          so_references: Array.from(soReferences),
          remarks: dn.remarks,
          customer: dn.customer,
          status: dn.status,
          grand_total: dn.grand_total,
          posting_date: dn.posting_date,
          naming_series: dn.naming_series
        },
        summary: {
          dn_name: dn.name,
          so_reference: soReferences.size > 0 ? Array.from(soReferences)[0] : null,
          all_so_references: Array.from(soReferences),
          should_filter_so: soReferences.size > 0 ? Array.from(soReferences) : [],
          has_valid_so_reference: soReferences.size > 0
        },
        filtering_impact: {
          will_filter_so: soReferences.size > 0,
          so_to_hide: soReferences.size > 0 ? Array.from(soReferences) : [],
          message: soReferences.size > 0 ? 
            `🚫 SO ${Array.from(soReferences).join(', ')} akan disembunyikan dari dialog` : 
            '✅ Tidak ada SO yang akan difilter'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'DN MAT-DN-2026-00007 not found',
        status: dnResponse.status
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
