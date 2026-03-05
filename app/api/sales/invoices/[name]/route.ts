import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const { name: invoiceName } = await params;

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch invoice with all fields
    const invoice = await client.get('Sales Invoice', invoiceName);

    return NextResponse.json({
      success: true,
      data: invoice,
      message: `Found invoice details for ${invoiceName}`
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/invoices/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const { name: invoiceName } = await params;
    const invoiceData = await request.json();

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

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

    // Update invoice using client method
    const result = await client.update('Sales Invoice', invoiceName, payload);

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully in ERPNext',
      data: result
    });

  } catch (error: any) {
    logSiteError(error, 'PUT /api/sales/invoices/[name]', siteId);
    console.error('Update Invoice Error:', error);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
