import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERP_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for sales invoice creation');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for sales invoice creation');
      
      // Get CSRF token for ERPNext
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: {
            'Cookie': `sid=${sid}`,
          },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message && csrfData.message.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            console.log('CSRF token added for sales invoice creation');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token for sales invoice creation, continuing without it:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Creating Sales Invoice from Sales Order:', name);

    // Pertama, fetch Sales Order data
    const soResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers,
    });

    if (!soResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch Sales Order data' },
        { status: soResponse.status }
      );
    }

    const soData = await soResponse.json();
    const salesOrder = soData.data;

    if (!salesOrder) {
      return NextResponse.json(
        { success: false, message: 'Sales Order not found' },
        { status: 404 }
      );
    }

    // Buat Sales Invoice menggunakan data dari Sales Order
    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: salesOrder.customer,
      company: salesOrder.company,
      posting_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      order_type: salesOrder.order_type || "Sales",
      currency: salesOrder.currency || "IDR",
      conversion_rate: 1,
      price_list_currency: salesOrder.currency || "IDR",
      plc_conversion_rate: 1,
      ignore_pricing_rule: 0,
      apply_discount_on: "Grand Total",
      base_discount_amount: 0,
      discount_amount: 0,
      is_return: 0,
      status: "Draft",
      
      // Items dari Sales Order
      items: salesOrder.items?.map((item: any) => ({
        doctype: "Sales Invoice Item",
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || item.item_name,
        qty: item.qty,
        uom: item.uom,
        stock_uom: item.stock_uom,
        conversion_factor: item.conversion_factor || 1,
        rate: item.rate,
        price_list_rate: item.price_list_rate || item.rate,
        amount: item.amount,
        base_rate: item.base_rate || item.rate,
        base_amount: item.base_amount || item.amount,
        warehouse: item.warehouse,
        income_account: null, // Will be filled by ERPNext
        cost_center: null, // Will be filled by ERPNext
        is_fixed_asset: item.is_fixed_asset || 0,
        allow_zero_valuation_rate: item.allow_zero_valuation_rate || 0,
        item_tax_template: item.item_tax_template,
        tax_amount: item.tax_amount || 0,
        base_tax_amount: item.base_tax_amount || 0,
        tax_rate: item.tax_rate || 0,
        item_tax_rate: item.item_tax_rate || 0,
        sales_order: name, // Link ke Sales Order
        sales_order_item: item.name, // Link ke Sales Order Item
      })) || [],
      
      // Sales team dari Sales Order
      sales_team: salesOrder.sales_team || [],
      
      // Totals
      total_qty: salesOrder.total_qty || 0,
      total: salesOrder.total || 0,
      base_total: salesOrder.base_total || salesOrder.total || 0,
      net_total: salesOrder.net_total || salesOrder.total || 0,
      base_net_total: salesOrder.base_net_total || salesOrder.total || 0,
      grand_total: salesOrder.grand_total || salesOrder.total || 0,
      base_grand_total: salesOrder.base_grand_total || salesOrder.total || 0,
      rounded_total: salesOrder.rounded_total || salesOrder.total || 0,
      base_rounded_total: salesOrder.base_rounded_total || salesOrder.total || 0,
      other_charges: 0,
      base_other_charges: 0,
      tax_total: salesOrder.tax_total || 0,
      base_tax_total: salesOrder.base_tax_total || 0,
    };

    // Create Sales Invoice
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoicePayload),
    });

    const data = await response.json();
    console.log('Create Sales Invoice ERPNext Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.docs?.[0] || data.doc || data,
        message: 'Sales Invoice created successfully'
      });
    } else {
      let errorMessage = 'Failed to create Sales Invoice';
      
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          errorMessage = data.message || data.exc || 'Failed to create Sales Invoice';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          errorMessage = data._server_messages;
        }
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Create Sales Invoice API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
