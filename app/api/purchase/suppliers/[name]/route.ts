import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

type ParamsInput = { params: { name: string } | Promise<{ name: string }> };

async function resolveName(params: ParamsInput['params']): Promise<string> {
  if (params && typeof (params as unknown as Promise<{ name: string }>).then === 'function') {
    const resolved = await (params as Promise<{ name: string }>);
    return resolved.name;
  }
  return (params as { name: string }).name;
}

export async function GET(request: NextRequest, { params }: ParamsInput) {
  const name = await resolveName(params);
  return handleSupplier(request, name, 'GET');
}

export async function PUT(request: NextRequest, { params }: ParamsInput) {
  const name = await resolveName(params);
  return handleSupplier(request, name, 'PUT');
}

async function handleSupplier(request: NextRequest, name: string, method: 'GET' | 'PUT') {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);

    if (method === 'GET') {
      // Try direct fetch by name
      try {
        const data = await client.get<Record<string, unknown>>('Supplier', name);
        return NextResponse.json({ 
          success: true, 
          data, 
          message: 'Supplier detail fetched successfully' 
        });
      } catch (err) {
        console.error('Supplier GET direct error:', err);
      }

      // Fallback: search by supplier_name
      try {
        const searchResults = await client.getList<Record<string, unknown>>('Supplier', {
          fields: ['name', 'supplier_name'],
          filters: [["supplier_name", "=", name]],
          limit_page_length: 1
        });
        
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          const actualName = (searchResults as Record<string, unknown>[])[0].name as string;
          const data = await client.get<Record<string, unknown>>('Supplier', actualName);
          return NextResponse.json({ 
            success: true, 
            data, 
            message: 'Supplier detail fetched successfully' 
          });
        }
      } catch (err) {
        console.error('Supplier GET fallback error:', err);
      }

      return NextResponse.json(
        { success: false, message: 'Failed to fetch supplier detail' }, 
        { status: 404 }
      );
    }

    if (method === 'PUT') {
      const body = await request.json();
      // Remove immutable fields
      delete body.name;
      delete body.naming_series;

      const data = await client.update('Supplier', name, body);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, message: 'Method not allowed' }, 
      { status: 405 }
    );
  } catch (error: unknown) {
    logSiteError(error, `${method} /api/purchase/suppliers/${name}`, siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
