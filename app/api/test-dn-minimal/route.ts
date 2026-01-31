import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TESTING MINIMAL DELIVERY NOTE ===');
    
    // Test dengan payload paling minimal - hanya required fields
    const minimalPayload = {
      company: "Entitas 1 (Demo)",
      customer: "Grant Plastics Ltd.",
      posting_date: "2026-02-01",
      items: [
        {
          item_code: "TEST-ITEM",
          qty: 1,
          rate: 1000
        }
      ]
    };
    
    console.log('Minimal Payload:', JSON.stringify(minimalPayload, null, 2));
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(minimalPayload),
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response Text:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        message: 'Minimal delivery note created successfully',
        data: data
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        message: 'Failed to create minimal delivery note',
        response_text: responseText
      });
    }

  } catch (error: unknown) {
    console.error('Test minimal DN error:', error);
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
