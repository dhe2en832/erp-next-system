import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Final Delivery Notes API - Company:', company);

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');

    // Get ALL delivery notes with ALL fields (wildcard)
    console.log('Getting delivery notes with all fields...');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?filters=${encodeURIComponent(JSON.stringify([["company", "=", company]]))}&limit_page_length=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response Data Keys:', data.data?.[0] ? Object.keys(data.data[0]) : 'No data');
      
      if (data.success && data.data) {
        // Extract sales order references from ALL fields
        const soReferences = new Set();
        
        data.data.forEach((dn: any) => {
          console.log(`Delivery Note: ${dn.name}`);
          
          // Check ALL fields for sales order references
          Object.keys(dn).forEach(key => {
            const value = dn[key];
            
            // Check if field name contains 'sales_order'
            if (key.toLowerCase().includes('sales_order') && value) {
              soReferences.add(value);
              console.log(`✅ Found SO reference in field ${key}: ${value}`);
            }
            
            // Check if value looks like a sales order number
            if (typeof value === 'string' && value.startsWith('SAL-ORD-')) {
              soReferences.add(value);
              console.log(`✅ Found SO reference in field ${key}: ${value}`);
            }
          });
        });
        
        const targetSO = 'SAL-ORD-2026-00015';
        const hasDeliveryNote = soReferences.has(targetSO);
        
        return NextResponse.json({
          success: true,
          message: 'Final delivery notes API successful',
          total_delivery_notes: data.data.length,
          sales_order_references: Array.from(soReferences),
          target_so: targetSO,
          target_has_delivery_note: hasDeliveryNote,
          delivery_notes: data.data.map((dn: any) => ({
            name: dn.name,
            customer: dn.customer,
            status: dn.status,
            docstatus: dn.docstatus,
            // Include all fields that might contain SO references
            all_fields: Object.keys(dn).filter(key => 
              key.toLowerCase().includes('sales_order') || 
              dn[key] && dn[key].toString().startsWith('SAL-ORD-')
            ).reduce((obj: any, key) => {
              obj[key] = dn[key];
              return obj;
            }, {})
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
    console.error('Final delivery notes API error:', error);
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
