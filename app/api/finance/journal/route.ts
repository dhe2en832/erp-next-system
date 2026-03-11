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
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const voucher_type = searchParams.get('voucher_type');
    const status = searchParams.get('status');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const kas_type = searchParams.get('kas_type'); // 'masuk' atau 'keluar'
    const limit_page_length = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    const order_by = searchParams.get('order_by') || 'creation desc, posting_date desc';

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    // Build filters array
    const filters: any[] = [['company', '=', company]];
    
    // Filter berdasarkan kas_type (masuk/keluar) di user_remark
    if (kas_type === 'masuk') {
      filters.push(['user_remark', 'like', '%Kas Masuk%']);
    } else if (kas_type === 'keluar') {
      filters.push(['user_remark', 'like', '%Kas Keluar%']);
    }
    
    if (search) {
      // Search in both name and user_remark
      filters.push(['name', 'like', `%${search}%`]);
    }
    if (voucher_type) {
      filters.push(['voucher_type', '=', voucher_type]);
    }
    if (status) {
      filters.push(['docstatus', '=', status === 'Submitted' ? 1 : status === 'Cancelled' ? 2 : 0]);
    }
    if (from_date) {
      filters.push(['posting_date', '>=', from_date]);
    }
    if (to_date) {
      filters.push(['posting_date', '<=', to_date]);
    }

    // Fetch journal entries - first get basic fields
    const basicFields = ["name","voucher_type","posting_date","user_remark","company","creation","docstatus"];
    
    const data = await client.getList('Journal Entry', {
      fields: basicFields,
      filters,
      limit_page_length: parseInt(limit_page_length),
      start: parseInt(start),
      order_by
    });

    // Fetch detailed data for each entry to get accounts
    const enrichedData = await Promise.all(
      data.map(async (entry: any) => {
        let total_debit = 0;
        let total_credit = 0;
        
        try {
          // Fetch full document to get accounts child table
          const detailData = await client.get('Journal Entry', entry.name) as any;
          const accounts = detailData?.accounts || [];
          
          accounts.forEach((acc: any) => {
            const debit = parseFloat(acc.debit_in_account_currency || acc.debit || 0);
            const credit = parseFloat(acc.credit_in_account_currency || acc.credit || 0);
            total_debit += debit;
            total_credit += credit;
          });
        } catch (err) {
          console.error(`Failed to fetch accounts for ${entry.name}:`, err);
        }

        // Map docstatus to status text
        let status = 'Draft';
        if (entry.docstatus === 1) status = 'Submitted';
        else if (entry.docstatus === 2) status = 'Cancelled';

        return {
          name: entry.name,
          voucher_type: entry.voucher_type,
          posting_date: entry.posting_date,
          total_debit,
          total_credit,
          user_remark: entry.user_remark || '',
          company: entry.company,
          creation: entry.creation,
          status,
        };
      })
    );

    // Get total count
    let totalRecords = enrichedData.length;
    
    try {
      totalRecords = await client.getCount('Journal Entry', { filters });
    } catch (countError) {
      console.error('Failed to get count:', countError);
    }

    return NextResponse.json({
      success: true,
      data: enrichedData,
      total_records: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/journal', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const journalData = await request.json();

    // Get site-aware client (handles dual authentication: API Key → session cookie fallback)
    const client = await getERPNextClientForRequest(request);

    const result = await client.insert('Journal Entry', journalData) as any;

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/journal', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
