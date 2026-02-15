import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: invoiceName } = await params;
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${invoiceName}?fields=["name","customer","customer_name","posting_date","due_date","grand_total","outstanding_amount","status","paid_amount","items","custom_total_komisi_sales","custom_notes_si","docstatus","currency","price_list_currency","plc_conversion_rate","selling_price_list","territory","tax_id","customer_address","shipping_address","contact_person","tax_category","taxes_and_charges","base_total","base_net_total","base_grand_total","total","net_total","grand_total","outstanding_amount"]`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Found invoice details for ${invoiceName}`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to fetch invoice details',
        error: data
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Invoice Details Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      error: error
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== UPDATE SALES INVOICE - ERPNEXT REST API ===');
    
    const { name: invoiceName } = await params;
    const invoiceData = await request.json();
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Update Sales Invoice using ERPNext REST API
    const erpNextUrl = `${baseUrl}/api/resource/Sales Invoice/${invoiceName}`;
    
    console.log('ERPNext REST API URL:', erpNextUrl);

    // Prepare payload with proper ERPNext structure
    const payload: any = {
      customer: invoiceData.customer,
      customer_name: invoiceData.customer_name,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date || invoiceData.posting_date,
      items: invoiceData.items || [],
      currency: invoiceData.currency || 'IDR',
      selling_price_list: invoiceData.selling_price_list || 'Standard Jual',
      price_list_currency: invoiceData.price_list_currency || 'IDR',
      plc_conversion_rate: invoiceData.plc_conversion_rate || 1,
      territory: invoiceData.territory || 'Semua Wilayah',
      status: invoiceData.status || 'Draft',
      // Custom fields
      custom_total_komisi_sales: invoiceData.custom_total_komisi_sales || 0,
      custom_notes_si: invoiceData.custom_notes_si || '',
      // Write-off amount to prevent TypeError (must be 0, not null)
      write_off_amount: 0,
      base_write_off_amount: 0
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
      method: 'PUT',
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
        message: 'Failed to update invoice in ERPNext',
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
      message: 'Invoice updated successfully in ERPNext',
      data: data
    });

  } catch (error: any) {
    console.error('Update Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update invoice',
      error: error.toString()
    }, { status: 500 });
  }
}
