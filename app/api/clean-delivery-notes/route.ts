import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET CLEAN DELIVERY NOTES LIST ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company parameter is required'
      }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    const auth = `token ${apiKey}:${apiSecret}`;

    // 1. Ambil SEMUA nomor DN yang sudah 'terpakai' di Invoice (Draft maupun Submit)
    console.log('Fetching used Delivery Notes from Sales Invoice Items...');
    const usedItemsUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice Item?fields=["delivery_note"]&filters=[["docstatus","!=",2]]&limit_page_length=None`;
    
    const usedItemsResponse = await fetch(usedItemsUrl, {
      headers: { 'Authorization': auth }
    });

    if (!usedItemsResponse.ok) {
      const errorText = await usedItemsResponse.text();
      console.error('Failed to fetch used items:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch used delivery notes',
        error: errorText
      }, { status: 500 });
    }

    const usedData = await usedItemsResponse.json();
    const usedDNNames = [...new Set(
      (usedData.data || [])
        .map((item: any) => item.delivery_note)
        .filter((dn: string) => dn && dn.trim() !== '')
    )];

    console.log('Used Delivery Notes:', usedDNNames);

    // 2. Ambil DN yang statusnya 'Submitted' (docstatus: 1)
    console.log('Fetching all submitted Delivery Notes...');
    const allDNUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","posting_date","status","grand_total"]&filters=[["docstatus","=",1],["company","=","${company}"]]&limit_page_length=None`;
    
    const allDNResponse = await fetch(allDNUrl, {
      headers: { 'Authorization': auth }
    });

    if (!allDNResponse.ok) {
      const errorText = await allDNResponse.text();
      console.error('Failed to fetch all DNs:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch delivery notes',
        error: errorText
      }, { status: 500 });
    }

    const allDNs = (await allDNResponse.json()).data || [];
    console.log('All Submitted DNs:', allDNs.length);

    // 3. EKSKLUSI: Hanya ambil DN yang namanya TIDAK ada di list usedDNNames
    const availableDNs = allDNs.filter((dn: any) => !usedDNNames.includes(dn.name));

    console.log('Available Delivery Notes:', availableDNs.length);
    console.log('Filtered DN Names:', availableDNs.map((dn: any) => dn.name));

    return NextResponse.json({
      success: true,
      message: 'Clean delivery notes list fetched successfully',
      data: availableDNs,
      meta: {
        total_submitted: allDNs.length,
        total_used: usedDNNames.length,
        total_available: availableDNs.length
      }
    });

  } catch (error: any) {
    console.error('Get Clean DN List Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch clean delivery notes list',
      error: error.toString()
    }, { status: 500 });
  }
}
