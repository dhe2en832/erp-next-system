import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
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

    const client = await getERPNextClientForRequest(request);

    interface PIDetail {
      [key: string]: unknown;
    }

    // Call ERPNext custom method to fetch Purchase Invoice detail
    const data = await client.call<PIDetail>('fetch_pi_detail', { pi });

    // Return the data as-is (already in correct format)
    return NextResponse.json(data);
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/invoices/detail', siteId);
    
    // Check for permission error
    const errorStr = String(error);
    if (errorStr.includes('403') || errorStr.includes('Permission') || errorStr.includes('izin')) {
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

    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(
      { 
        message: {
          success: false,
          message: errorResponse.message
        }
      },
      { status: 500 }
    );
  }
}
