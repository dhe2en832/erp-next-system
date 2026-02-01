import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE SALES INVOICE TEST ===');
    
    const invoiceData = await request.json();
    console.log('Invoice Data:', invoiceData);

    // Simple test response
    return NextResponse.json({
      success: true,
      message: 'Invoice creation test successful',
      data: invoiceData
    });

  } catch (error: any) {
    console.error('Create Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create invoice',
      error: error.toString()
    }, { status: 500 });
  }
}
