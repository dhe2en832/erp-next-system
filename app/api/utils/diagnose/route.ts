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
    console.log('=== DIAGNOSE ERPNEXT SETUP ===');
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    interface DiagnosticResult {
      status: string;
      name?: string;
      module?: string;
      custom?: number;
      engine?: string;
      error?: string;
      email?: string;
      enabled?: number;
      roles?: { role: string }[];
      count?: number;
      sample_items?: { name: string; item_name?: string; item_group?: string }[];
      sample_warehouses?: { name: string; warehouse_name?: string }[];
      response_status?: number;
      response_data?: Record<string, unknown>;
    }
    const diagnostics: Record<string, DiagnosticResult> = {};
    
    // 1. Check Delivery Note doctype
    // console.log('1. Checking Delivery Note doctype...');
    try {
      interface DocTypeSummary {
        name: string;
        module?: string;
        custom?: number;
        engine?: string;
        [key: string]: unknown;
      }
      const dnDoctype = await client.get<DocTypeSummary>('DocType', 'Delivery Note');
      diagnostics.delivery_note_doctype = {
        status: 'found',
        name: dnDoctype.name,
        module: dnDoctype.module,
        custom: dnDoctype.custom,
        engine: dnDoctype.engine
      };
    } catch (error) {
      diagnostics.delivery_note_doctype = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 2. Check Delivery Note Item doctype
    // console.log('2. Checking Delivery Note Item doctype...');
    try {
      interface DocTypeSummary {
        name: string;
        module?: string;
        custom?: number;
        engine?: string;
        [key: string]: unknown;
      }
      const dnItemDoctype = await client.get<DocTypeSummary>('DocType', 'Delivery Note Item');
      diagnostics.delivery_note_item_doctype = {
        status: 'found',
        name: dnItemDoctype.name,
        module: dnItemDoctype.module,
        custom: dnItemDoctype.custom,
        engine: dnItemDoctype.engine
      };
    } catch (error) {
      diagnostics.delivery_note_item_doctype = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 3. Check user permissions
    // console.log('3. Checking user permissions...');
    try {
      // Get site config to access API key for user lookup
      const siteConfig = (client as { getSiteConfig?: () => { apiKey: string } }).getSiteConfig?.() || { apiKey: process.env.ERP_API_KEY || '' };
      const userEmail = siteConfig.apiKey || process.env.ERP_API_KEY || '';
      
      interface UserDoc {
        email?: string;
        enabled?: number;
        roles?: { role: string }[];
        [key: string]: unknown;
      }
      const userData = await client.get<UserDoc>('User', userEmail);
      diagnostics.user_permissions = {
        status: 'found',
        email: userData.email,
        enabled: userData.enabled,
        roles: userData.roles || []
      };
    } catch (error) {
      diagnostics.user_permissions = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 4. Check available items
    // console.log('4. Checking available items...');
    try {
      interface ItemSummary {
        name: string;
        item_name?: string;
        item_group?: string;
        [key: string]: unknown;
      }
      const itemsData = await client.getList<ItemSummary>('Item', {
        fields: ['name', 'item_name', 'item_group'],
        limit_page_length: 5
      });
      diagnostics.available_items = {
        status: 'found',
        count: itemsData.length || 0,
        sample_items: itemsData.slice(0, 3).map((item: ItemSummary) => ({
          name: item.name,
          item_name: item.item_name,
          item_group: item.item_group
        }))
      };
    } catch (error) {
      diagnostics.available_items = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 5. Check warehouses
    // console.log('5. Checking warehouses...');
    try {
      interface WarehouseSummary {
        name: string;
        warehouse_name?: string;
        [key: string]: unknown;
      }
      const warehouseData = await client.getList<WarehouseSummary>('Warehouse', {
        fields: ['name', 'warehouse_name'],
        limit_page_length: 5
      });
      diagnostics.warehouses = {
        status: 'found',
        count: warehouseData.length || 0,
        sample_warehouses: warehouseData.slice(0, 3).map((wh: WarehouseSummary) => ({
          name: wh.name,
          warehouse_name: wh.warehouse_name
        }))
      };
    } catch (error) {
      diagnostics.warehouses = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 6. Test creating a simple DN item directly
    // console.log('6. Testing direct DN item creation...');
    try {
      const testItemPayload = {
        parent: "MAT-DN-2026-00007",
        parentfield: "items",
        parenttype: "Delivery Note",
        item_code: "SKU001",
        item_name: "T-shirt",
        qty: 1,
        rate: 100,
        amount: 100,
        warehouse: "Stores - E1D"
      };
      
      const testItemData = await client.insert<Record<string, unknown>>('Delivery Note Item', testItemPayload);
      
      diagnostics.direct_item_creation_test = {
        status: 'success',
        response_status: 200,
        response_data: testItemData
      };
      
    } catch (error) {
      diagnostics.direct_item_creation_test = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      diagnostics: diagnostics,
      summary: {
        doctypes_ok: diagnostics.delivery_note_doctype?.status === 'found' && diagnostics.delivery_note_item_doctype?.status === 'found',
        user_ok: diagnostics.user_permissions?.status === 'found',
        items_ok: diagnostics.available_items?.status === 'found' && (diagnostics.available_items?.count || 0) > 0,
        warehouses_ok: diagnostics.warehouses?.status === 'found' && (diagnostics.warehouses?.count || 0) > 0,
        item_creation_ok: diagnostics.direct_item_creation_test?.status === 'success'
      },
      recommendations: {
        if_doctypes_fail: "Check ERPNext installation and DocType configuration",
        if_user_fail: "Check user permissions and roles",
        if_items_fail: "Create sample items or check Item Master",
        if_warehouses_fail: "Create warehouses or check warehouse configuration",
        if_item_creation_fail: "Check permissions for Delivery Note Item creation"
      }
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/utils/diagnose', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
