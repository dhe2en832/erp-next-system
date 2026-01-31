import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE TEST SO WITH ITEMS ===');
    
    // Test SO dengan items
    const testSOPayload = {
      company: "Entitas 1 (Demo)",
      customer: "Grant Plastics Ltd.",
      transaction_date: "2026-02-01",
      delivery_date: "2026-02-01",
      naming_series: "SAL-ORD-.YYYY.-",
      items: [
        {
          item_code: "SKU001",
          item_name: "T-shirt",
          qty: 2,
          rate: 250,
          amount: 500,
          warehouse: "Stores - E1D"
        }
      ]
    };
    
    console.log('Test SO Payload:', JSON.stringify(testSOPayload, null, 2));
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(testSOPayload),
    });

    console.log('SO Response Status:', response.status);

    const responseText = await response.text();
    console.log('SO Response Text:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      
      // Get SO items untuk reference
      const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order Item?fields=["name","item_code"]&filters=[["parent","=","${data.data.name}"]]`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : { data: [] };
      
      return NextResponse.json({
        success: true,
        message: '✅ Test SO with items created!',
        so_data: data,
        so_items: itemsData.data || [],
        so_name: data.data?.name,
        so_item_ids: itemsData.data?.map((item: any) => item.name) || []
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        message: '❌ Failed to create test SO',
        response_text: responseText
      });
    }

  } catch (error: unknown) {
    console.error('Create test SO error:', error);
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
