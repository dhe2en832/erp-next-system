import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

type ParamsInput = { params: { name: string } | Promise<{ name: string }> };

async function resolveName(params: ParamsInput['params']): Promise<string> {
  if (params && typeof (params as any).then === 'function') {
    const resolved = await (params as Promise<{ name: string }>);
    return resolved.name;
  }
  return (params as { name: string }).name;
}

export async function GET(request: NextRequest, { params }: ParamsInput) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const name = await resolveName(params);
    
    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);

    // Try direct fetch by name
    try {
      const data = await client.get('Address', name) as any;
      return NextResponse.json({ success: true, data });
    } catch (err) {
      console.error('Address GET direct error:', err);
    }

    // Fallback: search by address_title
    try {
      const searchResults = await client.getList('Address', {
        fields: ['name', 'address_title', 'address_line1', 'city'],
        filters: [["address_title", "=", name]],
        limit_page_length: 1
      });
      
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        const actualName = (searchResults[0] as any).name;
        const data = await client.get('Address', actualName) as any;
        return NextResponse.json({ success: true, data });
      }
    } catch (err) {
      console.error('Address detail fallback error:', err);
    }

    return NextResponse.json(
      { success: false, message: 'Failed to fetch address detail' },
      { status: 404 }
    );
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/addresses/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
