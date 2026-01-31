import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug GL Company - Checking companies in GL Entry');

    if (!process.env.ERP_API_KEY || !process.env.ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');

    // Get GL entries with company field
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["name","company"]&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('GL Company Debug Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('GL Company Debug Data:', data);

      if (data.data && Array.isArray(data.data)) {
        // Extract unique companies
        const companies = [...new Set(data.data.map((entry: any) => entry.company).filter(Boolean))];
        
        return NextResponse.json({
          success: true,
          message: 'Companies found in GL Entry',
          total_entries: data.data.length,
          companies: companies,
          sample_entries: data.data.slice(0, 5)
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No data returned',
          response: data
        });
      }
    } else {
      const errorText = await response.text();
      console.log('GL Company Debug Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch GL entries',
        error: errorText
      });
    }

  } catch (error: unknown) {
    console.error('Debug GL Company error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
