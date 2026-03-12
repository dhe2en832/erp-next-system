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
    const filtersParam = searchParams.get('filters');
    const fieldsParam = searchParams.get('fields');
    const orderBy = searchParams.get('order_by') || 'creation desc, posting_date desc';
    const limit_page_length = searchParams.get('limit_page_length') || '20';
    const limit_start = searchParams.get('limit_start') || '0';

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Parse filters from JSON or build from individual params (backward compatibility)
    let filters: [string, string, string | number][] = [];
    
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (e) {
        console.error('Failed to parse filters:', e);
        filters = [];
      }
    }
    
    // Always add company filter if not already present
    const hasCompanyFilter = filters.some(f => Array.isArray(f) && f[0] === 'company');
    if (!hasCompanyFilter) {
      filters.push(['company', '=', company]);
    }
    
    // Backward compatibility: support individual query params
    const search = searchParams.get('search');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const account = searchParams.get('account');
    const voucher_type = searchParams.get('voucher_type');

    if (from_date && !filters.some(f => Array.isArray(f) && f[0] === 'posting_date' && f[1] === '>=')) {
      filters.push(['posting_date', '>=', from_date]);
    }

    if (to_date && !filters.some(f => Array.isArray(f) && f[0] === 'posting_date' && f[1] === '<=')) {
      filters.push(['posting_date', '<=', to_date]);
    }

    if (account && !filters.some(f => Array.isArray(f) && f[0] === 'account' && f[1] === 'like')) {
      filters.push(['account', 'like', `%${account}%`]);
    }

    if (voucher_type && !filters.some(f => Array.isArray(f) && f[0] === 'voucher_type')) {
      filters.push(['voucher_type', '=', voucher_type]);
    }

    if (search && !filters.some(f => Array.isArray(f) && f[0] === 'account' && f[1] === 'like')) {
      filters.push(['account', 'like', `%${search}%`]);
    }
    
    // Parse fields or use default
    const fields = fieldsParam 
      ? JSON.parse(fieldsParam)
      : ["name","posting_date","account","debit","credit","voucher_type","voucher_no","cost_center","company","remarks","fiscal_year","is_opening","project"];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of fetch
    const entries = await client.getList('GL Entry', {
      fields,
      filters,
      order_by: orderBy,
      limit_page_length: parseInt(limit_page_length),
      start: parseInt(limit_start)
    });
    
    // Get total count
    const totalRecords = await client.getCount('GL Entry', { filters });

    return NextResponse.json({
      success: true,
      data: entries,
      total_records: totalRecords,
      message: `Found ${entries.length} GL entries`
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/gl-entry', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();

    if (!body.account || !body.company) {
      return NextResponse.json(
        { success: false, message: 'Account and Company are required' },
        { status: 400 }
      );
    }

    if (body.debit === 0 && body.credit === 0) {
      return NextResponse.json(
        { success: false, message: 'Either Debit or Credit must be greater than 0' },
        { status: 400 }
      );
    }

    if (body.debit > 0 && body.credit > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot have both Debit and Credit greater than 0' },
        { status: 400 }
      );
    }

    const glEntryData = {
      posting_date: body.posting_date,
      account: body.account,
      debit: body.debit || 0,
      credit: body.credit || 0,
      against_account: body.against_account || '',
      voucher_type: body.voucher_type || 'Journal Entry',
      voucher_no: body.voucher_no || '',
      cost_center: body.cost_center || '',
      company: body.company,
      remarks: body.remarks || '',
      fiscal_year: body.fiscal_year || '',
      project: body.project || '',
      is_opening: 'No'
    };

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of fetch
    const result = await client.insert<{ name: string }>('GL Entry', glEntryData);

    return NextResponse.json({
      success: true,
      message: 'GL Entry created successfully',
      data: result
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/gl-entry', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
