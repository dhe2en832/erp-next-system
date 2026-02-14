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
 * GET /api/setup/employees
 * Fetch employees list. Optionally filter by sales_person name to find mapped employee.
 * Query params: ?sales_person=X or ?search=X
 */
export async function GET(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const salesPerson = searchParams.get('sales_person');
    const search = searchParams.get('search');

    const fields = ['name', 'employee_name', 'designation', 'department', 'status'];
    const filters: string[][] = [['status', '=', 'Active']];

    if (salesPerson) {
      // Try to find employee by matching employee_name with sales_person name
      filters.push(['employee_name', 'like', `%${salesPerson}%`]);
    }
    if (search) {
      filters.push(['employee_name', 'like', `%${search}%`]);
    }

    const erpUrl = `${ERPNEXT_API_URL}/api/resource/Employee?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=50&order_by=employee_name`;

    const response = await fetch(erpUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data || [] });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch employees' },
        { status: response.status }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
