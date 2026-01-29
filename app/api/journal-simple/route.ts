import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Testing Journal Entries without filters...');

    // Test 1: Simple request dengan fields yang valid (tanpa status)
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Journal Entry?fields=["name","voucher_type","posting_date","total_debit","total_credit","user_remark"]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('Journal Entries simple test - Status:', response.status);
    console.log('Journal Entries simple test - Full response structure:', JSON.stringify(data, null, 2));
    
    // Log structure details
    if (data.data && data.data.length > 0) {
      console.log('First journal entry structure:', JSON.stringify(data.data[0], null, 2));
      console.log('Available fields:', Object.keys(data.data[0]));
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        message: 'Journal Entries doctype is working'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch Journal Entries' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Journal Entries simple test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
