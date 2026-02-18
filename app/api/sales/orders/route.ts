import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Build filters
    let filtersArray = [];
    
    // Always add company filter if company is provided
    const company = searchParams.get('company');
    if (company) {
      filtersArray.push(["company", "=", company]);
    }
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        // Merge with existing filters, but don't duplicate company filter
        parsedFilters.forEach((filter: any) => {
          if (filter[0] !== 'company') {
            filtersArray.push(filter);
          }
        });
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }
    
    // Add search filter
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
      filtersArray.push(["transaction_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["transaction_date", "<=", toDate]);
    }

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","customer_name","transaction_date","grand_total","status","docstatus","delivery_date","custom_notes_so"]&limit_page_length=${limit}&start=${start}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    }

    console.log('Sales Order ERPNext URL:', erpNextUrl);

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Sales Order API Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sales orders' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Order API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orderData = await request.json();
    const { name, ...updateData } = orderData;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Sales Order name is required for update' },
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
      console.log('Using API key authentication for update');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for update');
    } else {
      console.error('No authentication available - no session and no API keys');
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

    console.log('Making update request to ERPNext with headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order/${name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to update sales order' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Order PUT Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    console.log('Sales Order POST Payload:', JSON.stringify(orderData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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

    console.log('Making request to ERPNext with headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Order`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    console.log('Sales Order ERPNext Response Status:', response.status);
    console.log('Sales Order ERPNext Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      // Extract detailed error message from ERPNext
      let errorMessage = 'Failed to create sales order';
      
      console.log('Error parsing - data keys:', Object.keys(data));
      console.log('Error parsing - data.exc:', data.exc);
      console.log('Error parsing - data.message:', data.message);
      console.log('Error parsing - data._server_messages:', data._server_messages);
      
      if (data.exc) {
        // Parse ERPNext exception
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed excData:', excData);
          
          if (excData.exc_type === 'MandatoryError') {
            errorMessage = `Missing required field: ${excData.message}`;
          } else if (excData.exc_type === 'ValidationError') {
            errorMessage = `Validation error: ${excData.message}`;
          } else if (excData.exc_type === 'LinkValidationError') {
            errorMessage = `Invalid reference: ${excData.message}`;
          } else if (excData.exc_type === 'PermissionError') {
            errorMessage = `Permission denied: ${excData.message}`;
          } else {
            errorMessage = `${excData.exc_type}: ${excData.message}`;
          }
        } catch (_e) {
          console.log('Failed to parse exc, using fallback');
          errorMessage = data.message || data.exc || 'Failed to create sales order';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          console.log('Parsed serverMessages:', serverMessages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (_e) {
          console.log('Failed to parse _server_messages, using raw value');
          errorMessage = data._server_messages;
        }
      } else if (data.exc_type && data.exc_message) {
        errorMessage = `${data.exc_type}: ${data.exc_message}`;
      } else {
        // Last resort - try to extract any meaningful info
        const dataStr = JSON.stringify(data);
        console.log('Last resort - full data:', dataStr);
        errorMessage = `ERPNext Error: ${dataStr.substring(0, 200)}...`;
      }
      
      console.error('Sales Order POST Error Details:', {
        status: response.status,
        data: data,
        errorMessage: errorMessage
      });
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Sales Order POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
