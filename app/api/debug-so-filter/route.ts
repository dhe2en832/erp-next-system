import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';
    const targetSO = searchParams.get('target_so') || 'SAL-ORD-2026-00015';

    console.log('Debug SO Filter - Checking:', { company, targetSO });

    // Get all delivery notes for this company
    const deliveryNotes = [];
    const fieldOptions = [
      '["name","customer","posting_date","status","grand_total"]',
      '["name","customer","posting_date","status","grand_total","sales_order"]',
      '["name","customer","posting_date","status","grand_total","against_sales_order"]',
      '["*"]'
    ];

    let soReferences = new Set();
    let successfulFields = '';

    for (const fields of fieldOptions) {
      try {
        const filters = [
          ["company", "=", company],
          ["docstatus", "!=", "2"]
        ];
        
        const url = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=100`;
        
        console.log('Trying URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Response keys:', data.data?.[0] ? Object.keys(data.data[0]) : 'No data');
          
          if (data.success && data.data) {
            successfulFields = fields;
            
            // Extract sales order references
            data.data.forEach((dn: any) => {
              console.log('Delivery Note:', dn.name, 'Fields:', Object.keys(dn));
              
              // Check all possible field names
              if (dn.sales_order) {
                soReferences.add(dn.sales_order);
                console.log(`Found sales_order field: ${dn.sales_order}`);
              }
              if (dn.against_sales_order) {
                soReferences.add(dn.against_sales_order);
                console.log(`Found against_sales_order field: ${dn.against_sales_order}`);
              }
              
              // Check any field that contains sales order reference
              Object.keys(dn).forEach(key => {
                if (key.toLowerCase().includes('sales_order') && dn[key]) {
                  soReferences.add(dn[key]);
                  console.log(`Found sales order in field ${key}: ${dn[key]}`);
                }
              });
            });
            
            console.log('Found SO references:', Array.from(soReferences));
            break;
          }
        }
      } catch (error) {
        console.log(`Error with fields ${fields}:`, error);
      }
    }

    // Check if target SO is in the references
    const hasDeliveryNote = soReferences.has(targetSO);
    
    return NextResponse.json({
      success: true,
      target_sales_order: targetSO,
      company: company,
      has_delivery_note: hasDeliveryNote,
      sales_order_references: Array.from(soReferences),
      successful_fields: successfulFields,
      total_delivery_notes: soReferences.size,
      message: hasDeliveryNote 
        ? `✅ ${targetSO} FOUND in delivery notes!`
        : `❌ ${targetSO} NOT found in delivery notes`
    });

  } catch (error: any) {
    console.error('Debug SO Filter error:', error);
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
