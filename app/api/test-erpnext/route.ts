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

    // Test 1: Simple request tanpa filters
    console.log('Testing simple request...');
    const simpleResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","posting_date","status","grand_total"]&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const simpleData = await simpleResponse.json();
    console.log('Simple response status:', simpleResponse.status);
    console.log('Simple response data:', simpleData);

    // Test 2: Request dengan filters yang sederhana
    console.log('Testing with simple filters...');
    const filterResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?filters=[["status","=","Draft"]]&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const filterData = await filterResponse.json();
    console.log('Filter response status:', filterResponse.status);
    console.log('Filter response data:', filterData);

    // Test 3: Request dengan company filter yang di-encode manual
    console.log('Testing with company filter...');
    const companyFilter = '[["company","=","Batasku (Demo)"]]';
    const companyResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?filters=${encodeURIComponent(companyFilter)}&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const companyData = await companyResponse.json();
    console.log('Company response status:', companyResponse.status);
    console.log('Company response data:', companyData);

    return NextResponse.json({
      success: true,
      tests: {
        simple: { status: simpleResponse.status, data: simpleData },
        filter: { status: filterResponse.status, data: filterData },
        company: { status: companyResponse.status, data: companyData }
      }
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}
