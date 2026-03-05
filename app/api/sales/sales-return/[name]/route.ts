import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

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
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '' || name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Invalid sales return name provided' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use ERPNext's form.load.getdoc method to get complete document data
    const data = await client.call('frappe.desk.form.load.getdoc', {
      doctype: 'Sales Return',
      name: name.trim()
    });

    // form.load.getdoc returns data in different structure
    const salesReturnData = data.docs?.[0] || data.doc || data;

    return NextResponse.json({
      success: true,
      data: salesReturnData,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/sales/sales-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 
                       (error as any)?.message?.includes('not found') ? 404 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
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
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'Sales Return name is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Remove name from body to avoid conflicts
    const { name: _n, ...updateData } = body;

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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Update sales return using client
    const result = await client.update('Sales Return', name, updateData);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/sales/sales-return/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
