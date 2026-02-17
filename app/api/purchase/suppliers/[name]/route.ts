import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

type ParamsInput = { params: { name: string } | Promise<{ name: string }> };

async function resolveName(params: ParamsInput['params']): Promise<string> {
  if (params && typeof (params as any).then === 'function') {
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

async function fetchFromErpNext(url: string, headers: Record<string, string>, method: string) {
  const response = await fetch(url, {
    method,
    headers,
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  const data = await response.json();
  console.log('Supplier detail response:', data);

  if (response.ok && data.data) {
    return NextResponse.json({
      success: true,
      data: data.data,
      message: 'Supplier detail fetched successfully'
    });
  } else {
    console.log('API Response Error:', data);
    return NextResponse.json(
      { success: false, message: data.message || data.exc || 'Failed to fetch supplier detail' },
      { status: response.status }
    );
  }
}

async function handleSupplier(request: NextRequest, name: string, method: 'GET' | 'PUT') {
  try {
    console.log('Supplier Detail API - ERPNext URL:', ERPNEXT_API_URL);
    console.log('Supplier Detail API - Supplier Name:', name);
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log('Supplier Detail API - API Key Available:', !!apiKey);
    console.log('Supplier Detail API - API Secret Available:', !!apiSecret);
    console.log('Supplier Detail API - Session ID Available:', !!sid);
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for supplier detail');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for supplier detail');
    } else {
      console.log('No authentication found - returning 401');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Build ERPNext URL untuk detail supplier
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Supplier/${name}`;
    console.log('Supplier Detail ERPNext URL:', erpNextUrl);

    if (method === 'GET') {
      // direct fetch by name
      try {
        const resp = await fetch(erpNextUrl, { method: 'GET', headers });
        const data = await resp.json();
        if (resp.ok && data.data) {
          return NextResponse.json({ success: true, data: data.data, message: 'Supplier detail fetched successfully' });
        }
        if (resp.status !== 404) {
          return NextResponse.json({ success: false, message: data.message || data.exc || 'Failed to fetch supplier detail' }, { status: resp.status });
        }
      } catch (err) {
        console.error('Supplier GET direct error:', err);
      }

      // fallback: search by supplier_name
      try {
        const searchUrl = `${ERPNEXT_API_URL}/api/resource/Supplier?fields=["name","supplier_name"]&filters=${encodeURIComponent(JSON.stringify([["supplier_name","=",name]]))}&limit_page_length=1`;
        const searchResp = await fetch(searchUrl, { method: 'GET', headers });
        const searchData = await searchResp.json();
        if (searchResp.ok && Array.isArray(searchData.data) && searchData.data.length > 0) {
          const actualName = searchData.data[0].name;
          const detailUrl = `${ERPNEXT_API_URL}/api/resource/Supplier/${actualName}`;
          const finalResp = await fetch(detailUrl, { method: 'GET', headers });
          const finalData = await finalResp.json();
          if (finalResp.ok && finalData.data) {
            return NextResponse.json({ success: true, data: finalData.data, message: 'Supplier detail fetched successfully' });
          }
          return NextResponse.json({ success: false, message: finalData.message || finalData.exc || 'Failed to fetch supplier detail' }, { status: finalResp.status });
        }
      } catch (err) {
        console.error('Supplier GET fallback error:', err);
      }

      return NextResponse.json({ success: false, message: 'Failed to fetch supplier detail' }, { status: 404 });
    }

    if (method === 'PUT') {
      try {
        const body = await request.json();
        // Remove immutable fields
        delete body.name;
        delete body.naming_series;

        const resp = await fetch(erpNextUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: body }),
        });

        const data = await resp.json();
        if (resp.ok) {
          return NextResponse.json({ success: true, data: data.data });
        }

        return NextResponse.json(
          { success: false, message: data.message || data.exc || 'Failed to update supplier' },
          { status: resp.status }
        );
      } catch (error) {
        console.error('Supplier PUT Error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Supplier Detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
