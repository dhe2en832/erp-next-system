import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST DN WITH SO REFERENCE ===');
    
    // Test payload dengan SO reference yang benar
    const testPayload = {
      company: "Entitas 1 (Demo)",
      customer: "Grant Plastics Ltd.",
      posting_date: "2026-02-01",
      naming_series: "MAT-DN-.YYYY.-",
      remarks: "Based on Sales Order: SAL-ORD-2026-00019",
      items: [
        {
          item_code: "SKU001",
          item_name: "T-shirt",
          qty: 1,
          rate: 250,
          amount: 250,
          warehouse: "Stores - E1D",
          // ✅ SO reference yang benar
          against_sales_order: "SAL-ORD-2026-00019",
          so_detail: "5m8oq67vgl", // ✅ Valid SO item ID!
          delivered_qty: 1,
          target_warehouse: "Stores - E1D",
          conversion_factor: 1,
          stock_uom: "Nos",
          cost_center: "Main - E1D"
        }
      ]
    };
    
    console.log('Test Payload with SO Ref:', JSON.stringify(testPayload, null, 2));
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(testPayload),
    });

    console.log('Response Status:', response.status);

    const responseText = await response.text();
    console.log('Response Text:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        message: '✅ DN with SO Reference SUCCESS!',
        data: data,
        dn_name: data.data?.name,
        so_reference: "SAL-ORD-2026-00014"
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        message: '❌ DN with SO Reference FAILED',
        response_text: responseText
      });
    }

  } catch (error: unknown) {
    console.error('Test DN with SO ref error:', error);
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
