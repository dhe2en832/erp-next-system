import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';
    const orderBy = searchParams.get('order_by');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const paymentType = searchParams.get('payment_type');
    const modeOfPayment = searchParams.get('mode_of_payment');
    const documentNumber = searchParams.get('documentNumber');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters
    let filtersArray: any[] = [];
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const decodedFilters = decodeURIComponent(filters);
        filtersArray = JSON.parse(decodedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
        try {
          filtersArray = JSON.parse(filters);
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
      }
    }
    
    // Add search filter
    if (search) {
      filtersArray.push(["party_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter
    if (status) {
      filtersArray.push(["status", "=", status]);
    }
    
    // Add payment type filter
    if (paymentType) {
      filtersArray.push(["payment_type", "=", paymentType]);
    }
    
    // Add mode of payment filter
    if (modeOfPayment) {
      filtersArray.push(["mode_of_payment", "=", modeOfPayment]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Use client method instead of fetch
    const data = await client.getList('Payment Entry', {
      fields: ['name', 'payment_type', 'party', 'party_name', 'party_type', 'paid_amount', 'received_amount', 'status', 'posting_date', 'mode_of_payment', 'reference_no', 'custom_notes_payment', 'clearance_date'],
      filters: filtersArray,
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart),
      order_by: orderBy || 'creation desc, posting_date desc'
    });

    const totalRecords = await client.getCount('Payment Entry', { filters: filtersArray });

    return NextResponse.json({
      success: true,
      data,
      total_records: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/payments', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    const { name, ...updateData } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, message: 'Payment Entry name is required' }, { status: 400 });
    }

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.update('Payment Entry', name, updateData);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/finance/payments', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const paymentData = await request.json();

    // Validate required fields
    const requiredFields = ['company', 'payment_type', 'party_type', 'party', 'posting_date', 'mode_of_payment'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields
      }, { status: 400 });
    }

    // Validate payment amounts
    const paymentAmount = paymentData.payment_type === 'Receive' 
      ? paymentData.received_amount 
      : paymentData.paid_amount;
    
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Payment amount must be greater than 0',
        payment_amount: paymentAmount
      }, { status: 400 });
    }

    // Build payment entry payload for ERPNext
    const paymentPayload = {
      company: paymentData.company,
      payment_type: paymentData.payment_type,
      party_type: paymentData.party_type,
      party: paymentData.party,
      posting_date: paymentData.posting_date,
      paid_amount: paymentData.payment_type === 'Receive' ? (paymentData.received_amount || 0) : (paymentData.paid_amount || 0),
      received_amount: paymentData.payment_type === 'Receive' ? (paymentData.received_amount || 0) : (paymentData.paid_amount || 0),
      mode_of_payment: paymentData.mode_of_payment,
      reference_no: paymentData.reference_no,
      reference_date: paymentData.reference_date,
      references: paymentData.references || [],
      docstatus: 0,
      status: 'Draft',
      remark: `Payment via ${paymentData.mode_of_payment}`,
      type: paymentData.payment_type,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      paid_from: paymentData.paid_from || '',
      paid_from_account_currency: 'IDR',
      paid_to: paymentData.paid_to || '',
      paid_to_account_currency: 'IDR',
      custom_notes_payment: paymentData.custom_notes_payment || '',
    };

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client method instead of fetch
    const data = await client.insert('Payment Entry', paymentPayload);

    return NextResponse.json({
      success: true,
      data,
      message: 'Payment Entry created successfully'
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/payments', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
