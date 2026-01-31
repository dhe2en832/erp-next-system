import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing ERPNext Connection...');
    console.log('ERPNext URL:', ERPNEXT_API_URL);

    // Test 1: Basic connection
    try {
      const basicResponse = await fetch(`${ERPNEXT_API_URL}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Basic Response Status:', basicResponse.status);
      const basicData = await basicResponse.text();
      console.log('Basic Response:', basicData);

      if (!basicResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'ERPNext connection failed',
          status: basicResponse.status,
          response: basicData
        });
      }
    } catch (error) {
      console.log('Basic connection error:', error);
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to ERPNext',
        details: error
      });
    }

    // Test 2: Delivery Note structure
    try {
      const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?limit_page_length=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('DN Response Status:', dnResponse.status);
      
      if (dnResponse.ok) {
        const dnData = await dnResponse.json();
        console.log('DN Data:', dnData);
        
        if (dnData.data && dnData.data.length > 0) {
          const firstDN = dnData.data[0];
          console.log('First DN fields:', Object.keys(firstDN));
          console.log('First DN sample:', firstDN);
          
          return NextResponse.json({
            success: true,
            message: 'ERPNext connection successful',
            delivery_note_fields: Object.keys(firstDN),
            sample_delivery_note: firstDN,
            total_delivery_notes: dnData.data.length
          });
        } else {
          return NextResponse.json({
            success: true,
            message: 'ERPNext connected but no delivery notes found',
            delivery_note_fields: [],
            total_delivery_notes: 0
          });
        }
      } else {
        const errorText = await dnResponse.text();
        console.log('DN Error:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch delivery notes',
          status: dnResponse.status,
          response: errorText
        });
      }
    } catch (error) {
      console.log('DN fetch error:', error);
      return NextResponse.json({
        success: false,
        error: 'Error fetching delivery notes',
        details: error
      });
    }

  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
