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
    const company = searchParams.get('company');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters
    const filters: any[] = [["company", "=", company]];
    
    // Add search filter if provided
    const search = searchParams.get('search');
    if (search) {
      filters.push(["warehouse_name", "like", `%${search}%`]);
    }

    // console.log('Warehouses filters:', filters);

    const warehouses = await client.getList('Warehouse', {
      fields: ['name', 'warehouse_name', 'company', 'is_group', 'parent_warehouse'],
      filters,
      order_by: 'warehouse_name',
      limit_page_length: 500
    });

    // console.log('Warehouses response:', warehouses);

    return NextResponse.json({
      success: true,
      data: warehouses || [],
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/warehouses', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    const { warehouse_name, is_group, parent_warehouse, company } = body;

    if (!warehouse_name || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse name and company are required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const warehouseData: any = {
      doctype: 'Warehouse',
      warehouse_name,
      company
    };
    
    if (is_group) {
      warehouseData.is_group = 1;
    }
    
    if (parent_warehouse) {
      warehouseData.parent_warehouse = parent_warehouse;
    }

    // console.log('Creating warehouse:', warehouseData);

    const result = await client.insert('Warehouse', warehouseData);
    
    // console.log('Create Warehouse Response:', {
    //   warehouseData,
    //   erpNextResponse: result
    // });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Warehouse created successfully'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/inventory/warehouses', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    const { name, warehouse_name, is_group, parent_warehouse, company } = body;

    if (!name || !warehouse_name || !company) {
      return NextResponse.json(
        { success: false, message: 'Warehouse name, ID, and company are required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const warehouseData: any = {
      warehouse_name,
      company
    };
    
    if (is_group) {
      warehouseData.is_group = 1;
    }
    
    if (parent_warehouse) {
      warehouseData.parent_warehouse = parent_warehouse;
    }

    // console.log('Updating warehouse:', { name, warehouseData });

    const result = await client.update('Warehouse', name, warehouseData);
    
    // console.log('Update Warehouse Response:', {
    //   name,
    //   warehouseData,
    //   erpNextResponse: result
    // });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Warehouse updated successfully'
    });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/inventory/warehouses', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
