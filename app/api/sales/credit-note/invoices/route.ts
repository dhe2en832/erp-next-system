/**
 * API Route: Get Paid Sales Invoices for Credit Note
 * 
 * Fetches Sales Invoices with status "Paid" for Credit Note creation
 * 
 * Requirements: 1.3, 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * GET /api/sales/credit-note/invoices
 * 
 * Fetch paid Sales Invoices for Credit Note selection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authentication headers
    const headers = getErpAuthHeaders(request);

    // Build ERPNext URL with query params
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?${searchParams.toString()}`;
    
    // console.log('Fetching paid invoices:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch invoices' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error fetching paid invoices:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
