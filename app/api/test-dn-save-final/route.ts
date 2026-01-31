import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST DN SAVE FINAL ===');
    
    // Test payload yang benar berdasarkan analysis ERPNext
    const testPayload = {
      company: "Entitas 1 (Demo)",
      customer: "Grant Plastics Ltd.",
      posting_date: "2026-02-01",
      naming_series: "MAT-DN-.YYYY.-", // ✅ Fixed naming series
      // remarks: "Based on Sales Order: SAL-ORD-2026-00015", // ❌ Remove dulu
      items: [
        {
          item_code: "SKU001",
          item_name: "T-shirt",
          qty: 1,
          rate: 1000,
          amount: 1000,
          warehouse: "Stores - E1D",
          // ❌ Remove SO reference dulu untuk test basic DN
          // against_sales_order: "SAL-ORD-2026-00015",
          // so_detail: "",
          delivered_qty: 1,
          target_warehouse: "Stores - E1D",
          conversion_factor: 1,
          stock_uom: "Nos",
          // expense_account: "Cost of Goods Sold - EN", // ❌ Remove dulu
          cost_center: "Main - E1D"
        }
      ]
    };
    
    console.log('Test Payload:', JSON.stringify(testPayload, null, 2));
    
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
        message: '✅ DN Save SUCCESS! No 417 error!',
        data: data,
        dn_name: data.data?.name,
        so_reference: "SAL-ORD-2026-00015"
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        message: '❌ DN Save FAILED',
        response_text: responseText,
        error_details: responseText.includes('417') ? 'Still getting 417 error!' : 'Different error'
      });
    }

  } catch (error: unknown) {
    console.error('Test DN save final error:', error);
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
