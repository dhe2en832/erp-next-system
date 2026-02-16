import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
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

    // Try API Key authentication for POST (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for POST requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for stock entry submit');
    } else {
      // Fallback to session
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication for stock entry submit');
    }

    console.log('Submitting stock entry:', entryName);

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Stock Entry/${encodeURIComponent(entryName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1,
        submitted: 1
      }),
    });

    const data = await response.json();
    
    console.log('Submit Stock Entry Response:', {
      status: response.status,
      entryName,
      erpNextResponse: data
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Stock Entry submitted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to submit stock entry' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Entry submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
