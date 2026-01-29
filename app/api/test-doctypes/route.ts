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

    console.log('Testing doctypes without filters...');

    // Test 1: Sales Invoice (tanpa filters)
    console.log('Testing Sales Invoice...');
    const invoiceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice?limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const invoiceData = await invoiceResponse.json();
    console.log('Sales Invoice status:', invoiceResponse.status);
    console.log('Sales Invoice data:', invoiceData);

    // Test 2: Delivery Note (tanpa filters)
    console.log('Testing Delivery Note...');
    const deliveryResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const deliveryData = await deliveryResponse.json();
    console.log('Delivery Note status:', deliveryResponse.status);
    console.log('Delivery Note data:', deliveryData);

    // Test 3: Sales Order (tanpa filters)
    console.log('Testing Sales Order...');
    const salesResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order?limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const salesData = await salesResponse.json();
    console.log('Sales Order status:', salesResponse.status);
    console.log('Sales Order data:', salesData);

    // Test 4: Item (tanpa filters)
    console.log('Testing Item...');
    const itemResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item?limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const itemData = await itemResponse.json();
    console.log('Item status:', itemResponse.status);
    console.log('Item data:', itemData);

    return NextResponse.json({
      success: true,
      tests: {
        sales_invoice: { status: invoiceResponse.status, data: invoiceData },
        delivery_note: { status: deliveryResponse.status, data: deliveryData },
        sales_order: { status: salesResponse.status, data: salesData },
        item: { status: itemResponse.status, data: itemData }
      }
    });

  } catch (error: any) {
    console.error('Test doctypes error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
