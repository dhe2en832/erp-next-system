import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DELIVERY NOTES TEST API ===');
    
    // Check environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    
    const envStatus = {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl,
      apiKeyLength: apiKey?.length || 0,
      apiSecretLength: apiSecret?.length || 0
    };
    
    console.log('Environment Status:', envStatus);
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured',
        envStatus
      }, { status: 500 });
    }
    
    // Test simple ERPNext connection
    const testUrl = `${baseUrl}/api/resource/Company?limit_page_length=5`;
    
    console.log('Test URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Test Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Test Response Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to ERPNext',
        status: response.status,
        error: errorText,
        envStatus
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log('Test Response Data Keys:', Object.keys(data));
    
    // Now test Delivery Notes
    const company = 'Entitas 1 (Demo)';
    const filters = `[["company", "=", "${company}"],["status", "in", ["Submitted", "Completed"]]]`;
    
    const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=10`;
    
    console.log('DN URL:', dnUrl);
    
    const dnResponse = await fetch(dnUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('DN Response Status:', dnResponse.status);
    
    if (!dnResponse.ok) {
      const dnErrorText = await dnResponse.text();
      console.error('DN Response Error:', dnErrorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch Delivery Notes',
        status: dnResponse.status,
        error: dnErrorText,
        envStatus,
        testConnection: {
          success: true,
          data: data
        }
      }, { status: 500 });
    }
    
    const dnData = await dnResponse.json();
    const deliveryNotes = dnData.data || [];
    
    console.log('DN Count:', deliveryNotes.length);
    
    return NextResponse.json({
      success: true,
      message: `Found ${deliveryNotes.length} delivery notes`,
      envStatus,
      testConnection: {
        success: true,
        companies: data.data?.length || 0
      },
      deliveryNotes: {
        count: deliveryNotes.length,
        data: deliveryNotes.slice(0, 3) // First 3 for preview
      }
    });
    
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test API failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
