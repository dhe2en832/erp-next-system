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
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Delivery Note name is required'
      }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use frappe.desk.form.load.getdoc method for full document details
    const data = await client.call('frappe.desk.form.load.getdoc', {
      doctype: 'Delivery Note',
      name: name
    }) as any;

    // form.load.getdoc returns data in different structure
    const dnData = data.docs?.[0] || data.doc || data.data || data;

    return NextResponse.json({
      success: true,
      message: 'Delivery Note detail fetched successfully',
      data: dnData
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/delivery-notes/detail', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
