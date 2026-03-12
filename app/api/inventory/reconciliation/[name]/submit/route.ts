import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  const { name } = await params;
  
  try {
    const client = await getERPNextClientForRequest(request);
    
    interface ReconciliationDoc {
      docstatus: number;
      [key: string]: unknown;
    }
    // Check if document exists and is in draft state
    const existing = await client.get<ReconciliationDoc>('Stock Reconciliation', name);
    
    if (existing.docstatus === 1) {
      return NextResponse.json(
        { success: false, message: 'Document is already submitted' },
        { status: 400 }
      );
    }
    
    if (existing.docstatus === 2) {
      return NextResponse.json(
        { success: false, message: 'Cannot submit cancelled document' },
        { status: 400 }
      );
    }
    
    // Submit the document
    const data = await client.submit<Record<string, unknown>>('Stock Reconciliation', name);
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Stock Reconciliation submitted successfully' 
    });
  } catch (error: unknown) {
    logSiteError(error, `POST /api/inventory/reconciliation/${name}/submit`, siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
