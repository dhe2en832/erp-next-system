import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // For demo purposes, return mock data if ERPNext is not accessible
    const mockCompanies = [
      {
        name: "Default Company",
        company_name: "Default Company",
        country: "Indonesia",
        abbr: "DC"
      },
      {
        name: "PT. Example",
        company_name: "PT. Example Indonesia",
        country: "Indonesia", 
        abbr: "PE"
      }
    ];

    // Try to fetch from ERPNext first
    try {
      const response = await fetch(
        `${ERPNEXT_API_URL}/api/resource/Company?fields=["name","company_name","country","abbr"]&limit_page_length=100`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          data: data.data || mockCompanies,
        });
      }
    } catch (erpError) {
      console.log('ERPNext not available, using mock data');
    }

    // Fallback to mock data
    return NextResponse.json({
      success: true,
      data: mockCompanies,
    });

  } catch (error) {
    console.error('Companies API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
