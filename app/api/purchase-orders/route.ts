import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Purchase Orders API Called ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const limitPageLength = searchParams.get('limit_page_length');
    const start = searchParams.get('start');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const orderBy = searchParams.get('order_by');

    console.log('Request params:', { company, search, documentNumber, status, fromDate, toDate, orderBy });

    if (!company) {
      console.log('ERROR: Company is required');
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Use API key authentication instead of session
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    console.log('API Key exists:', !!apiKey);
    console.log('API Secret exists:', !!apiSecret);

    if (!apiKey || !apiSecret) {
      console.log('ERROR: ERPNext API credentials not configured');
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Build ERPNext API URL
    let filters = [
      ["company", "=", company]
    ];

    // Add docstatus filter based on status parameter
    if (status) {
      if (status === 'Draft') {
        filters.push(["docstatus", "=", "0"]);
      } else if (status === 'To Receive') {
        // Handle different possible status names in ERPNext
        filters.push(["docstatus", "=", "1"]);
        // ERPNext commonly uses "To Receive and Bill"
        filters.push(["status", "=", "To Receive and Bill"]);
      } else {
        // For other statuses (Submitted, Completed, Cancelled, etc.), docstatus = 1
        // and we need to filter by workflow status
        filters.push(["docstatus", "=", "1"]);
        filters.push(["status", "=", status]);
      }
    } else {
      // Default filter: show submitted POs with less than 100% received
      filters.push(["docstatus", "=", "1"]);
      filters.push(["per_received", "<", 100]);
    }
    // If no status filter, don't add docstatus filter - show all statuses

    // Add additional filters if provided
    if (documentNumber) {
      filters.push(["name", "like", `%${documentNumber}%`]);
    }

    if (fromDate && toDate) {
      filters.push(["transaction_date", "between", [fromDate, toDate]]);
    }

    const fields = [
      "name", "supplier", "supplier_name", "transaction_date",
      "status", "grand_total", "currency", "docstatus", "per_received"
    ];

    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: limitPageLength || '20',
      ...(start && { start }),
      ...(orderBy && { order_by: orderBy })
    });

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Order?${params}`;

    console.log('ERPNext PO URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch from ERPNext' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('ERPNext response data count:', data.data?.length || 0);

    // Transform data to match frontend interface
    const transformedData = (data.data || []).map((po: any) => ({
      name: po.name,
      supplier: po.supplier,
      supplier_name: po.supplier_name,
      transaction_date: po.transaction_date,
      status: po.status,
      grand_total: po.grand_total || 0,
      currency: po.currency || 'IDR'
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      message: 'Purchase Orders fetched successfully'
    });
  } catch (error) {
    console.error('Purchase Orders API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const purchaseOrderData = await request.json();

    // Use API key authentication instead of session
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(purchaseOrderData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create purchase order' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Order creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
