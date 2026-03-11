import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/finance/payments/clear-warkat
 * Proxy to ERPNext server script: clear_warkat_payment
 * 
 * Payload: { company, payment_entry, bank_account, payment_type }
 * PAY:     Journal Entry: Dr Warkat Keluar → Cr Bank
 * RECEIVE: Journal Entry: Dr Bank → Cr Warkat Masuk
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check site-specific session cookie first, then fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company, payment_entry, bank_account, payment_type, clearance_date } = body;

    if (!company || !payment_entry || !bank_account) {
      return NextResponse.json({
        success: false,
        message: 'Field company, payment_entry, dan bank_account wajib diisi',
      }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client call method for custom ERPNext method
    const data = await client.call('clear_warkat_payment', {
      company,
      payment_entry,
      bank_account,
      payment_type,
      clearance_date
    }) as any;

    return NextResponse.json({
      success: true,
      journal_entry: data.journal_entry || data,
      status: 'Cleared',
      message: `Warkat ${payment_entry} berhasil dicairkan`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/payments/clear-warkat', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
