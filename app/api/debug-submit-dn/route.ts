import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deliveryNoteName } = body;
    
    console.log('=== DEBUG SUBMIT DN ===');
    console.log('DN Name to submit:', deliveryNoteName);
    
    if (!deliveryNoteName) {
      return NextResponse.json({
        success: false,
        message: 'Delivery Note name is required'
      });
    }

    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    console.log('Using API Key authentication');
    
    // Test 1: Check DN exists first
    console.log('Test 1: Checking if DN exists...');
    const checkResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${deliveryNoteName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });
    
    console.log('DN Check Response Status:', checkResponse.status);
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.log('DN Check Error:', errorText);
      return NextResponse.json({
        success: false,
        message: `Delivery Note not found: ${deliveryNoteName}`,
        details: errorText
      });
    }
    
    const dnData = await checkResponse.json();
    console.log('DN Data:', {
      name: dnData.data?.name,
      status: dnData.data?.status,
      docstatus: dnData.data?.docstatus,
      grand_total: dnData.data?.grand_total
    });
    
    // Test 2: Try submit with different methods
    console.log('\nTest 2: Submitting DN...');
    
    // Method 1: Standard submit
    const submitResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.desk.form.submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        doc: {
          doctype: 'Delivery Note',
          name: deliveryNoteName,
          docstatus: 1
        },
        action: 'Submit'
      }),
    });
    
    console.log('Submit Response Status:', submitResponse.status);
    
    const submitData = await submitResponse.json();
    console.log('Submit Response Data:', JSON.stringify(submitData, null, 2));
    
    // Test 3: Alternative submit method
    console.log('\nTest 3: Alternative submit method...');
    const altResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${deliveryNoteName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        docstatus: 1
      }),
    });
    
    console.log('Alternative Submit Status:', altResponse.status);
    const altData = altResponse.ok ? await altResponse.json() : { error: altResponse.status };
    console.log('Alternative Submit Data:', altData);
    
    return NextResponse.json({
      success: true,
      test_results: {
        dn_exists: checkResponse.ok,
        dn_info: {
          name: dnData.data?.name,
          status: dnData.data?.status,
          docstatus: dnData.data?.docstatus
        },
        submit_method_1: {
          status: submitResponse.status,
          data: submitData,
          success: submitResponse.ok
        },
        submit_method_2: {
          status: altResponse.status,
          data: altData,
          success: altResponse.ok
        }
      },
      recommendation: submitResponse.ok ? 'Use method 1' : altResponse.ok ? 'Use method 2' : 'Both methods failed'
    });
    
  } catch (error: unknown) {
    console.error('Debug submit DN error:', error);
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
