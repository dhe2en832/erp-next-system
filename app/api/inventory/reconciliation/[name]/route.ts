import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  const { name } = await params;
  
  try {
    const client = await getERPNextClientForRequest(request);
    const data = await client.get('Stock Reconciliation', name) as any;
    
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, `GET /api/inventory/reconciliation/${name}`, siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  const { name } = await params;
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    
    // Check if document is already submitted
    const existing = await client.get('Stock Reconciliation', name) as any;
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Cannot update submitted document' },
        { status: 400 }
      );
    }
    
    const data = await client.update('Stock Reconciliation', name, body);
    
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, `PUT /api/inventory/reconciliation/${name}`, siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  const { name } = await params;
  
  try {
    const client = await getERPNextClientForRequest(request);
    
    // Check if document is submitted
    const existing = await client.get('Stock Reconciliation', name) as any;
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete submitted document. Cancel it first.' },
        { status: 400 }
      );
    }
    
    await client.delete('Stock Reconciliation', name);
    
    return NextResponse.json({ success: true, message: 'Stock Reconciliation deleted successfully' });
  } catch (error: unknown) {
    logSiteError(error, `DELETE /api/inventory/reconciliation/${name}`, siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
