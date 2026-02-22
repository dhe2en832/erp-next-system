import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

// GET /api/setup/fiscal-years
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    const filters: any[][] = [];
    
    if (company) {
      filters.push(['company', '=', company]);
    }

    const fiscalYears = await erpnextClient.getList('Fiscal Year', {
      filters: filters.length > 0 ? filters : undefined,
      fields: ['name', 'year', 'year_start_date', 'year_end_date', 'disabled'],
      order_by: 'year_start_date desc',
    });

    // Filter out disabled fiscal years
    const activeFiscalYears = fiscalYears.filter((fy: any) => !fy.disabled);

    return NextResponse.json({
      success: true,
      data: activeFiscalYears,
    });
  } catch (error: any) {
    console.error('Error fetching fiscal years:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch fiscal years',
      },
      { status: 500 }
    );
  }
}
