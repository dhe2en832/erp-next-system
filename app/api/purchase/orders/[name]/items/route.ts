import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

// Type definitions
interface ERPNextPOItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  warehouse?: string;
  received_qty?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== PO Items API Called ===');
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    console.log('Request params:', { name, company });

    if (!company) {
      console.log('ERROR: Company is required');
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Check environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const erpNextUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('Environment check:', {
      apiKey: !!apiKey,
      apiSecret: !!apiSecret,
      erpNextUrl
    });

    if (!apiKey || !apiSecret) {
      console.log('ERROR: ERPNext API credentials not configured');
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // TEMPORARILY SKIP connection test for debugging
    console.log('=== Skipping connection test, proceeding with PO fetch ===');

    console.log('=== Proceeding with PO fetch ===');

    // First get PO details - use proper URL encoding
    const poFields = JSON.stringify([
      "name", "supplier", "supplier_name", "transaction_date", "status", "warehouse", "custom_notes_po"
    ]);
    const poFilters = JSON.stringify([
      ["name", "=", name],
      ["docstatus", "=", 0], // Draft status (belum di-submit)
      ["company", "=", company]
    ]);

    const poUrl = `${erpNextUrl}/api/resource/Purchase Order?fields=${encodeURIComponent(poFields)}&filters=${encodeURIComponent(poFilters)}`;

    console.log('Fetch PO details URL:', poUrl);

    const poResponse = await fetch(poUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    console.log('PO Response status:', poResponse.status);
    console.log('PO Response ok:', poResponse.ok);

    if (!poResponse.ok) {
      const errorText = await poResponse.text();
      console.error('PO fetch failed:', poResponse.status, errorText);

      // Return fallback empty response instead of error
      console.log('Returning fallback empty response for PO details');
      return NextResponse.json({
        success: true,
        data: {
          purchase_order: {
            name: name,
            supplier: '',
            supplier_name: '',
            transaction_date: new Date().toISOString().split('T')[0],
            status: 'Draft',
            warehouse: ''
          },
          items: []
        }
      });
    }

    const poDataResponse = await poResponse.json();
    console.log('PO response data:', poDataResponse);
    console.log('PO data type:', typeof poDataResponse.data);
    console.log('PO data:', poDataResponse.data);

    const poList = poDataResponse.data;
    console.log('PO list:', poList);
    console.log('PO list type:', Array.isArray(poList) ? 'array' : typeof poList);

    const po = Array.isArray(poList) ? poList[0] : poList;
    console.log('Extracted PO:', po);

    if (!po) {
      console.log('PO not found, returning fallback');
      return NextResponse.json(
        { success: false, message: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      );
    }

    // Then get PO items - use proper URL encoding
    const itemFields = JSON.stringify([
      "name", "item_code", "item_name", "description", "qty", "uom", "rate", "amount",
      "warehouse", "received_qty", "parent", "parentfield", "parenttype"
    ]);
    const itemFilters = JSON.stringify([["parent", "=", name], ["parenttype", "=", "Purchase Order"]]);

    const itemsUrl = `${erpNextUrl}/api/resource/Purchase Order Item?fields=${encodeURIComponent(itemFields)}&filters=${encodeURIComponent(itemFilters)}&order_by=idx asc`;

    console.log('=== FETCHING ITEMS ===');
    console.log('Items URL:', itemsUrl);

    const itemsResponse = await fetch(itemsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    console.log('Items Response status:', itemsResponse.status);
    console.log('Items Response ok:', itemsResponse.ok);

    let items = [];
    if (itemsResponse.ok) {
      const itemsData = await itemsResponse.json();
      console.log('Raw items response:', itemsData);
      console.log('Items data type:', typeof itemsData.data);
      console.log('Items data:', itemsData.data);
      items = itemsData.data || [];
      console.log('Extracted items array:', items);
      console.log('Extracted items count:', items.length);
    } else {
      const errorText = await itemsResponse.text();
      console.error('Items fetch failed:', itemsResponse.status, errorText);
      console.log('Items fetch failed, using empty array');
      // Continue with empty items array
      items = [];
    }

    console.log('Final items to process:', items);
    console.log('Final items count:', items.length);

    const processedItems = items.map((item: ERPNextPOItem) => ({
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

    console.log('Processed items count:', processedItems.length);

    return NextResponse.json({
      success: true,
      data: {
        purchase_order: {
          name: po.name,
          supplier: po.supplier,
          supplier_name: po.supplier_name,
          transaction_date: po.transaction_date,
          status: po.status,
          warehouse: po.warehouse
        },
        items: processedItems
      }
    });
  } catch (error) {
    console.error('PO items fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
