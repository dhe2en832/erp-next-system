import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Cost Centers API - Company:', company);
    console.log('Cost Centers API - Search:', search);

    // Build filters array
    const filters = [
      ['company', '=', company],
      ['is_group', '=', 0] // Only leaf cost centers (not groups)
    ];

    // Add search filter if provided
    if (search) {
      filters.push(['cost_center_name', 'like', `%${search}%`]);
    }

    console.log('Cost Centers API - Final Filters:', filters);

    // Get cost centers from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/Cost Center?fields=["name","cost_center_name","company","is_group"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=cost_center_name asc&limit_page_length=100`;

    console.log('Cost Centers API - URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
    });

    console.log('Cost Centers API - Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Cost Centers API - Response Data:', data);

      if (data.success && data.data) {
        // Format cost centers for dropdown
        const formattedCostCenters = data.data.map((costCenter: any) => ({
          name: costCenter.name,
          cost_center_name: costCenter.cost_center_name,
          company: costCenter.company,
          display_name: `${costCenter.name} - ${costCenter.cost_center_name}`
        }));

        return NextResponse.json({
          success: true,
          data: formattedCostCenters,
          message: `Found ${formattedCostCenters.length} cost centers`
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No cost centers found',
          data: []
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Cost Centers API - Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch cost centers from ERPNext',
        error: errorText
      });
    }

  } catch (error: any) {
    console.error('Cost Centers API error:', error);
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
