import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

// Type definitions
interface Warehouse {
  name: string;
  warehouse_name: string;
  company: string;
  parent_warehouse: string | null;
}

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch warehouses using client method with company filter
    const warehouses = await client.getList<Warehouse>('Warehouse', {
      fields: ['name', 'warehouse_name', 'company', 'parent_warehouse'],
      filters: [['company', '=', company]]
    });

    // Filter out group warehouses (parent_warehouse is null for root groups)
    // Only show actual warehouses, not group warehouses
    const actualWarehouses = warehouses.filter((warehouse: Warehouse) => 
      warehouse.parent_warehouse !== null && 
      warehouse.name !== warehouse.parent_warehouse
    );

    return NextResponse.json({
      data: actualWarehouses,
      message: 'Warehouses fetched successfully from ERPNext'
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/utils/erpnext/erpnext/warehouse', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(
      { 
        error: errorResponse.message,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
