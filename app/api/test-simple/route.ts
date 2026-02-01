import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== SIMPLE ERPNext TEST ===');
    
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    
    console.log('Config:', { apiKey: !!apiKey, apiSecret: !!apiSecret, baseUrl });
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }
    
    // Test simple connection with /api/v1/method
    const testUrl = `${baseUrl}/api/v1/method/frappe.auth.get_logged_user`;
    
    console.log('Test URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      return NextResponse.json({
        success: false,
        message: 'API connection failed',
        status: response.status,
        error: errorText
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log('Success Response:', data);
    
    return NextResponse.json({
      success: true,
      message: 'API connection successful',
      data
    });
    
  } catch (error) {
    console.error('Test Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
