import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    console.log('Fetching PO items for receipt:', name);
    console.log('Company:', company);

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Build ERPNext URL to get PO items
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Order/${name}?fields=["name","supplier","supplier_name","transaction_date","status","items"]`;

    console.log('Fetch PO items ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`,
        },
      }
    );

    const data = await response.json();
    console.log('Fetch PO items response:', data);

    if (response.ok) {
      const poData = data.data;
      
      // Check if PO is submitted (can only receive from submitted POs)
      if (poData.status !== 'Submitted' && poData.status !== 'To Receive') {
        return NextResponse.json(
          { success: false, message: 'Hanya bisa membuat Purchase Receipt dari Purchase Order yang statusnya Submitted atau To Receive' },
          { status: 400 }
        );
      }

      // Process items for receipt
      const items = poData.items || [];
      const processedItems = items.map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty || 0,
        received_qty: 0, // Default received quantity
        rejected_qty: 0, // Default rejected quantity
        accepted_qty: item.qty || 0, // Default accepted qty follows PO qty (readonly)
        uom: item.uom,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
        purchase_order: name,
        purchase_order_item: item.name,
        // Add remaining quantity calculation
        remaining_qty: (item.qty || 0) - (item.received_qty || 0)
      }));

      return NextResponse.json({
        success: true,
        data: {
          purchase_order: {
            name: poData.name,
            supplier: poData.supplier,
            supplier_name: poData.supplier_name,
            transaction_date: poData.transaction_date,
            status: poData.status
          },
          items: processedItems
        }
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase order items' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('PO items fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
