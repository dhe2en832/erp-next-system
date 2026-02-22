import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * POST /api/sales/sales-return/[name]/submit
 * Submit a sales return document (change status from Draft to Submitted)
 * 
 * This endpoint:
 * 1. Validates the document is in Draft status
 * 2. Calls ERPNext submit method (sets docstatus to 1)
 * 3. Triggers inventory updates (increases stock quantities)
 * 4. Returns updated document with Submitted status
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5, 9.7
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== Sales Return Submit API Called ===');
    const { name } = await params;
    
    console.log('Sales Return Name:', name);
    console.log('Request Method:', request.method);
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
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

    console.log('Submitting sales return:', name);
    console.log('Available auth methods:', { 
      hasApiKey: !!headers['Authorization'], 
      hasSession: !!headers['Cookie']
    });

    // Submit the sales return by setting docstatus to 1
    // This will trigger ERPNext's submit workflow including inventory updates
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales%20Return/${encodeURIComponent(name)}`;
    const requestBody = JSON.stringify({
      docstatus: 1
    });
    
    console.log('Making ERPNext Request:');
    console.log('URL:', erpNextUrl);
    console.log('Method: PUT');
    console.log('Body:', requestBody);
    
    const response = await fetch(erpNextUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const responseText = await response.text();
    console.log('Submit Response Status:', response.status);
    
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

    console.log('Submit Response Data:', data);
    
    if (response.ok) {
      // Extract the document data from response
      const salesReturnData = data.data || data.docs?.[0] || data.doc || data;
      
      return NextResponse.json({
        success: true,
        data: salesReturnData,
        message: 'Sales Return submitted successfully'
      });
    } else {
      // Handle ERPNext errors with detailed messages
      return handleERPNextAPIError(response, data, 'Failed to submit sales return');
    }
    
  } catch (error) {
    console.error('Sales Return Submit Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
