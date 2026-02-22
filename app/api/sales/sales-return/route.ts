import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * GET /api/sales/sales-return
 * List sales returns with pagination and filtering
 * 
 * Query Parameters:
 * - limit_page_length: number (default: 20)
 * - start: number (default: 0)
 * - search: string (customer name search)
 * - documentNumber: string (return document number)
 * - status: string (Draft | Submitted | Cancelled)
 * - from_date: string (YYYY-MM-DD)
 * - to_date: string (YYYY-MM-DD)
 * - filters: JSON string (additional ERPNext filters)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.7
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== Sales Return API Called ===');
    
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit_page_length') || searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Get authentication headers (API key priority, session fallback)
    const headers = getErpAuthHeaders(request);

    // Build filters array
    let filtersArray: any[] = [];
    
    // Parse existing filters if provided
    if (filters) {
      try {
        // Handle URL-encoded filters
        const decodedFilters = decodeURIComponent(filters);
        filtersArray = JSON.parse(decodedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
        // Try parsing directly if decoding fails
        try {
          filtersArray = JSON.parse(filters);
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
      }
    }
    
    // Add search filter (customer name)
    if (search) {
      filtersArray.push(["customer_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter
    if (status) {
      filtersArray.push(["status", "=", status]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Build ERPNext URL
    // Fields: name, customer, customer_name, posting_date, delivery_note, status, grand_total, creation
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Return?fields=["name","customer","customer_name","posting_date","delivery_note","status","grand_total","custom_notes","creation"]&limit_page_length=${limit}&start=${start}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log('Sales Return ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    console.log('Sales Return ERPNext Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Sales Return API Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        total_records: data.total_records || (data.data || []).length,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to fetch sales returns');
    }
  } catch (error) {
    console.error('Sales Return API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales/sales-return
 * Create a new sales return document
 * 
 * Request Body:
 * - company: string
 * - customer: string
 * - posting_date: string (YYYY-MM-DD)
 * - delivery_note: string (DN reference)
 * - naming_series: string ("RET-.YYYY.-")
 * - items: Array of return items
 * - custom_notes?: string
 * 
 * Requirements: 1.6, 4.1, 8.1, 8.2, 8.3, 9.2, 9.7
 */
export async function POST(request: NextRequest) {
  try {
    const salesReturnData = await request.json();
    console.log('=== CREATE SALES RETURN ===');
    console.log('Sales Return POST Payload:', JSON.stringify(salesReturnData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication (priority)');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication');
      
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
            console.log('CSRF token added to headers');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token, continuing without it:', csrfError);
      }
    } else {
      console.error('No authentication available - no session and no API keys');
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

    // Validate request body structure
    if (!salesReturnData.customer || !salesReturnData.posting_date || !salesReturnData.delivery_note) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customer, posting_date, or delivery_note' },
        { status: 400 }
      );
    }

    if (!salesReturnData.items || !Array.isArray(salesReturnData.items) || salesReturnData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of salesReturnData.items) {
      if (!item.item_code || !item.qty || item.qty <= 0) {
        return NextResponse.json(
          { success: false, message: 'Each item must have item_code and qty > 0' },
          { status: 400 }
        );
      }
      if (!item.return_reason) {
        return NextResponse.json(
          { success: false, message: 'Return reason is required for all items' },
          { status: 400 }
        );
      }
      if (item.return_reason === 'Other' && !item.return_notes) {
        return NextResponse.json(
          { success: false, message: 'Return notes are required when reason is "Other"' },
          { status: 400 }
        );
      }
    }

    // Set default naming series if not provided
    if (!salesReturnData.naming_series) {
      salesReturnData.naming_series = 'RET-.YYYY.-';
    }

    // Ensure doctype is set
    salesReturnData.doctype = 'Sales Return';

    console.log('Making request to ERPNext with headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Return`, {
      method: 'POST',
      headers,
      body: JSON.stringify(salesReturnData),
    });

    const responseText = await response.text();
    console.log('Sales Return ERPNext Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Sales Return ERPNext Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to create sales return', salesReturnData);
    }
  } catch (error) {
    console.error('Sales Return POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
