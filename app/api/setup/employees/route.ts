import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * GET /api/setup/employees
 * Fetch employees list. Optionally filter by sales_person name to find mapped employee.
 * Query params: ?sales_person=X or ?search=X
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

    const { searchParams } = new URL(request.url);
    const salesPerson = searchParams.get('sales_person');
    const search = searchParams.get('search');

    const fields = ['name', 'employee_name', 'designation', 'department', 'status'];
    const filters: any[][] = [['status', '=', 'Active']];

    if (salesPerson) {
      // Try to find employee by matching employee_name with sales_person name
      filters.push(['employee_name', 'like', `%${salesPerson}%`]);
    }
    if (search) {
      filters.push(['employee_name', 'like', `%${search}%`]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch employees using client method
    const employees = await client.getList('Employee', {
      fields,
      filters,
      limit_page_length: 50,
      order_by: 'employee_name'
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/employees', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
