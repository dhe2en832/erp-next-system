import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Always use sid to identify who is actually logged in (NOT api key — that would return Administrator)
    const sessionHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': `sid=${sid}`,
    };

    // Get current logged user id using their session
    const whoamiRes = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.auth.get_logged_user`, {
      method: 'GET',
      headers: sessionHeaders,
    });
    if (!whoamiRes.ok) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const whoamiData = await whoamiRes.json();
    const userId = whoamiData.message;

    // Fetch user detail + roles — use API key if available (has read access to all users)
    const detailHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiSecret) {
      detailHeaders['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else {
      detailHeaders['Cookie'] = `sid=${sid}`;
    }

    const userRes = await fetch(
      `${ERPNEXT_API_URL}/api/resource/User/${encodeURIComponent(userId)}?fields=${encodeURIComponent(JSON.stringify(['name','full_name','email','username','enabled','user_type','roles']))}`,
      { method: 'GET', headers: detailHeaders }
    );
    if (!userRes.ok) {
      return NextResponse.json({ success: false, message: 'Gagal mengambil data pengguna' }, { status: userRes.status });
    }
    const userData = await userRes.json();
    const roles = (userData.data?.roles || []).map((r: any) => r.role);

    return NextResponse.json({
      success: true,
      data: {
        name: userData.data?.name,
        full_name: userData.data?.full_name,
        email: userData.data?.email,
        username: userData.data?.username,
        roles,
        enabled: userData.data?.enabled,
        user_type: userData.data?.user_type,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
