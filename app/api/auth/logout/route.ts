import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'No session found' },
        { status: 401 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/method/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const responseNext = NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });

      responseNext.cookies.delete('sid');

      return responseNext;
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Logout failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
