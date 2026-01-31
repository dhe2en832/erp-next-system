import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG DELIVERY NOTE PAYLOAD STRUCTURE ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // 1. Get existing DN structure
    console.log('1. Getting existing DN structure...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["*"]&limit_page_length=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    if (dnResponse.ok) {
      const dnData = await dnResponse.json();
      console.log('Existing DN Structure:', dnData);
      
      if (dnData.data && dnData.data.length > 0) {
        const dnRecord = dnData.data[0];
        
        // 2. Get DN items structure
        console.log('2. Getting DN items structure...');
        const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","${dnRecord.name}"]]&limit_page_length=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });

        let itemsData = null;
        if (itemsResponse.ok) {
          itemsData = await itemsResponse.json();
          console.log('DN Items Structure:', itemsData);
        }

        // 3. Check for SO reference fields
        console.log('3. Analyzing SO reference fields...');
        
        const allFields = Object.keys(dnRecord);
        const soRelatedFields = allFields.filter(field => 
          field.toLowerCase().includes('sales_order') ||
          field.toLowerCase().includes('so_') ||
          field.toLowerCase().includes('against')
        );

        const itemFields = itemsData && itemsData.data && itemsData.data.length > 0 
          ? Object.keys(itemsData.data[0])
          : [];
        
        const itemSOFields = itemFields.filter(field => 
          field.toLowerCase().includes('sales_order') ||
          field.toLowerCase().includes('so_') ||
          field.toLowerCase().includes('against')
        );

        // 4. Get doctype structure for Delivery Note
        console.log('4. Getting doctype structure...');
        const doctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/v1/method/frappe.desk.form.load.getdoctype?doctype=Delivery%20Note`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });

        let doctypeData = null;
        if (doctypeResponse.ok) {
          doctypeData = await doctypeResponse.json();
          console.log('Doctype Structure:', doctypeData);
        }

        return NextResponse.json({
          success: true,
          message: 'DN Payload structure analyzed',
          analysis: {
            dn_record: dnRecord,
            dn_items: itemsData,
            all_fields: allFields,
            so_related_fields: soRelatedFields,
            item_fields: itemFields,
            item_so_fields: itemSOFields,
            doctype_info: doctypeData
          },
          recommendations: [
            'Check if sales_order field exists in DN doctype',
            'Check if against_sales_order exists in DN Item doctype',
            'Verify which fields are mandatory vs optional'
          ]
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No DN records found for analysis'
    });

  } catch (error: unknown) {
    console.error('Debug DN payload error:', error);
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
