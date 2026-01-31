import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const targetSO = searchParams.get('target_so') || 'SAL-ORD-2026-00015';

    console.log('Debugging Delivery Notes for:', { company, targetSO });

    // Step 1: Get specific sales order
    const soFilters = [
      ["company", "=", company],
      ["name", "=", targetSO]
    ];
    
    const soUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","status","docstatus"]&filters=${encodeURIComponent(JSON.stringify(soFilters))}`;
    
    console.log('Sales Order URL:', soUrl);
    
    const soResponse = await fetch(soUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const soData = await soResponse.json();
    console.log('Sales Order Data:', soData);

    // Step 2: Get all delivery notes for this company
    const dnFilters = [
      ["company", "=", company],
      ["docstatus", "!=", "2"]
    ];
    
    const dnUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","sales_order","status"]&filters=${encodeURIComponent(JSON.stringify(dnFilters))}`;
    
    console.log('Delivery Notes URL:', dnUrl);
    
    const dnResponse = await fetch(dnUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const dnData = await dnResponse.json();
    console.log('Delivery Notes Data:', dnData);

    // Step 3: Find delivery notes for the target SO
    const targetDeliveryNotes = dnData.data?.filter((dn: any) => dn.sales_order === targetSO) || [];
    
    console.log('Target Delivery Notes:', targetDeliveryNotes);

    return NextResponse.json({
      success: true,
      target_sales_order: targetSO,
      sales_order_data: soData.data?.[0] || null,
      total_delivery_notes: dnData.data?.length || 0,
      target_delivery_notes: targetDeliveryNotes,
      has_delivery_note: targetDeliveryNotes.length > 0,
      message: targetDeliveryNotes.length > 0 
        ? `Found ${targetDeliveryNotes.length} delivery notes for ${targetSO}`
        : `No delivery notes found for ${targetSO}`
    });

  } catch (error: any) {
    console.error('Debug API error:', error);
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
