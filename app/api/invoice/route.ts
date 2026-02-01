import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET SALES INVOICES - SIMPLE COOKIE AUTH ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Simple URL dengan items field
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","items"]&limit_page_length=100&order_by=posting_date desc`;
    
    console.log('Invoice ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('🔍 Invoice Response Status:', response.status);
    console.log('📋 Complete Invoice Response Data:', JSON.stringify(data, null, 2));
    
    // Log each invoice detail
    if (data.data && Array.isArray(data.data)) {
      console.log('📊 Invoice Count:', data.data.length);
      data.data.forEach((invoice: any, index: number) => {
        console.log(`📄 Invoice ${index + 1}:`, {
          name: invoice.name,
          customer: invoice.customer,
          delivery_note: invoice.delivery_note,
          items_count: invoice.items ? invoice.items.length : 0,
          items_with_dn: invoice.items ? invoice.items.filter((item: any) => item.delivery_note).length : 0
        });
        
        // Log items if exist
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item: any, itemIndex: number) => {
            if (item.delivery_note) {
              console.log(`  📦 Item ${itemIndex + 1} DN:`, item.delivery_note);
            }
          });
        }
      });
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch invoices' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE SALES INVOICE - ERPNEXT REST API ===');
    
    const invoiceData = await request.json();
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Create Sales Invoice using ERPNext REST API
    const erpNextUrl = `${baseUrl}/api/resource/Sales Invoice`;
    
    console.log('ERPNext REST API URL:', erpNextUrl);

    // Prepare payload with proper ERPNext structure using VALID data
    const payload: any = {
      company: invoiceData.company,
      customer: invoiceData.customer,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date || invoiceData.posting_date,
      items: invoiceData.items || [],
      currency: invoiceData.currency || 'IDR',
      // Use valid Price List
      selling_price_list: invoiceData.selling_price_list || 'Standard Jual',
      price_list_currency: invoiceData.price_list_currency || 'IDR',
      plc_conversion_rate: invoiceData.plc_conversion_rate || 1,
      // Use valid Territory
      territory: invoiceData.territory || 'Semua Wilayah',
      // Skip tax_category to use system default (Tax Category is empty)
      status: invoiceData.status || 'Draft',
      docstatus: invoiceData.docstatus || 0
    };

    // Add calculated totals if provided
    if (invoiceData.grand_total) {
      payload.grand_total = invoiceData.grand_total;
      payload.total = invoiceData.total || invoiceData.grand_total;
      payload.net_total = invoiceData.net_total || invoiceData.grand_total;
      payload.base_total = invoiceData.base_total || invoiceData.grand_total;
      payload.base_net_total = invoiceData.base_net_total || invoiceData.grand_total;
      payload.base_grand_total = invoiceData.base_grand_total || invoiceData.grand_total;
      payload.outstanding_amount = invoiceData.outstanding_amount || invoiceData.grand_total;
    }

    console.log('Final Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('ERPNext Response Status:', response.status);

    const responseText = await response.text();
    console.log('ERPNext Response Text:', responseText);

    if (!response.ok) {
      console.error('ERPNext API Error:', responseText);
      return NextResponse.json({
        success: false,
        message: 'Failed to create invoice in ERPNext',
        error: responseText,
        status: response.status
      }, { status: 500 });
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('ERPNext Success Response:', data);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON response from ERPNext',
        error: responseText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully in ERPNext',
      data: data
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
