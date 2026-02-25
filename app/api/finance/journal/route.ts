import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
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
    const order_by = searchParams.get('order_by') || 'creation desc';

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) { _h['Authorization'] = `token ${_ak}:${_as}`; } else { _h['Cookie'] = `sid=${sid}`; }

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
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Journal Entry?fields=${encodeURIComponent(JSON.stringify(basicFields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=${limit_page_length}&limit_start=${start}&order_by=${encodeURIComponent(order_by)}`;

    console.log('Journal ERPNext URL:', erpNextUrl);
    console.log('Filters:', JSON.stringify(filters, null, 2));

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: _h,
    });

    const data = await response.json();
    console.log('Journal Response (first 2 entries):', JSON.stringify(data.data?.slice(0, 2), null, 2));

    if (response.ok && data.data) {
      // Fetch detailed data for each entry to get accounts
      const enrichedData = await Promise.all(
        data.data.map(async (entry: any) => {
          let total_debit = 0;
          let total_credit = 0;
          
          try {
            // Fetch full document to get accounts child table
            const detailResponse = await fetch(
              `${ERPNEXT_API_URL}/api/resource/Journal Entry/${encodeURIComponent(entry.name)}`,
              { method: 'GET', headers: _h }
            );
            
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const accounts = detailData.data?.accounts || [];
              
              console.log(`Accounts for ${entry.name}:`, accounts.length, 'entries');
              
              accounts.forEach((acc: any) => {
                const debit = parseFloat(acc.debit_in_account_currency || acc.debit || 0);
                const credit = parseFloat(acc.credit_in_account_currency || acc.credit || 0);
                total_debit += debit;
                total_credit += credit;
              });
              
              console.log(`Totals for ${entry.name}: debit=${total_debit}, credit=${total_credit}`);
            }
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
      const countUrl = `${ERPNEXT_API_URL}/api/resource/Journal Entry?filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=0`;
      let totalRecords = enrichedData.length;
      
      try {
        const countResponse = await fetch(countUrl, {
          method: 'GET',
          headers: _h,
        });

        if (countResponse.ok) {
          const countData = await countResponse.json();
          if (countData.data && Array.isArray(countData.data)) {
            totalRecords = countData.data.length;
          }
        }
      } catch (countError) {
        console.error('Failed to get count:', countError);
      }

      return NextResponse.json({
        success: true,
        data: enrichedData,
        total_records: totalRecords,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch journal entries' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Journal API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const journalData = await request.json();

    const sid2 = request.cookies.get('sid')?.value;
    if (!sid2) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak2 = process.env.ERP_API_KEY;
    const _as2 = process.env.ERP_API_SECRET;
    const _h2: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak2 && _as2) { _h2['Authorization'] = `token ${_ak2}:${_as2}`; } else { _h2['Cookie'] = `sid=${sid2}`; }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Journal Entry`, {
      method: 'POST',
      headers: _h2,
      body: JSON.stringify(journalData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create journal entry' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Journal creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
