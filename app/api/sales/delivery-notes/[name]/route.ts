import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY || '';
const ERP_API_SECRET = process.env.ERP_API_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama surat jalan diperlukan' },
        { status: 400 }
      );
    }

    console.log('=== Delivery Note Detail API Called ===');
    console.log('DN Name:', name);

    // Fetch full delivery note with items using form.load.getdoc
    const erpnextUrl = `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc`;
    
    console.log('ERPNext URL:', erpnextUrl);
    console.log('Request body:', JSON.stringify({ doctype: 'Delivery Note', name: name }));

    const response = await fetch(erpnextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctype: 'Delivery Note',
        name: name,
      }),
    });

    console.log('ERPNext Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil detail surat jalan' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('ERPNext Response:', JSON.stringify(data).substring(0, 200));

    if (data.message && data.message.docs && data.message.docs.length > 0) {
      const deliveryNote = data.message.docs[0];
      
      console.log('DN Found:', deliveryNote.name);
      console.log('DN Items count:', deliveryNote.items?.length || 0);

      return NextResponse.json({
        success: true,
        data: deliveryNote,
      });
    } else {
      // Fallback: Try using resource API with fields parameter to include child tables
      console.log('Trying fallback: resource API');
      const resourceUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note/${name}?fields=["*"]`;
      
      const resourceResponse = await fetch(resourceUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      if (resourceResponse.ok) {
        const resourceData = await resourceResponse.json();
        console.log('Resource API success, items count:', resourceData.data?.items?.length || 0);
        
        return NextResponse.json({
          success: true,
          data: resourceData.data,
        });
      }

      console.log('DN not found in both APIs');
      return NextResponse.json(
        { success: false, message: 'Surat jalan tidak ditemukan' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error fetching delivery note detail:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil detail' },
      { status: 500 }
    );
  }
}
