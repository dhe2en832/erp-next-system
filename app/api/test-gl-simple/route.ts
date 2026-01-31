import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    console.log('Test GL Simple - Company:', company);

    if (!process.env.ERP_API_KEY || !process.env.ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');

    // Test different doctypes for GL entries
    const doctypes = [
      'GL Entry',
      'General Ledger',
      'Journal Entry',
      'Accounting Ledger'
    ];

    const results = [];

    for (const doctype of doctypes) {
      console.log(`Testing doctype: ${doctype}`);
      
      try {
        const response = await fetch(`${ERPNEXT_API_URL}/api/resource/${encodeURIComponent(doctype)}?limit_page_length=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });

        console.log(`${doctype} Response Status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`${doctype} Data:`, data);
          
          results.push({
            doctype,
            status: response.status,
            success: data.success,
            count: data.data ? data.data.length : 0,
            data: data.data || []
          });
        } else {
          const errorText = await response.text();
          console.log(`${doctype} Error:`, errorText);
          
          results.push({
            doctype,
            status: response.status,
            success: false,
            error: errorText
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`${doctype} Exception:`, errorMessage);
        
        results.push({
          doctype,
          status: 'error',
          success: false,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test GL doctypes complete',
      results
    });

  } catch (error: unknown) {
    console.error('Test GL Simple error:', error);
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
