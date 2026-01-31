import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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

    console.log('Simple Delivery Notes API - Company:', company);

    // Use API key authentication instead of session
    const ERP_API_KEY = process.env.ERP_API_KEY;
    const ERP_API_SECRET = process.env.ERP_API_SECRET;

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Try different field combinations to find the correct one
    const fieldOptions = [
      '["name","customer","posting_date","status","grand_total","against_sales_order"]',
      '["name","customer","posting_date","status","grand_total","sales_order"]',
      '["name","customer","posting_date","status","grand_total"]',
      '["*"]' // Last resort
    ];

    let deliveryNotes = [];
    let usedFields = '';

    for (const fields of fieldOptions) {
      try {
        console.log(`Trying fields: ${fields}`);
        
        const filters = [
          ["company", "=", company]
          // Remove docstatus filter to include Draft delivery notes
        ];
        
        const url = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=100`;
        
        console.log('Delivery Notes URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
          },
        });

        console.log('Response Status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Response Data Keys:', data.data?.[0] ? Object.keys(data.data[0]) : 'No data');
          
          if (data.success && data.data) {
            deliveryNotes = data.data;
            usedFields = fields;
            console.log(`Success with fields: ${fields}`);
            break;
          }
        } else {
          const errorText = await response.text();
          console.log(`Failed with fields ${fields}:`, errorText);
        }
      } catch (error) {
        console.log(`Error with fields ${fields}:`, error);
      }
    }

    // Extract sales order references if available
    const soReferences = new Set();
    deliveryNotes.forEach((dn: any) => {
      // Try different possible field names
      if (dn.sales_order) {
        soReferences.add(dn.sales_order);
        console.log(`Found sales_order field: ${dn.sales_order}`);
      }
      if (dn.against_sales_order) {
        soReferences.add(dn.against_sales_order);
        console.log(`Found against_sales_order field: ${dn.against_sales_order}`);
      }
      // Check if there's any field that contains sales order reference
      Object.keys(dn).forEach(key => {
        if (key.toLowerCase().includes('sales_order') && dn[key]) {
          soReferences.add(dn[key]);
          console.log(`Found sales order in field ${key}: ${dn[key]}`);
        }
      });
    });

    console.log('Sales Order References Found:', Array.from(soReferences));
    console.log('Total Delivery Notes:', deliveryNotes.length);

    return NextResponse.json({
      success: true,
      data: deliveryNotes,
      sales_order_references: Array.from(soReferences),
      used_fields: usedFields,
      total_records: deliveryNotes.length,
      message: `Found ${deliveryNotes.length} delivery notes with ${soReferences.size} sales order references`
    });

  } catch (error: any) {
    console.error('Simple Delivery Notes API error:', error);
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
