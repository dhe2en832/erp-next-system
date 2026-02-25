import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const filtersParam = searchParams.get('filters');
    const fieldsParam = searchParams.get('fields');
    const orderBy = searchParams.get('order_by') || 'posting_date desc';
    const limit_page_length = searchParams.get('limit_page_length') || '20';
    const limit_start = searchParams.get('limit_start') || '0';

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Parse filters from JSON or build from individual params (backward compatibility)
    let filters: any[] = [];
    
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

    // Get GL entries from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=${encodeURIComponent(orderBy)}&limit_page_length=${limit_page_length}&limit_start=${limit_start}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
    });

    if (response.ok) {
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // Get total count using ERPNext count API
        const countUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=0`;
        
        let totalRecords = data.data.length;
        
        try {
          const countResponse = await fetch(countUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
            },
          });

          if (countResponse.ok) {
            const countData = await countResponse.json();
            // ERPNext returns total count in the response
            if (countData.data && Array.isArray(countData.data)) {
              totalRecords = countData.data.length;
            }
          }
        } catch (countError) {
          console.error('Failed to get count:', countError);
          // Fallback to data length
        }

        return NextResponse.json({
          success: true,
          data: data.data,
          total_records: totalRecords,
          message: `Found ${data.data.length} GL entries`
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'No GL entries found',
          data: [],
          total_records: 0
        });
      }
    } else {
      const errorText = await response.text();
      console.error('ERPNext API error:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch GL entries from ERPNext',
        error: errorText
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('GL Entry API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/GL Entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify(glEntryData)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return NextResponse.json({
          success: true,
          message: 'GL Entry created successfully',
          data: data.data
        });
      } else {
        return NextResponse.json({
          success: false,
          message: data.message || 'Failed to create GL Entry',
          error: data
        });
      }
    } else {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        message: 'Failed to create GL Entry in ERPNext',
        error: errorText
      });
    }

  } catch (error: any) {
    console.error('GL Entry API create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
