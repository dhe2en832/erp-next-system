import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name: entryName } = await params;
    
    console.log('Fetching stock entry details for:', entryName);

    // Try API Key authentication for GET
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for GET requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for stock entry get');
    } else {
      // Fallback to session
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication for stock entry get');
    }

    // Fetch stock entry with items
    const entryUrl = `${ERPNEXT_API_URL}/api/resource/Stock Entry/${encodeURIComponent(entryName)}?fields=["name","posting_date","posting_time","purpose","company","from_warehouse","to_warehouse","total_amount","docstatus"]`;
    console.log('Stock Entry URL:', entryUrl);
    
    const entryResponse = await fetch(entryUrl, {
      method: 'GET',
      headers,
    });

    const entryData = await entryResponse.json();
    
    console.log('Get Stock Entry Response:', {
      status: entryResponse.status,
      entryName,
      erpNextResponse: entryData
    });

    if (!entryResponse.ok) {
      console.error('Entry fetch failed:', entryData);
      return NextResponse.json(
        { success: false, message: entryData.exc || entryData.message || 'Failed to fetch stock entry' },
        { status: entryResponse.status }
      );
    }

    // Return entry data with items (items are already included in entryData.data.items)
    console.log('Returning entry data with embedded items');
    return NextResponse.json({
      success: true,
      data: entryData.data
    });
  } catch (error) {
    console.error('Stock Entry get error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
