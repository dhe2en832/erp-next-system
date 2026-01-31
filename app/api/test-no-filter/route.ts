import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    console.log('Test No Filter - Getting ALL delivery notes...');

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');

    // Get ALL delivery notes WITHOUT any filters
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Total delivery notes:', data.data?.length || 0);
      
      if (data.success && data.data) {
        // Extract sales order references
        const soReferences = new Set();
        
        data.data.forEach((dn: any) => {
          console.log(`Delivery Note: ${dn.name}, Company: ${dn.company}`);
          
          // Check ALL fields for sales order references
          Object.keys(dn).forEach(key => {
            const value = dn[key];
            
            if (key.toLowerCase().includes('sales_order') && value) {
              soReferences.add(value);
              console.log(`✅ Found SO reference in field ${key}: ${value}`);
            }
            
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
          message: 'Test no filter complete',
          total_delivery_notes: data.data.length,
          sales_order_references: Array.from(soReferences),
          target_so: targetSO,
          target_has_delivery_note: hasDeliveryNote,
          delivery_notes: data.data.map((dn: any) => ({
            name: dn.name,
            company: dn.company,
            customer: dn.customer,
            status: dn.status,
            docstatus: dn.docstatus,
            so_fields: Object.keys(dn).filter(key => 
              key.toLowerCase().includes('sales_order') || 
              (dn[key] && dn[key].toString().startsWith('SAL-ORD-'))
            ).reduce((obj: any, key) => {
              obj[key] = dn[key];
              return obj;
            }, {})
          }))
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get delivery notes'
    });

  } catch (error: any) {
    console.error('Test no filter error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
