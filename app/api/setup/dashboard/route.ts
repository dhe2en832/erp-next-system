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

    console.log('Testing Dashboard stats without filters...');

    // Test 1: Items count
    const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item?fields=["name"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    // Test 2: Sales Orders count
    const ordersResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    // Test 3: Sales Invoices count
    const invoicesResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    // Test 4: Payments count
    const paymentsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Payment Entry?fields=["name"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const itemsData = await itemsResponse.json();
    const ordersData = await ordersResponse.json();
    const invoicesData = await invoicesResponse.json();
    const paymentsData = await paymentsResponse.json();

    console.log('Dashboard Stats Test - Status:', {
      items: itemsResponse.status,
      orders: ordersResponse.status,
      invoices: invoicesResponse.status,
      payments: paymentsResponse.status
    });

    console.log('Dashboard Stats Test - Data:', {
      items: itemsData,
      orders: ordersData,
      invoices: invoicesData,
      payments: paymentsData
    });

    // Return combined stats
    const stats = {
      total_items: itemsData.data?.length || 0,
      total_sales_orders: ordersData.data?.length || 0,
      total_invoices: invoicesData.data?.length || 0,
      total_payments: paymentsData.data?.length || 0,
    };

    console.log('Dashboard Stats:', stats);

    if (itemsResponse.ok && ordersResponse.ok && invoicesResponse.ok && paymentsResponse.ok) {
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Dashboard stats retrieved successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Some dashboard API calls failed' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Dashboard stats test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
