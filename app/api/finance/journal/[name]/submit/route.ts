import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Journal Entry name is required' },
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
    if (_ak && _as) { 
      _h['Authorization'] = `token ${_ak}:${_as}`; 
    } else { 
      _h['Cookie'] = `sid=${sid}`; 
    }

    // Submit the journal entry by calling ERPNext's submit endpoint
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Journal Entry/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        headers: _h,
        body: JSON.stringify({
          docstatus: 1, // 1 = Submitted
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Journal Entry ${name} berhasil disubmit`,
      });
    } else {
      const errorMsg = data._server_messages
        ? (() => { 
            try { 
              const msgs = JSON.parse(data._server_messages); 
              return typeof msgs[0] === 'string' ? JSON.parse(msgs[0]).message : msgs[0].message; 
            } catch { 
              return data.message || 'Gagal submit journal entry'; 
            } 
          })()
        : data.message || 'Gagal submit journal entry';
      
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Journal Entry submit API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
