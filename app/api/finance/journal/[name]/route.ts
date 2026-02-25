import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
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

    // Fetch journal entry detail with accounts
    const response = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Journal Entry/${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: _h,
      }
    );

    const data = await response.json();

    if (response.ok && data.data) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch journal entry' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Journal Entry detail API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
