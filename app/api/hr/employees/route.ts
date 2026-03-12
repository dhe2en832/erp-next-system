import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'Active';
    const nameFilter = searchParams.get('name');
    const limitPageLength = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';

    // Build filters array
    const filters: (string | number | boolean | null | string[])[][] = [];
    
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

    const fields = [
      "name", "employee_name", "first_name", "company", "department", 
      "designation", "gender", "status", "cell_number", "personal_email", 
      "date_of_birth", "date_of_joining"
    ];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    interface EmployeeSummary {
      name: string;
      employee_name?: string;
      first_name?: string;
      company?: string;
      department?: string;
      designation?: string;
      gender?: string;
      status?: string;
      cell_number?: string;
      personal_email?: string;
      date_of_birth?: string;
      date_of_joining?: string;
      [key: string]: unknown;
    }
    // Use client method instead of direct fetch
    const data = await client.getList<EmployeeSummary>('Employee', {
      fields: fields,
      filters: filters,
      limit_page_length: parseInt(limitPageLength),
      start: parseInt(limitStart)
    });

    // Transform employee data
    const employeesList = (data || []).map((emp: EmployeeSummary) => ({
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

    const totalRecords = await client.getCount('Employee', { filters });

    return NextResponse.json({
      success: true,
      data: employeesList,
      total: totalRecords,
    });
  } catch (error) {
    logSiteError(error, 'GET /api/hr/employees', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    const { name, ...updateData } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Employee name is required' }, { status: 400 });
    }

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'No authentication available' }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method instead of direct fetch
    const updatedEmployee = await client.update('Employee', name, updateData);

    return NextResponse.json({ success: true, data: updatedEmployee });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/hr/employees', siteId);
    
    // Extract detailed error message
    let errorMessage = 'Failed to update employee';
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      if (errorObj._server_messages) {
        try {
          const parsed = JSON.parse(JSON.parse(errorObj._server_messages as string)[0]);
          errorMessage = parsed.message || errorMessage;
        } catch {
          // Ignore parse errors
        }
      } else if (errorObj.message) {
        errorMessage = errorObj.message as string;
      } else if (errorObj.exc) {
        errorMessage = errorObj.exc as string;
      }
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const body = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Simply insert the employee - let ERPNext handle naming series
    // If naming series counter is out of sync, this will fail with duplicate entry error
    // User must fix the naming series counter on the server using fix_employee_naming_series.py
    const newEmployee = await client.insert<Record<string, unknown>>('Employee', body);

    return NextResponse.json({ success: true, data: newEmployee });
  } catch (error) {
    logSiteError(error, 'POST /api/hr/employees', siteId);

    // Extract detailed error message
    let errorMessage = 'Failed to create employee';
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;

      if (errorObj.message) {
        errorMessage = errorObj.message as string;
      } else if (errorObj.exc) {
        errorMessage = errorObj.exc as string;
      }
      
      // Check if it's a duplicate entry error (naming series issue)
      if (errorMessage.includes('Duplicate entry') && errorMessage.includes('HR-EMP-')) {
        errorMessage = 'Naming series counter tidak sinkron. Silakan hubungi administrator untuk menjalankan fix_employee_naming_series.py di server.';
      }
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
