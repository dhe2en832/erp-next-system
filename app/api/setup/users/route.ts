import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/setup/users
 * Fetch list of users from ERPNext with their roles.
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check authentication
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const fields = ['name', 'full_name', 'email', 'enabled', 'user_type', 'last_login', 'creation'];
    const filters = [['user_type', '!=', 'Website User']];

    const users = await client.getList('User', {
      fields,
      filters,
      limit_page_length: 100,
      order_by: 'full_name'
    });

    // Fetch roles for each user (batch)
    const usersWithRoles = await Promise.all(
      users.map(async (user: any) => {
        try {
          const userDetail = await client.getDoc('User', user.name);
          const roles = (userDetail.roles || []).map((r: any) => r.role);
          return { ...user, roles };
        } catch {
          return { ...user, roles: [] };
        }
      })
    );

    return NextResponse.json({ success: true, data: usersWithRoles });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/users', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/setup/users
 * Create a new user in ERPNext.
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check authentication
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

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

    const result = await client.insert('User', userPayload);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Pengguna ${email} berhasil dibuat`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/setup/users', siteId);
    
    // Try to extract ERPNext error message
    let errorMsg = 'Gagal membuat pengguna';
    if (error && typeof error === 'object' && 'message' in error) {
      errorMsg = String(error.message);
    }
    
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/setup/users
 * Update an existing user in ERPNext.
 */
export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check authentication
    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();
    const { name, email, full_name, new_password, roles, enabled } = body;

    // Validate that name field exists (required to identify user)
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Field name (identifier pengguna) harus diisi' },
        { status: 400 }
      );
    }

    // Validate that at least one field is being updated
    if (!email && !full_name && !new_password && !roles && enabled === undefined) {
      return NextResponse.json(
        { success: false, message: 'Setidaknya satu field harus diperbarui' },
        { status: 400 }
      );
    }

    // Build update payload for ERPNext
    const updatePayload: any = {};

    // Include only fields provided in the request
    if (email) {
      updatePayload.email = email;
    }

    if (full_name) {
      // Split full_name into first_name and last_name for ERPNext compatibility
      updatePayload.first_name = full_name.split(' ')[0];
      updatePayload.last_name = full_name.split(' ').slice(1).join(' ') || '';
      updatePayload.full_name = full_name;
    }

    // Handle password conditionally (only include if provided)
    if (new_password) {
      updatePayload.new_password = new_password;
    }

    // Transform roles array to ERPNext format
    if (roles && roles.length > 0) {
      updatePayload.roles = roles.map((role: string) => ({ role }));
    }

    if (enabled !== undefined) {
      updatePayload.enabled = enabled;
    }

    const result = await client.update('User', name, updatePayload);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Pengguna ${name} berhasil diperbarui`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/setup/users', siteId);
    
    // Try to extract ERPNext error message
    let errorMsg = 'Gagal memperbarui pengguna';
    if (error && typeof error === 'object' && 'message' in error) {
      errorMsg = String(error.message);
    }
    
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
