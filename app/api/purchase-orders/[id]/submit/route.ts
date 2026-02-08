import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchaseOrderData = await request.json();

    console.log('Submitting PO:', id);
    console.log('PO Data:', purchaseOrderData);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Call ERPNext submit method
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Order/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to submit purchase order' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Order submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
