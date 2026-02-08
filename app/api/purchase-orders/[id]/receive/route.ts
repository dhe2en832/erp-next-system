import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('Receiving PO:', id);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const auth = `token ${apiKey}:${apiSecret}`;

    // 1️⃣ GET latest document to avoid timestamp mismatch
    console.log('Fetching latest document for:', id);
    const getResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Order/${id}`, {
      headers: { Authorization: auth },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to fetch latest document:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch latest document', erp_response: errorText },
        { status: 500 }
      );
    }

    const doc = (await getResponse.json()).data;
    console.log('Latest document fetched, modified:', doc.modified);

    // 2️⃣ SUBMIT with latest document including timestamp
    console.log('Receiving document with timestamp:', doc.modified);
    const response = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.client.submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify({
        doc: {
          doctype: 'Purchase Order',
          name: doc.name,
          modified: doc.modified,
        },
        action: 'receive',
      }),
    });

    const text = await response.text();
    console.log('ERPNext receive response:', text);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, erp_status: response.status, erp_response: text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(text),
    });
  } catch (error) {
    console.error('Purchase Order receive error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
