import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { usr, pwd } = await request.json();

    let loginId = usr;

    // Check if usr is a username (not email and not Administrator)
    if (usr !== 'Administrator' && !usr.includes('@')) {
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;

      if (apiKey && apiSecret) {
        // Look up email by username
        const userRes = await fetch(
          `${ERPNEXT_API_URL}/api/resource/User?fields=["name","email","username"]&filters=[["username","=","${usr}"]]`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `token ${apiKey}:${apiSecret}`,
            },
          }
        );

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.data && userData.data.length > 0) {
            loginId = userData.data[0].email || userData.data[0].name;
          }
        }
      }
    }

    // Step 1: Login to ERPNext
    const loginResponse = await fetch(`${ERPNEXT_API_URL}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr: loginId,
        pwd,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return NextResponse.json(
        { success: false, message: loginData.message || 'Login failed' },
        { status: 401 }
      );
    }

    // Step 2: Get user's allowed companies
    const sessionCookie = loginResponse.headers.get('set-cookie') || '';
    const companiesResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Company?fields=["name","company_name","country","abbr"]&limit_page_length=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      }
    );

    let companies = [];
    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json();
      companies = companiesData.data || [];
    } else {
      // Fallback to mock data if ERPNext companies not accessible
      companies = [
        {
          name: "Default Company",
          company_name: "Default Company",
          country: "Indonesia",
          abbr: "DC"
        },
        {
          name: "PT. Example",
          company_name: "PT. Example Indonesia",
          country: "Indonesia", 
          abbr: "PE"
        }
      ];
    }

    // Step 3: Fetch roles
    let roles: string[] = [];
    const sidMatch = sessionCookie.match(/sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;

    if (sid) {
      try {
        const whoamiRes = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.auth.get_logged_user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sid=${sid}`,
          },
        });
        
        if (whoamiRes.ok) {
          const whoamiData = await whoamiRes.json();
          const userId = whoamiData.message;
          
          const roleRes = await fetch(
            `${ERPNEXT_API_URL}/api/resource/User/${encodeURIComponent(userId)}?fields=["roles"]`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': `sid=${sid}`,
              },
            }
          );
          
          if (roleRes.ok) {
            const roleData = await roleRes.json();
            roles = (roleData.data?.roles || []).map((r: any) => r.role);
          }
        }
      } catch (err) {
        console.error('Failed to fetch roles during login', err);
      }
    }

    // Step 4: Return login success with companies and roles
    const responseNext = NextResponse.json({
      success: true,
      message: loginData.message,
      full_name: loginData.full_name,
      home_page: loginData.home_page,
      companies: companies,
      needs_company_selection: companies.length >= 1,
      roles: roles,
    });

    // Forward the session cookie from ERPNext
    if (loginResponse.headers.get('set-cookie')) {
      responseNext.headers.set('set-cookie', loginResponse.headers.get('set-cookie') || '');
    }

    return responseNext;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
