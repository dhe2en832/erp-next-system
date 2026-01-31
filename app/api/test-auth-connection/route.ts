import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Auth Connection...');
    console.log('ERPNext URL:', ERPNEXT_API_URL);
    console.log('API Key:', ERP_API_KEY ? 'Available' : 'Missing');
    console.log('API Secret:', ERP_API_SECRET ? 'Available' : 'Missing');

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
        api_key_available: !!ERP_API_KEY,
        api_secret_available: !!ERP_API_SECRET
      });
    }

    // Test with API key authentication
    const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');
    
    try {
      const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?limit_page_length=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });

      console.log('Auth Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth Response Data:', data);
        
        if (data.success && data.data) {
          // Check for sales order references
          const soReferences = new Set();
          
          data.data.forEach((dn: any) => {
            console.log('Delivery Note:', dn.name, 'Fields:', Object.keys(dn));
            
            // Check all possible field names
            if (dn.sales_order) {
              soReferences.add(dn.sales_order);
              console.log(`Found sales_order: ${dn.sales_order}`);
            }
            if (dn.against_sales_order) {
              soReferences.add(dn.against_sales_order);
              console.log(`Found against_sales_order: ${dn.against_sales_order}`);
            }
            
            // Check any field that contains sales order reference
            Object.keys(dn).forEach(key => {
              if (key.toLowerCase().includes('sales_order') && dn[key]) {
                soReferences.add(dn[key]);
                console.log(`Found sales order in field ${key}: ${dn[key]}`);
              }
            });
          });
          
          const targetSO = 'SAL-ORD-2026-00015';
          const hasDeliveryNote = soReferences.has(targetSO);
          
          return NextResponse.json({
            success: true,
            message: 'Authentication successful',
            total_delivery_notes: data.data.length,
            sales_order_references: Array.from(soReferences),
            target_so: targetSO,
            target_has_delivery_note: hasDeliveryNote,
            delivery_notes: data.data.map((dn: any) => ({
              name: dn.name,
              customer: dn.customer,
              fields: Object.keys(dn)
            }))
          });
        } else {
          return NextResponse.json({
            success: true,
            message: 'Authentication successful but no delivery notes found',
            total_delivery_notes: 0
          });
        }
      } else {
        const errorText = await response.text();
        console.log('Auth Error:', errorText);
        
        return NextResponse.json({
          success: false,
          error: 'Authentication failed',
          status: response.status,
          response: errorText
        });
      }
    } catch (error) {
      console.log('Auth fetch error:', error);
      return NextResponse.json({
        success: false,
        error: 'Error during authentication',
        details: error
      });
    }

  } catch (error: any) {
    console.error('Test auth connection error:', error);
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
