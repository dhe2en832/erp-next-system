import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Get site-aware client (handles authentication automatically)
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { supplier_name, customer_name, address, country, city } = body;

    const baseName = supplier_name || customer_name;
    const linkDoctype = supplier_name ? 'Supplier' : 'Customer';

    if (!baseName || !address || !city) {
      return NextResponse.json(
        { success: false, message: 'supplier_name atau customer_name, address, dan city wajib diisi' }, 
        { status: 400 }
      );
    }

    const payload = {
      address_title: baseName,
      address_type: 'Office',
      address_line1: address,
      country: country || 'Indonesia',
      city,
      links: [
        {
          link_doctype: linkDoctype,
          link_name: baseName,
          link_title: baseName,
        },
      ],
    };

    interface Address {
      name: string;
    }

    const data = await client.insert<Address>('Address', payload);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/addresses', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
