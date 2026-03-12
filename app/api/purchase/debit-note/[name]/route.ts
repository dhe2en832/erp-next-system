import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/purchase/debit-note/[name]
 * Fetch single debit note details
 * Requirements: 13.3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Nama Debit Memo diperlukan' },
        { status: 400 }
      );
    }
    
    if (name === 'undefined' || name === 'null' || name === 'undefined/') {
      return NextResponse.json(
        { success: false, message: 'Nama Debit Memo tidak valid' },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Get Debit Note details
    const result = await client.get('Purchase Invoice', name.trim()) as any;
    
    // Validate if it's actually a debit note (return)
    const debitNote = result.docs?.[0] || result.doc || result;

    return NextResponse.json({
      success: true,
      data: debitNote,
    });

  } catch (error) {
    logSiteError(error, 'GET /api/purchase/debit-note/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/purchase/debit-note/[name]
 * Update draft debit note
 * Requirements: 13.4
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Nama Debit Memo diperlukan' },
        { status: 400 }
      );
    }
    
    const debitNoteData = await request.json();

    // Validate docstatus - only Draft (0) can be edited
    if (debitNoteData.docstatus && debitNoteData.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Hanya Debit Memo dengan status Draft yang dapat diubah' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedDebitNote = await client.update('Purchase Invoice', name.trim(), debitNoteData);

    return NextResponse.json({
      success: true,
      data: updatedDebitNote,
      message: 'Debit Memo berhasil diupdate'
    });

  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/debit-note/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/purchase/debit-note/[name]
 * Delete draft debit note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Nama Debit Memo diperlukan' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.delete method
    await client.delete('Purchase Invoice', name.trim());

    return NextResponse.json({
      success: true,
      message: 'Debit Memo berhasil dihapus'
    });

  } catch (error) {
    logSiteError(error, 'DELETE /api/purchase/debit-note/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
