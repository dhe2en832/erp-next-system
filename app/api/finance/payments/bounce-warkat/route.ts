import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/finance/payments/bounce-warkat
 * Proxy to ERPNext server script: bounce_warkat_payment
 * 
 * Payload: { company, payment_entry, reason, payment_type }
 * PAY:     Journal Entry: Dr Warkat Keluar → Cr Hutang Dagang (hutang muncul kembali)
 * RECEIVE: Journal Entry: Dr Piutang Dagang → Cr Warkat Masuk (piutang muncul kembali)
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company, payment_entry, reason, payment_type } = body;

    if (!company || !payment_entry) {
      return NextResponse.json({
        success: false,
        message: 'Field company dan payment_entry wajib diisi',
      }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Use client call method for custom ERPNext method
    const data = await client.call('bounce_warkat_payment', {
      company,
      payment_entry,
      reason: reason || 'Warkat ditolak',
      payment_type
    });

    return NextResponse.json({
      success: true,
      journal_entry: data.journal_entry || data,
      status: 'Bounced',
      message: `Warkat ${payment_entry} berhasil ditolak`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/payments/bounce-warkat', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
