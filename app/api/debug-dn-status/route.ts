import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DELIVERY NOTES DEBUG API ===');
    
    const { company, status, exclude_invoiced } = await request.json();

    console.log('Request body:', { company, status, exclude_invoiced });

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    
    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({ 
        success: false, 
        message: 'API credentials not configured',
        debug: {
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
          baseUrl
        }
      }, { status: 500 });
    }

    // Test with different status options
    const statusOptions = [
      ['To Bill'],
      ['Submitted', 'Completed'],
      ['Submitted'],
      ['Completed'],
      ['Draft'],
      [] // No status filter
    ];

    const results = [];

    for (const statusOption of statusOptions) {
      const filters: string[] = [];
      filters.push(`["company", "=", "${company}"]`);
      
      if (statusOption && statusOption.length > 0) {
        filters.push(`["status", "in", ${JSON.stringify(statusOption)}]`);
      }

      console.log(`Testing status: ${JSON.stringify(statusOption)}`);
      console.log('Filters:', filters);

      const dnUrl = `${baseUrl}/api/resource/Delivery Note?fields=["name","customer","posting_date","grand_total","status"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=10`;
      
      console.log('DN URL:', dnUrl);
      
      try {
        const response = await fetch(dnUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
        });

        console.log(`Status ${JSON.stringify(statusOption)} Response:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Status ${JSON.stringify(statusOption)} Error:`, errorText);
          results.push({
            status: statusOption,
            success: false,
            error: errorText,
            httpStatus: response.status
          });
        } else {
          const data = await response.json();
          const deliveryNotes = data.data || [];
          
          console.log(`Status ${JSON.stringify(statusOption)} Count:`, deliveryNotes.length);
          
          results.push({
            status: statusOption,
            success: true,
            count: deliveryNotes.length,
            data: deliveryNotes.slice(0, 2) // First 2 for preview
          });
        }
      } catch (error) {
        console.error(`Status ${JSON.stringify(statusOption)} Exception:`, error);
        results.push({
          status: statusOption,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Debug completed',
      results
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Debug API failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
