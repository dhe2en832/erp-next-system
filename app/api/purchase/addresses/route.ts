import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const sid = request.cookies.get('sid')?.value;

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'No authentication available' }, { status: 401 });
    }

    const body = await request.json();
    const { supplier_name, customer_name, address, country, city } = body;

    const baseName = supplier_name || customer_name;
    const linkDoctype = supplier_name ? 'Supplier' : 'Customer';

    if (!baseName || !address || !city) {
      return NextResponse.json({ success: false, message: 'supplier_name atau customer_name, address, dan city wajib diisi' }, { status: 400 });
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Address`;
    const payload = {
      address_title: baseName,
      address_type: 'Office',
      address_line1: address,
      country: country || 'Indonesia',
      city,
      links: [
        {
          link_doctype: linkDoctype,
          link_name: baseName,
          link_title: baseName,
        },
      ],
    };

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: payload }),
    });

    const data = await response.json();

    if (response.ok && data.data) {
      return NextResponse.json({ success: true, data: data.data });
    }

    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to create address' },
      { status: response.status }
    );
  } catch (error) {
    console.error('Address POST API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
