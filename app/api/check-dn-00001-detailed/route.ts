import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== CHECK DN MAT-DN-2026-00001 DETAILED ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get DN MAT-DN-2026-00001
    console.log('Getting DN MAT-DN-2026-00001...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/MAT-DN-2026-00001`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('DN Response Status:', dnResponse.status);
    
    if (dnResponse.ok) {
      const dnData = await dnResponse.json();
      console.log('DN Data Found:', dnData.data?.name);
      
      // Get items untuk DN ini
      console.log('Getting items for DN MAT-DN-2026-00001...');
      const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","MAT-DN-2026-00001"]]`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      console.log('Items Response Status:', itemsResponse.status);
      
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
          amount: item.amount,
          warehouse: item.warehouse
        };
        itemDetails.push(itemInfo);
        
        if (item.against_sales_order) {
          soReferences.add(item.against_sales_order);
          console.log(`✅ Found SO reference: ${item.against_sales_order}`);
          console.log(`   - Item Code: ${item.item_code}`);
          console.log(`   - Item Name: ${item.item_name}`);
          console.log(`   - SO Detail: ${item.so_detail || 'N/A'}`);
          console.log(`   - Qty: ${item.qty}, Rate: ${item.rate}, Amount: ${item.amount}`);
        }
      });
      
      return NextResponse.json({
        success: true,
        delivery_note: dnData.data,
        items: itemsData.data || [],
        item_details: itemDetails,
        analysis: {
          has_items: itemsData.data && itemsData.data.length > 0,
          item_count: itemsData.data?.length || 0,
          has_so_reference: soReferences.size > 0,
          so_references: Array.from(soReferences),
          customer: dnData.data?.customer,
          status: dnData.data?.status,
          grand_total: dnData.data?.grand_total,
          posting_date: dnData.data?.posting_date,
          owner: dnData.data?.owner,
          creation: dnData.data?.creation
        },
        comparison: {
          this_dn_has_items: itemsData.data && itemsData.data.length > 0,
          this_dn_has_so_ref: soReferences.size > 0,
          difference_from_other_dns: "This DN has items while others don't - created by different user/method?",
          so_reference_found: soReferences.size > 0 ? Array.from(soReferences)[0] : null
        },
        filtering_impact: {
          will_filter_so: soReferences.size > 0,
          so_to_hide: soReferences.size > 0 ? Array.from(soReferences) : [],
          message: soReferences.size > 0 ? 
            `🚫 SO ${Array.from(soReferences).join(', ')} akan disembunyikan dari dialog` : 
            '✅ Tidak ada SO yang akan difilter'
        },
        key_question: {
          question: "Why does this DN have items while others don't?",
          possible_reasons: [
            "Created by different user with proper permissions",
            "Created through ERPNext frontend (not API)",
            "Created before permission issues occurred",
            "Created with different API credentials"
          ]
        }
      });
      
    } else {
      const errorText = await dnResponse.text();
      console.log('DN Error Response:', errorText);
      
      return NextResponse.json({
        success: false,
        status: dnResponse.status,
        message: 'DN MAT-DN-2026-00001 not found',
        error_response: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Check DN detailed error:', error);
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
