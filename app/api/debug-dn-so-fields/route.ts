import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG DN SO FIELDS ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // 1. Get Delivery Note doctype fields
    console.log('1. Getting Delivery Note doctype...');
    const dnDoctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/v1/method/frappe.desk.form.load.getdoctype?doctype=Delivery%20Note`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    if (dnDoctypeResponse.ok) {
      const dnDoctypeData = await dnDoctypeResponse.json();
      
      // Extract only relevant fields
      const dnFields = dnDoctypeData.docs?.[0]?.fields || [];
      const soRelatedFields = dnFields.filter((field: any) => 
        field.fieldname?.toLowerCase().includes('sales_order') ||
        field.fieldname?.toLowerCase().includes('so_') ||
        field.fieldname?.toLowerCase().includes('against')
      );

      console.log('DN SO Related Fields:', soRelatedFields);

      // 2. Get Delivery Note Item doctype fields
      console.log('2. Getting Delivery Note Item doctype...');
      const dnItemDoctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/v1/method/frappe.desk.form.load.getdoctype?doctype=Delivery%20Note%20Item`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });

      let dnItemSOFields = [];
      if (dnItemDoctypeResponse.ok) {
        const dnItemDoctypeData = await dnItemDoctypeResponse.json();
        const dnItemFields = dnItemDoctypeData.docs?.[0]?.fields || [];
        dnItemSOFields = dnItemFields.filter((field: any) => 
          field.fieldname?.toLowerCase().includes('sales_order') ||
          field.fieldname?.toLowerCase().includes('so_') ||
          field.fieldname?.toLowerCase().includes('against')
        );

        console.log('DN Item SO Related Fields:', dnItemSOFields);
      }

      // 3. Get existing DN with items to see actual data
      console.log('3. Getting existing DN with items...');
      const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","remarks"]&limit_page_length=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });

      let existingDN = null;
      let existingDNItems = null;
      
      if (dnResponse.ok) {
        const dnData = await dnResponse.json();
        if (dnData.data && dnData.data.length > 0) {
          existingDN = dnData.data[0];
          
          // Get items for this DN
          const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["*"]&filters=[["parent","=","${existingDN.name}"]]&limit_page_length=5`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authString}`
            },
          });

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            existingDNItems = itemsData.data || [];
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'DN SO fields analysis complete',
        results: {
          dn_doctype_fields: soRelatedFields.map((f: any) => ({
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            reqd: f.reqd,
            hidden: f.hidden
          })),
          dn_item_doctype_fields: dnItemSOFields.map((f: any) => ({
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            reqd: f.reqd,
            hidden: f.hidden
          })),
          existing_dn: existingDN,
          existing_dn_items: existingDNItems?.map((item: any) => {
            const itemSOFields = {};
            dnItemSOFields.forEach((field: any) => {
              itemSOFields[field.fieldname] = item[field.fieldname];
            });
            return {
              name: item.name,
              item_code: item.item_code,
              ...itemSOFields
            };
          })
        },
        conclusion: {
          has_dn_sales_order_field: soRelatedFields.some((f: any) => f.fieldname === 'sales_order'),
          has_item_against_sales_order: dnItemSOFields.some((f: any) => f.fieldname === 'against_sales_order'),
          recommendations: []
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to get doctype information'
    });

  } catch (error: unknown) {
    console.error('Debug DN SO fields error:', error);
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
