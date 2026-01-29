import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { company } = await request.json();

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set company as session default in ERPNext (optional but recommended)
    try {
      await fetch(`${ERPNEXT_API_URL}/api/method/frappe.utils.setup_docs.set_session_default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
        body: JSON.stringify({
          default_company: company,
        }),
      });
    } catch (error) {
      console.log('Failed to set session default in ERPNext, but continuing...');
    }

    // Store selected company in a secure cookie
    const responseNext = NextResponse.json({
      success: true,
      message: 'Company set successfully',
      company: company,
    });

    responseNext.cookies.set('selected_company', company, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return responseNext;

  } catch (error) {
    console.error('Set company error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
