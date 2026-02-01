import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG ERPNext SALES INVOICE ===');
    
    const invoiceData = await request.json();
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    // Test different payload structures
    const testPayloads = [
      {
        name: "Minimal Payload",
        data: {
          company: "Entitas 1 (Demo)",
          customer: "Test Customer",
          posting_date: "2026-02-01"
        }
      },
      {
        name: "With Items",
        data: {
          company: "Entitas 1 (Demo)",
          customer: "Test Customer", 
          posting_date: "2026-02-01",
          items: [
            {
              item_code: "ITEM-001",
              qty: 1,
              rate: 1000
            }
          ]
        }
      },
      {
        name: "Complete Payload",
        data: {
          company: "Entitas 1 (Demo)",
          customer: "Test Customer",
          posting_date: "2026-02-01", 
          due_date: "2026-03-01",
          items: [
            {
              item_code: "ITEM-001",
              item_name: "Test Item",
              qty: 1,
              rate: 1000,
              amount: 1000,
              income_account: "411000 - Penjualan - ST",
              cost_center: "Main - ST",
              warehouse: "Finished Goods - ST"
            }
          ],
          grand_total: 1000,
          total: 1000,
          net_total: 1000
        }
      }
    ];

    for (const test of testPayloads) {
      console.log(`\n=== Testing: ${test.name} ===`);
      console.log('Payload:', JSON.stringify(test.data, null, 2));

      try {
        const response = await fetch(`${baseUrl}/api/resource/Sales Invoice`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data)
        });

        const responseText = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${responseText}`);

        if (response.ok) {
          console.log(`✅ SUCCESS with ${test.name}`);
          return NextResponse.json({
            success: true,
            message: `Invoice created successfully with ${test.name}`,
            data: JSON.parse(responseText)
          });
        }
      } catch (error: any) {
        console.log(`❌ ERROR with ${test.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: false,
      message: 'All payload variations failed'
    });

  } catch (error: any) {
    console.error('Debug Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error.toString()
    }, { status: 500 });
  }
}
