import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) { _h['Authorization'] = `token ${_ak}:${_as}`; } else { _h['Cookie'] = `sid=${sid}`; }

    // Build ERPNext URL sesuai pattern yang berhasil (seperti companies dan login)
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Journal Entry?fields=["name","voucher_type","posting_date","total_debit","total_credit","user_remark"]&limit_page_length=${limit}&start=${start}`;
    
    if (filters) {
      // Gunakan filters tanpa additional encoding (seperti pattern yang ada)
      erpNextUrl += `&filters=${filters}`;
    }

    console.log('Journal ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: _h,
      }
    );

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
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
