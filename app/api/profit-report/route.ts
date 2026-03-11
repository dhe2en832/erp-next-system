import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { normalizeProfitReport } from '@/lib/normalizers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { from_date, to_date, company, mode, include_hpp } = body || {};
    const effectiveCompany = company || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;

    if (!from_date || !to_date) {
      return NextResponse.json({ success: false, message: 'from_date dan to_date wajib diisi' }, { status: 400 });
    }

    const data = await client.call('get_profit_commission_report_dual', {
      from_date,
      to_date,
      company: effectiveCompany,
      mode: mode || 'valuation',
      include_hpp,
    }) as any;
    
    const normalized = normalizeProfitReport(data);

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/profit-report', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
