import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

/**
 * GET /api/setup/users
 * Fetch list of users from ERPNext with their roles.
 */
export async function GET(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const fields = ['name', 'full_name', 'email', 'enabled', 'user_type', 'last_login', 'creation'];
    const filters = [['user_type', '!=', 'Website User']];
    const erpUrl = `${ERPNEXT_API_URL}/api/resource/User?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=100&order_by=full_name`;

    const response = await fetch(erpUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      // Fetch roles for each user (batch)
      const users = data.data || [];
      const usersWithRoles = await Promise.all(
        users.map(async (user: any) => {
          try {
            const roleUrl = `${ERPNEXT_API_URL}/api/resource/User/${encodeURIComponent(user.name)}?fields=["roles"]`;
            const roleRes = await fetch(roleUrl, { method: 'GET', headers });
            if (roleRes.ok) {
              const roleData = await roleRes.json();
              const roles = (roleData.data?.roles || []).map((r: any) => r.role);
              return { ...user, roles };
            }
          } catch { /* silent */ }
          return { ...user, roles: [] };
        })
      );

      return NextResponse.json({ success: true, data: usersWithRoles });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch users' },
        { status: response.status }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

/**
 * POST /api/setup/users
 * Create a new user in ERPNext.
 */
export async function POST(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, full_name, new_password, roles } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { success: false, message: 'Email dan nama lengkap harus diisi' },
        { status: 400 }
      );
    }

    const userPayload: any = {
      doctype: 'User',
      email,
      first_name: full_name.split(' ')[0],
      last_name: full_name.split(' ').slice(1).join(' ') || '',
      full_name,
      enabled: 1,
      user_type: 'System User',
      send_welcome_email: 0,
    };

    if (new_password) {
      userPayload.new_password = new_password;
    }

    if (roles && roles.length > 0) {
      userPayload.roles = roles.map((role: string) => ({ role }));
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/User`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userPayload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Pengguna ${email} berhasil dibuat`,
      });
    } else {
      const errorMsg = data._server_messages
        ? (() => { try { const msgs = JSON.parse(data._server_messages); return typeof msgs[0] === 'string' ? JSON.parse(msgs[0]).message : msgs[0].message; } catch { return data.message || 'Gagal membuat pengguna'; } })()
        : data.message || 'Gagal membuat pengguna';
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: response.status }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
