import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('Getting items...');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item?fields=["name","item_name","item_group"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Item Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Item Data:', data);
      
      return NextResponse.json({
        success: true,
        items: data.data || []
      });
    } else {
      const errorText = await response.text();
      console.log('Item Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to get items',
        error: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Get items error:', error);
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
