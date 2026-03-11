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
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    const filters: any[][] = [["company", "=", company]];
    
    const deliveryNotes = await client.getList('Delivery Note', {
      fields: ['name', 'customer', 'status', 'grand_total'],
      filters,
      limit_page_length: 20
    });
    
    const soReferences = new Set();
    const dnWithSORef = [];
    
    for (const dn of deliveryNotes) {
      try {
        const dnDetail = await client.get('Delivery Note', dn.name) as any;
        const dnSORefs = new Set();
        
        if (dnDetail.items && Array.isArray(dnDetail.items)) {
          dnDetail.items.forEach((item: any) => {
            if (item.against_sales_order) {
              dnSORefs.add(item.against_sales_order);
              soReferences.add(item.against_sales_order);
            }
          });
        }
        
        if (dnSORefs.size > 0) {
          dnWithSORef.push({
            dn_name: dn.name,
            customer: dn.customer,
            status: dn.status,
            grand_total: dn.grand_total,
            so_references: Array.from(dnSORefs),
            item_count: dnDetail.items?.length || 0
          });
        }
      } catch (error) {
        console.log(`Error getting DN detail for ${dn.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      company: company,
      summary: {
        total_dn_checked: deliveryNotes.length,
        dn_with_so_ref: dnWithSORef.length,
        so_references_found: Array.from(soReferences)
      },
      dn_with_so_references: dnWithSORef,
      so_references: Array.from(soReferences),
      filtering_ready: soReferences.size > 0,
      message: soReferences.size > 0 ? 
        `Found ${soReferences.size} SO references to filter` :
        'No SO references found'
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/delivery-notes/with-so-ref', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
