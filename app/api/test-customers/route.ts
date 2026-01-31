import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('Getting customer list...');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Customer Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Customer Data:', data);
      
      return NextResponse.json({
        success: true,
        customers: data.data || []
      });
    } else {
      const errorText = await response.text();
      console.log('Customer Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to get customers',
        error: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Get customers error:', error);
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
