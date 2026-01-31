import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DIAGNOSE ERPNEXT SETUP ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const diagnostics = {};
    
    // 1. Check Delivery Note doctype
    console.log('1. Checking Delivery Note doctype...');
    try {
      const dnDoctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/DocType/Delivery%20Note`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      if (dnDoctypeResponse.ok) {
        const dnDoctype = await dnDoctypeResponse.json();
        diagnostics.delivery_note_doctype = {
          status: 'found',
          name: dnDoctype.data?.name,
          module: dnDoctype.data?.module,
          custom: dnDoctype.data?.custom,
          engine: dnDoctype.data?.engine
        };
      } else {
        diagnostics.delivery_note_doctype = {
          status: 'not_found',
          error: dnDoctypeResponse.status
        };
      }
    } catch (error) {
      diagnostics.delivery_note_doctype = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 2. Check Delivery Note Item doctype
    console.log('2. Checking Delivery Note Item doctype...');
    try {
      const dnItemDoctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/DocType/Delivery%20Note%20Item`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      if (dnItemDoctypeResponse.ok) {
        const dnItemDoctype = await dnItemDoctypeResponse.json();
        diagnostics.delivery_note_item_doctype = {
          status: 'found',
          name: dnItemDoctype.data?.name,
          module: dnItemDoctype.data?.module,
          custom: dnItemDoctype.data?.custom,
          engine: dnItemDoctype.data?.engine
        };
      } else {
        diagnostics.delivery_note_item_doctype = {
          status: 'not_found',
          error: dnItemDoctypeResponse.status
        };
      }
    } catch (error) {
      diagnostics.delivery_note_item_doctype = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 3. Check user permissions
    console.log('3. Checking user permissions...');
    try {
      const userResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/User/${process.env.ERP_API_KEY}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        diagnostics.user_permissions = {
          status: 'found',
          email: userData.data?.email,
          enabled: userData.data?.enabled,
          roles: userData.data?.roles || []
        };
      } else {
        diagnostics.user_permissions = {
          status: 'not_found',
          error: userResponse.status
        };
      }
    } catch (error) {
      diagnostics.user_permissions = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 4. Check available items
    console.log('4. Checking available items...');
    try {
      const itemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item?fields=["name","item_name","item_group"]&limit_page_length=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        diagnostics.available_items = {
          status: 'found',
          count: itemsData.data?.length || 0,
          sample_items: itemsData.data?.slice(0, 3).map((item: any) => ({
            name: item.name,
            item_name: item.item_name,
            item_group: item.item_group
          }))
        };
      } else {
        diagnostics.available_items = {
          status: 'not_found',
          error: itemsResponse.status
        };
      }
    } catch (error) {
      diagnostics.available_items = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 5. Check warehouses
    console.log('5. Checking warehouses...');
    try {
      const warehouseResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Warehouse?fields=["name","warehouse_name"]&limit_page_length=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
      });
      
      if (warehouseResponse.ok) {
        const warehouseData = await warehouseResponse.json();
        diagnostics.warehouses = {
          status: 'found',
          count: warehouseData.data?.length || 0,
          sample_warehouses: warehouseData.data?.slice(0, 3).map((wh: any) => ({
            name: wh.name,
            warehouse_name: wh.warehouse_name
          }))
        };
      } else {
        diagnostics.warehouses = {
          status: 'not_found',
          error: warehouseResponse.status
        };
      }
    } catch (error) {
      diagnostics.warehouses = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 6. Test creating a simple DN item directly
    console.log('6. Testing direct DN item creation...');
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
      
      const testItemResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify(testItemPayload)
      });
      
      const testItemData = testItemResponse.ok ? await testItemResponse.json() : { error: testItemResponse.status };
      
      diagnostics.direct_item_creation_test = {
        status: testItemResponse.ok ? 'success' : 'failed',
        response_status: testItemResponse.status,
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
    console.error('Diagnose ERPNext setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
