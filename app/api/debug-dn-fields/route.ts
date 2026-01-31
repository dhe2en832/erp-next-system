import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG DELIVERY NOTE FIELDS ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // Get existing DN untuk melihat field structure
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["*"]&limit_page_length=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('DN Fields Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('DN Fields Data:', data);
      
      if (data.data && data.data.length > 0) {
        const dnRecord = data.data[0];
        const fields = Object.keys(dnRecord);
        
        // Filter fields yang relevan untuk SO reference
        const soReferenceFields = fields.filter(field => 
          field.toLowerCase().includes('sales_order') ||
          field.toLowerCase().includes('so_') ||
          field.toLowerCase().includes('against')
        );
        
        return NextResponse.json({
          success: true,
          message: 'Delivery Note fields analyzed',
          all_fields: fields,
          so_reference_fields: soReferenceFields,
          sample_record: dnRecord
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'No Delivery Note records found',
          all_fields: []
        });
      }
    } else {
      const errorText = await response.text();
      console.log('DN Fields Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to get DN fields',
        error: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Debug DN fields error:', error);
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
