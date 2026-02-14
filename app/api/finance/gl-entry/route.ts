import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const account = searchParams.get('account');
    const voucher_type = searchParams.get('voucher_type');
    const limit_page_length = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Build filters array
    const filters = [
      ['company', '=', company]
    ];

    if (from_date) {
      filters.push(['posting_date', '>=', from_date]);
    }

    if (to_date) {
      filters.push(['posting_date', '<=', to_date]);
    }

    if (account) {
      filters.push(['account', 'like', `%${account}%`]);
    }

    if (voucher_type) {
      filters.push(['voucher_type', '=', voucher_type]);
    }

    if (search) {
      filters.push(['account', 'like', `%${search}%`]);
    }

    // Get GL entries from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","posting_date","account","debit","credit","voucher_type","voucher_no","cost_center","company","remarks","fiscal_year","is_opening","project"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=${limit_page_length}&start=${start}`;

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
        const countUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=1`;
        
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
            const totalRecords = countData.data ? countData.data.length : 0;
            
            return NextResponse.json({
              success: true,
              data: data.data,
              total_records: totalRecords,
              message: `Found ${data.data.length} GL entries`
            });
          }
        } catch (countError) {
          // Fallback
        }

        return NextResponse.json({
          success: true,
          data: data.data,
          total_records: data.data.length,
          message: `Found ${data.data.length} GL entries`
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No GL entries found',
          data: []
        });
      }
    } else {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch GL entries from ERPNext',
        error: errorText
      });
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
