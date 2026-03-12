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
    const limitPageLength = parseInt(searchParams.get('limit_page_length') || '20');
    const limitStart = parseInt(searchParams.get('limit_start') || '0');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const filters: (string | number | boolean | null | string[])[][] = [];
    if (search) {
      filters.push(['sales_person_name', 'like', `%${search}%`]);
    }

    interface SalesPersonSummary {
      name: string;
      sales_person_name?: string;
      employee?: string;
      email?: string;
      [key: string]: unknown;
    }
    const salesPersons = await client.getList<SalesPersonSummary>('Sales Person', {
      fields: ['name', 'sales_person_name', 'employee'],
      filters: filters.length > 0 ? filters : undefined,
      limit_page_length: limitPageLength,
      start: limitStart,
      order_by: 'creation desc, sales_person_name asc'
    });

    // Transform sales person master data
    const salesPersonsList = salesPersons.map((person: SalesPersonSummary) => ({
      name: person.name,
      full_name: person.sales_person_name || person.name,
      employee: person.employee || '',
      email: person.email || '',
      category: getCategoryFromName(person.sales_person_name || person.name),
      allocated_percentage: 0,
      allocated_amount: 0,
    }));

    const totalRecords = await client.getCount('Sales Person', { filters: filters.length > 0 ? filters : undefined });

    return NextResponse.json({
      success: true,
      data: salesPersonsList,
      total: totalRecords,
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/sales-persons', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const body = await request.json();

    const salesPersonData = {
      sales_person_name: body.sales_person_name,
      employee: body.employee || '',
      parent_sales_person: body.parent_sales_person || 'Sales Team',
      is_group: body.is_group || 0,
      commission_rate: body.commission_rate || 0,
      enabled: body.enabled !== undefined ? body.enabled : 1,
    };

    const data = await client.insert<Record<string, unknown>>('Sales Person', salesPersonData);

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/sales-persons', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// Helper function to categorize sales persons based on their names
function getCategoryFromName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('kantor')) {
    return 'Kantor';
  } else if (lowerName.includes('tim penjualan') || lowerName.includes('tim')) {
    return 'Tim Penjualan';
  }
  return 'Lainnya';
}
