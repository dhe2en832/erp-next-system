import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    console.log('Final Fix Test - Company:', company);

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');

    // Test with the CORRECT field that we know works
    console.log('Testing with against_sales_order field...');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","posting_date","status","grand_total","against_sales_order"]&filters=${encodeURIComponent(JSON.stringify([["company", "=", company]]))}&limit_page_length=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response Data:', data);
      
      if (data.success && data.data) {
        // Extract sales order references
        const soReferences = new Set();
        
        data.data.forEach((dn: any) => {
          console.log('Delivery Note:', dn.name, 'against_sales_order:', dn.against_sales_order);
          
          if (dn.against_sales_order) {
            soReferences.add(dn.against_sales_order);
            console.log(`✅ Found SO reference: ${dn.against_sales_order}`);
          }
        });
        
        const targetSO = 'SAL-ORD-2026-00015';
        const hasDeliveryNote = soReferences.has(targetSO);
        
        return NextResponse.json({
          success: true,
          message: 'Final fix test complete',
          total_delivery_notes: data.data.length,
          sales_order_references: Array.from(soReferences),
          target_so: targetSO,
          target_has_delivery_note: hasDeliveryNote,
          delivery_notes: data.data.map((dn: any) => ({
            name: dn.name,
            customer: dn.customer,
            against_sales_order: dn.against_sales_order,
            status: dn.status
          }))
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'No delivery notes found',
          response: data
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText);
      
      return NextResponse.json({
        success: false,
        error: 'API call failed',
        status: response.status,
        response: errorText
      });
    }

  } catch (error: any) {
    console.error('Final fix test error:', error);
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
