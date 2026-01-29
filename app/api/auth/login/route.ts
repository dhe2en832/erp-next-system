import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { usr, pwd } = await request.json();

    // Step 1: Login to ERPNext
    const loginResponse = await fetch(`${ERPNEXT_API_URL}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr,
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
    const companiesResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Company?fields=["name","company_name","country","abbr"]&limit_page_length=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': loginResponse.headers.get('set-cookie') || '',
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

    // Step 3: Return login success with companies
    const responseNext = NextResponse.json({
      success: true,
      message: loginData.message,
      full_name: loginData.full_name,
      home_page: loginData.home_page,
      companies: companies,
      needs_company_selection: companies.length > 1,
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
