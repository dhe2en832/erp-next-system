import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pi = searchParams.get('pi');

    if (!pi) {
      return NextResponse.json(
        { 
          message: {
            success: false,
            message: 'Purchase Invoice ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Get session cookie from request
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json(
        { 
          message: {
            success: false,
            message: 'No session found. Please login first.'
          }
        },
        { status: 401 }
      );
    }

    // Call ERPNext API to fetch Purchase Invoice detail
    const erpnextUrl = `${ERPNEXT_API_URL}/api/method/fetch_pi_detail?pi=${encodeURIComponent(pi)}`;
    
    console.log('Fetching PI detail from ERPNext:', erpnextUrl);
    
    const response = await fetch(erpnextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      credentials: 'include',
    });

    const responseText = await response.text();
    console.log('ERPNext Response Status:', response.status);
    console.log('ERPNext Response Text:', responseText);

    if (!response.ok) {
      // Handle ERPNext errors
      let errorMessage = `ERPNext API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // If response is not JSON, use the text as error message
        errorMessage = responseText || errorMessage;
      }

      // Check for permission error
      if (response.status === 403 || errorMessage.includes('Permission') || errorMessage.includes('izin')) {
        return NextResponse.json(
          { 
            message: {
              success: false,
              message: 'Permission Error: Anda tidak memiliki izin untuk mengakses Purchase Invoice ini. Silakan hubungi administrator.'
            }
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { 
          message: {
            success: false,
            message: errorMessage
          }
        },
        { status: response.status }
      );
    }

    // Parse successful response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse ERPNext response:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { 
          message: {
            success: false,
            message: 'Invalid response from ERPNext API'
          }
        },
        { status: 500 }
      );
    }

    // Return the data as-is (already in correct format)
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in fetch_pi_detail API:', error);
    return NextResponse.json(
      { 
        message: {
          success: false,
          message: 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}
