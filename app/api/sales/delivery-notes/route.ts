import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY || '';
const ERP_API_SECRET = process.env.ERP_API_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const filtersParam = searchParams.get('filters');
    const documentNumber = searchParams.get('documentNumber');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Parse filters
    let filters: any[] = [];
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }

    // Add document number filter
    if (documentNumber) {
      filters.push(['name', 'like', `%${documentNumber}%`]);
    }

    // Add date range filters
    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // Build ERPNext API URL
    const params = new URLSearchParams({
      fields: JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'posting_time',
        'status',
        'grand_total',
        'company'
      ]),
      filters: JSON.stringify(filters),
      limit_page_length: limit,
      limit_start: start,
      order_by: 'posting_date desc',
    });

    const erpnextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?${params}`;

    // Make request to ERPNext
    const response = await fetch(erpnextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil data surat jalan' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data || [],
      total_records: data.data?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching delivery notes:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil data' },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== Create Delivery Note API Called ===');
    console.log('Request body:', JSON.stringify(body).substring(0, 200));

    // Build ERPNext API URL for creating delivery note
    const erpnextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note`;

    // Make request to ERPNext
    const response = await fetch(erpnextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Gagal membuat surat jalan' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data || data,
      message: 'Surat jalan berhasil dibuat',
    });

  } catch (error) {
    console.error('Error creating delivery note:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat membuat surat jalan' },
      { status: 500 }
    );
  }
}
