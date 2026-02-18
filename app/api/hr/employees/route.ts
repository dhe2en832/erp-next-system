import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'Active';
    const nameFilter = searchParams.get('name');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Employee?fields=["name","employee_name","first_name","company","department","designation","gender","status","cell_number","personal_email","date_of_birth","date_of_joining"]&limit_page_length=500`;
    
    // Build filters array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = [];
    
    if (status) {
      filters.push(["status", "=", status]);
    }
    
    if (nameFilter) {
      filters.push(["name", "=", nameFilter]);
    }
    if (search && search.trim()) {
      const searchTrim = search.trim();
      filters.push(["employee_name", "like", `%${searchTrim}%`]);
    }
    
    if (filters.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    console.log('Employees ERPNext URL:', erpNextUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try session-based authentication first
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Employees API Response:', { status: response.status, dataLength: data.data?.length });

    if (response.ok) {
      // Transform employee data
      const employeesList = (data.data || []).map((emp: any) => ({
        name: emp.name,
        employee_name: emp.employee_name || emp.name,
        first_name: emp.first_name || emp.employee_name || emp.name,
        company: emp.company || '',
        department: emp.department || '',
        designation: emp.designation || '',
        gender: emp.gender || '',
        status: emp.status || 'Active',
        cell_number: emp.cell_number || '',
        personal_email: emp.personal_email || '',
        date_of_birth: emp.date_of_birth || '',
        date_of_joining: emp.date_of_joining || '',
      }));

      return NextResponse.json({
        success: true,
        data: employeesList,
        total: employeesList.length,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch employees' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Employees API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...updateData } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Employee name is required' }, { status: 400 });
    }

    const sid = request.cookies.get('sid')?.value;
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'No authentication available' }, { status: 401 });
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Employee/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      const errMsg = data._server_messages
        ? (() => { try { return JSON.parse(JSON.parse(data._server_messages)[0]).message; } catch { return null; } })()
        : null;
      return NextResponse.json(
        { success: false, message: errMsg || data.message || data.exc || 'Failed to update employee' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Employee PUT API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Employee`;

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: body }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data: data.data });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || data.exc || 'Failed to create employee' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Employee POST API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
