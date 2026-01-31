import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Fiscal Years API - Company:', company);

    // Build filters array
    const filters = [
      ['company', '=', company]
    ];

    console.log('Fiscal Years API - Final Filters:', filters);

    // Get fiscal years from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/Fiscal Year?fields=["name","year_start_date","year_end_date","company"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=year_start_date desc&limit_page_length=10`;

    console.log('Fiscal Years API - URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
    });

    console.log('Fiscal Years API - Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Fiscal Years API - Response Data:', data);

      if (data.success && data.data) {
        // Format fiscal years for dropdown
        const formattedFiscalYears = data.data.map((fiscalYear: any) => {
          const startDate = new Date(fiscalYear.year_start_date);
          const endDate = new Date(fiscalYear.year_end_date);
          const yearName = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
          
          return {
            name: fiscalYear.name,
            year_start_date: fiscalYear.year_start_date,
            year_end_date: fiscalYear.year_end_date,
            company: fiscalYear.company,
            display_name: yearName,
            year: startDate.getFullYear()
          };
        });

        return NextResponse.json({
          success: true,
          data: formattedFiscalYears,
          message: `Found ${formattedFiscalYears.length} fiscal years`
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No fiscal years found',
          data: []
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Fiscal Years API - Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch fiscal years from ERPNext',
        error: errorText
      });
    }

  } catch (error: any) {
    console.error('Fiscal Years API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
