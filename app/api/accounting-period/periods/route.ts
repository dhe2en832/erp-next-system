import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { getPeriodsRequestSchema, createPeriodRequestSchema } from '@/lib/accounting-period-schemas';
import type { AccountingPeriod, GetPeriodsResponse, CreatePeriodResponse } from '@/types/accounting-period';

// GET /api/accounting-period/periods
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const queryParams = {
      company: searchParams.get('company') || undefined,
      status: searchParams.get('status') || undefined,
      fiscal_year: searchParams.get('fiscal_year') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      start: searchParams.get('start') ? parseInt(searchParams.get('start')!) : undefined,
    };

    // Validate query parameters
    const validatedParams = getPeriodsRequestSchema.parse(queryParams);

    // Build filters for ERPNext API
    const filters: any[][] = [];
    
    if (validatedParams.company) {
      filters.push(['company', '=', validatedParams.company]);
    }
    
    if (validatedParams.status) {
      filters.push(['status', '=', validatedParams.status]);
    }
    
    if (validatedParams.fiscal_year) {
      filters.push(['fiscal_year', '=', validatedParams.fiscal_year]);
    }

    // Fetch periods from ERPNext
    const periods = await client.getList<AccountingPeriod>('Accounting Period', {
      filters: filters.length > 0 ? filters : undefined,
      fields: [
        'name',
        'period_name',
        'company',
        'start_date',
        'end_date',
        'period_type',
        'status',
        'closed_by',
        'closed_on',
        'closing_journal_entry',
        'permanently_closed_by',
        'permanently_closed_on',
        'fiscal_year',
        'remarks',
        'creation',
        'modified',
        'modified_by',
        'owner',
      ],
      limit: validatedParams.limit || 20,
      start: validatedParams.start || 0,
      order_by: 'start_date desc',
    });

    // Get total count (without pagination)
    const allPeriods = await client.getList<AccountingPeriod>('Accounting Period', {
      filters: filters.length > 0 ? filters : undefined,
      fields: ['name'],
    });

    const response: GetPeriodsResponse = {
      success: true,
      data: periods,
      total_count: allPeriods.length,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/accounting-period/periods', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST /api/accounting-period/periods
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    
    // Validate request body
    const validatedData = createPeriodRequestSchema.parse(body);

    // Check for overlapping periods
    const overlappingFilters = [
      ['company', '=', validatedData.company],
      ['start_date', '<=', validatedData.end_date],
      ['end_date', '>=', validatedData.start_date],
    ];

    const overlappingPeriods = await client.getList<AccountingPeriod>('Accounting Period', {
      filters: overlappingFilters,
      fields: ['name', 'period_name', 'start_date', 'end_date'],
      limit: 1,
    });

    if (overlappingPeriods.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Period overlaps with existing period: ${overlappingPeriods[0].period_name}`,
          details: {
            overlapping_period: overlappingPeriods[0],
          },
        },
        { status: 422 }
      );
    }

    // Create period in ERPNext
    const newPeriod = await client.insert<AccountingPeriod>('Accounting Period', {
      period_name: validatedData.period_name,
      company: validatedData.company,
      start_date: validatedData.start_date,
      end_date: validatedData.end_date,
      period_type: validatedData.period_type,
      status: 'Open',
      fiscal_year: validatedData.fiscal_year,
      remarks: validatedData.remarks,
    });

    // Create audit log entry with ERPNext datetime format
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' '); // Format: YYYY-MM-DD HH:MM:SS
    
    await client.insert('Period Closing Log', {
      accounting_period: newPeriod.name,
      action_type: 'Created',
      action_by: 'Administrator', // TODO: Get from session
      action_date: erpnextDatetime,
      after_snapshot: JSON.stringify(newPeriod),
    });

    const response: CreatePeriodResponse = {
      success: true,
      data: newPeriod,
      message: `Period ${validatedData.period_name} created successfully`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/accounting-period/periods', siteId);
    
    // Handle validation errors
    const errorObj = error as any;
    if (errorObj.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errorObj.errors,
        },
        { status: 400 }
      );
    }

    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
