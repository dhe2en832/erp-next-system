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
  return handleCustomer(request, name, 'GET');
}

export async function PUT(request: NextRequest, { params }: ParamsInput) {
  const name = await resolveName(params);
  return handleCustomer(request, name, 'PUT');
}

async function handleCustomer(request: NextRequest, name: string, method: 'GET' | 'PUT') {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const sid = request.cookies.get('sid')?.value;

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      return NextResponse.json({ success: false, message: 'Unauthorized - No session or API key found' }, { status: 401 });
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Customer/${name}`;

    if (method === 'GET') {
      // direct fetch by name
      try {
        const resp = await fetch(erpNextUrl, { method: 'GET', headers });
        const data = await resp.json();
        if (resp.ok && data.data) {
          return NextResponse.json({ success: true, data: data.data, message: 'Customer detail fetched successfully' });
        }
        if (resp.status !== 404) {
          return NextResponse.json({ success: false, message: data.message || data.exc || 'Failed to fetch customer detail' }, { status: resp.status });
        }
      } catch (err) {
        console.error('Customer GET direct error:', err);
      }

      // fallback: search by customer_name
      try {
        const searchUrl = `${ERPNEXT_API_URL}/api/resource/Customer?fields=["name","customer_name"]&filters=${encodeURIComponent(JSON.stringify([["customer_name","=",name]]))}&limit_page_length=1`;
        const searchResp = await fetch(searchUrl, { method: 'GET', headers });
        const searchData = await searchResp.json();
        if (searchResp.ok && Array.isArray(searchData.data) && searchData.data.length > 0) {
          const actualName = searchData.data[0].name;
          const detailUrl = `${ERPNEXT_API_URL}/api/resource/Customer/${actualName}`;
          const finalResp = await fetch(detailUrl, { method: 'GET', headers });
          const finalData = await finalResp.json();
          if (finalResp.ok && finalData.data) {
            return NextResponse.json({ success: true, data: finalData.data, message: 'Customer detail fetched successfully' });
          }
          return NextResponse.json({ success: false, message: finalData.message || finalData.exc || 'Failed to fetch customer detail' }, { status: finalResp.status });
        }
      } catch (err) {
        console.error('Customer GET fallback error:', err);
      }

      return NextResponse.json({ success: false, message: 'Failed to fetch customer detail' }, { status: 404 });
    }

    if (method === 'PUT') {
      try {
        const body = await request.json();
        delete body.name;
        delete body.naming_series;
        if (body.sales_person) {
          body.sales_team = [
            {
              sales_person: body.sales_person,
              allocated_percentage: 100,
            },
          ];
          delete body.sales_person;
        }

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
          { success: false, message: data.message || data.exc || 'Failed to update customer' },
          { status: resp.status }
        );
      } catch (error) {
        console.error('Customer PUT Error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
