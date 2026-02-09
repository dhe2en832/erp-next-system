import { NextResponse } from 'next/server';

export async function GET() {
  console.log('=== ERPNext Connection Test ===');

  try {
    const erpNextUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    console.log('Environment check:');
    console.log('- ERPNEXT_API_URL:', erpNextUrl);
    console.log('- ERP_API_KEY exists:', !!apiKey);
    console.log('- ERP_API_SECRET exists:', !!apiSecret);

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured',
        details: { apiKey: !!apiKey, apiSecret: !!apiSecret }
      });
    }

    // Test basic connection - use correct ERPNext endpoint
    const testUrl = `${erpNextUrl}/api/resource/User?fields=["name"]&limit_page_length=1`;
    console.log('Testing connection URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('ERPNext version:', data.message);

      // Test PO query
      const poTestUrl = `${erpNextUrl}/api/resource/Purchase Order?fields=["name","supplier","status"]&limit_page_length=1`;
      console.log('Testing PO query:', poTestUrl);

      const poResponse = await fetch(poTestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('PO Response status:', poResponse.status);

      // Test the specific PO from user's data
      const specificPoUrl = `${erpNextUrl}/api/resource/Purchase Order/PUR-ORD-2026-00005`;
      console.log('Testing specific PO:', specificPoUrl);

      const specificResponse = await fetch(specificPoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Specific PO Response status:', specificResponse.status);

      let poData = null;
      if (specificResponse.ok) {
        poData = await specificResponse.json();
        console.log('Specific PO data exists:', !!poData.data);
      }

      return NextResponse.json({
        success: true,
        message: 'ERPNext connection successful',
        data: {
          version: data.message,
          poQueryStatus: poResponse.status,
          poQueryOk: poResponse.ok,
          specificPoStatus: specificResponse.status,
          specificPoExists: !!poData?.data
        }
      });
    } else {
      const errorText = await response.text();
      console.error('Connection failed:', errorText);

      return NextResponse.json({
        success: false,
        message: 'ERPNext connection failed',
        details: {
          status: response.status,
          error: errorText
        }
      });
    }

  } catch (error) {
    console.error('Test error:', error);

    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
