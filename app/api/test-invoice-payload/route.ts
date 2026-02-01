import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST INVOICE PAYLOAD ===');
    
    const invoiceData = await request.json();
    console.log('Invoice Payload:', JSON.stringify(invoiceData, null, 2));

    // Validate required fields
    const requiredFields = ['company', 'customer', 'posting_date', 'items'];
    const missingFields = requiredFields.filter(field => !invoiceData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Validate items
    if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Items array is required and cannot be empty'
      }, { status: 400 });
    }

    // Check item structure
    const itemFields = ['item_code', 'item_name', 'qty', 'rate', 'amount'];
    const invalidItems = invoiceData.items.filter((item: any) => 
      itemFields.some(field => !item[field])
    );

    if (invalidItems.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid item structure. Each item must have: item_code, item_name, qty, rate, amount'
      }, { status: 400 });
    }

    // Mock successful response
    const mockResponse = {
      name: 'INV-2026-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      customer: invoiceData.customer,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date,
      grand_total: invoiceData.grand_total || 0,
      status: 'Draft',
      docstatus: 0,
      items: invoiceData.items
    };

    console.log('Payload validation successful:', mockResponse);

    return NextResponse.json({
      success: true,
      message: 'Invoice payload validation successful (test)',
      data: mockResponse
    });

  } catch (error: any) {
    console.error('Test Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to test invoice payload',
      error: error.toString()
    }, { status: 500 });
  }
}
