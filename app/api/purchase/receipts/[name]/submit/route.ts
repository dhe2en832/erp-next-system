import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    console.log('Submitting Purchase Receipt:', name);

    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`,
    };

    console.log('Using REST API PUT method to submit Purchase Receipt:', name);

    // Use REST API update method - most reliable approach
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const responseText = await response.text();
    console.log('Submit Purchase Receipt ERPNext Response Status:', response.status);
    console.log('Submit Purchase Receipt ERPNext Response Text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    if (response.ok) {
      // ERPNext REST API returns different structure
      const receiptData = data.docs?.[0] || data.doc || data.data || data;
      
      console.log('Purchase Receipt submitted successfully:', receiptData);
      
      return NextResponse.json({
        success: true,
        data: receiptData,
        message: 'Purchase Receipt berhasil di submit'
      });
    } else {
      let errorMessage = 'Failed to submit Purchase Receipt';
      
      console.log('Full Error Response:', data);
      
      // Comprehensive error parsing
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed Exception Data:', excData);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          console.log('Failed to parse exception, using raw data');
          errorMessage = data.message || data.exc || 'Failed to submit Purchase Receipt';
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          console.log('Parsed Server Messages:', serverMessages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          console.log('Failed to parse server messages, using raw data');
          errorMessage = data._server_messages;
        }
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = `Unknown error occurred. Response: ${JSON.stringify(data)}`;
      }
      
      console.error('Submit Purchase Receipt Error Details:', {
        status: response.status,
        data: data,
        errorMessage: errorMessage
      });
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Receipt submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
