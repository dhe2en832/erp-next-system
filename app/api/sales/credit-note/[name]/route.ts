/**
 * Credit Note Detail API Routes
 * 
 * Handles get, update, and delete operations for individual Credit Notes
 * Requirements: 4.7, 4.8
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * GET /api/sales/credit-note/[name]
 * Get Credit Note detail with all child tables
 * Requirements: 4.7, 4.8
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama Credit Note diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use frappe.desk.form.load.getdoc for complete document with child tables
    const data = await client.call('frappe.desk.form.load.getdoc', {
      doctype: 'Sales Invoice',
      name: name,
    });

    if (data.docs && data.docs.length > 0) {
      const creditNote = data.docs[0];
      
      // Verify this is actually a Credit Note (is_return=1)
      if (creditNote.is_return !== 1) {
        return NextResponse.json(
          { success: false, message: 'Dokumen bukan Credit Note' },
          { status: 400 }
        );
      }

      // Transform field names for frontend compatibility
      const transformedCreditNote = {
        ...creditNote,
        // Transform return_against to sales_invoice for frontend
        sales_invoice: creditNote.return_against,
      };

      return NextResponse.json({
        success: true,
        data: transformedCreditNote,
      });
    } else {
      // Fallback: Try using getDoc method
      const creditNote = await client.getDoc('Sales Invoice', name) as any;
      
      // Verify this is a Credit Note
      if (creditNote.is_return !== 1) {
        return NextResponse.json(
          { success: false, message: 'Dokumen bukan Credit Note' },
          { status: 400 }
        );
      }
      
      // Transform field names
      const transformedCreditNote = {
        ...creditNote,
        sales_invoice: creditNote.return_against,
      };
      
      return NextResponse.json({
        success: true,
        data: transformedCreditNote,
      });
    }

  } catch (error) {
    logSiteError(error, 'GET /api/sales/credit-note/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 
                       (error as any)?.message?.includes('not found') ? 404 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

/**
 * PUT /api/sales/credit-note/[name]
 * Update Credit Note (Draft only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  
  return NextResponse.json({
    success: false,
    message: 'Not implemented yet',
    name
  }, { status: 501 });
}

/**
 * DELETE /api/sales/credit-note/[name]
 * Delete Credit Note (Draft only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  
  return NextResponse.json({
    success: false,
    message: 'Not implemented yet',
    name
  }, { status: 501 });
}
