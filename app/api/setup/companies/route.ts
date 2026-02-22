import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';

// GET /api/setup/companies
export async function GET(request: NextRequest) {
  try {
    const companies = await erpnextClient.getList('Company', {
      fields: ['name', 'company_name', 'abbr', 'country', 'default_currency'],
      order_by: 'company_name asc',
    });

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch companies',
      },
      { status: 500 }
    );
  }
}
