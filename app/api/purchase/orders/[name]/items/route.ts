import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

// Type definitions
interface ERPNextPOItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  warehouse?: string;
  received_qty?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 401 }
      );
    }

    const client = await getERPNextClientForRequest(request);

    // First get PO details
    const poList = await client.getList('Purchase Order', {
      fields: ['name', 'supplier', 'supplier_name', 'transaction_date', 'status', 'warehouse', 'custom_notes_po'],
      filters: [
        ["name", "=", name],
        ["docstatus", "=", 0], // Draft status
        ["company", "=", company]
      ]
    });

    const po = Array.isArray(poList) ? poList[0] : poList;

    if (!po) {
      return NextResponse.json(
        { success: false, message: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      );
    }

    // Then get PO items
    let items = [];
    try {
      items = await client.getList('Purchase Order Item', {
        fields: ['name', 'item_code', 'item_name', 'description', 'qty', 'uom', 'rate', 'amount', 'warehouse', 'received_qty', 'parent', 'parentfield', 'parenttype'],
        filters: [
          ["parent", "=", name],
          ["parenttype", "=", "Purchase Order"]
        ],
        order_by: 'idx asc'
      });
    } catch (error) {
      console.error('Items fetch failed:', error);
      // Continue with empty items array
      items = [];
    }

    const processedItems = items.map((item: ERPNextPOItem) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty || 0,
      received_qty: 0, // Default received quantity
      rejected_qty: 0, // Default rejected quantity
      accepted_qty: item.qty || 0, // Default accepted qty follows PO qty (readonly)
      uom: item.uom,
      rate: item.rate,
      amount: item.amount,
      warehouse: item.warehouse,
      purchase_order: name,
      purchase_order_item: item.name,
      // Add remaining quantity calculation
      remaining_qty: (item.qty || 0) - (item.received_qty || 0)
    }));

    return NextResponse.json({
      success: true,
      data: {
        purchase_order: {
          name: po.name,
          supplier: po.supplier,
          supplier_name: po.supplier_name,
          transaction_date: po.transaction_date,
          status: po.status,
          warehouse: po.warehouse
        },
        items: processedItems
      }
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/purchase/orders/[name]/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
