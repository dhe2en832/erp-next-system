import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * GET /api/sales/sales-return/[name]
 * Retrieve a specific sales return document with all details
 * 
 * Uses ERPNext form.load.getdoc method to get complete document data
 * including all child tables (items)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.7
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    // Debug logging
    console.log('=== Sales Return Detail API Called ===');
    console.log('Sales Return name parameter:', name);
    console.log('Sales Return name type:', typeof name);
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      console.log('Sales Return API - Name is empty or null');
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      console.log('Sales Return API - Invalid name value:', name);
      return NextResponse.json(
        { success: false, message: 'Invalid sales return name provided' },
        { status: 400 }
      );
    }

    // Get authentication headers (API key priority, session fallback)
    const headers = getErpAuthHeaders(request);
    
    // Check if authentication is available
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    console.log('Sales Return API - Fetching sales return:', name);
    
    // Use ERPNext's form.load.getdoc method to get complete document data
    // This method returns the document with all child tables populated
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?doctype=Sales%20Return&name=${encodeURIComponent(name.trim())}`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('Sales Return API - ERPNext Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Sales Return API - ERPNext Error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        return NextResponse.json(
          { success: false, message: 'Failed to fetch sales return details' },
          { status: response.status }
        );
      }
      
      return handleERPNextAPIError(response, errorData, 'Failed to fetch sales return details');
    }

    const data = await response.json();
    console.log('Sales Return API - Success, data keys:', Object.keys(data));

    // form.load.getdoc returns data in different structure
    // The actual document data is in data.docs or data.doc
    const salesReturnData = data.docs?.[0] || data.doc || data;
    
    console.log('Sales Return API - Sales Return data keys:', Object.keys(salesReturnData || {}));
    console.log('Sales Return API - Items count:', salesReturnData?.items?.length || 0);

    return NextResponse.json({
      success: true,
      data: salesReturnData,
    });

  } catch (error) {
    console.error('Sales Return Detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales/sales-return/[name]
 * Update a sales return document (only allowed for Draft status)
 * 
 * Request Body: Same as POST /api/sales/sales-return
 * 
 * Requirements: 9.4, 9.7
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    console.log('=== Sales Return Update API Called ===');
    console.log('Sales Return name:', name);
    
    // Validate name parameter
    if (!name || name === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('Sales Return PUT Payload:', JSON.stringify(body, null, 2));
    
    // Remove name from body to avoid conflicts
    const { name: _n, ...updateData } = body;

    // Get authentication headers
    const headers = getErpAuthHeaders(request);
    
    // Check if authentication is available
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // Validate request body structure
    if (updateData.items && Array.isArray(updateData.items)) {
      for (const item of updateData.items) {
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
    }

    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Return/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      }
    );

    const responseText = await response.text();
    console.log('Sales Return PUT Response Status:', response.status);
    
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

    console.log('Sales Return PUT Response Data:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to update sales return', updateData);
    }
  } catch (error) {
    console.error('Sales Return PUT Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
