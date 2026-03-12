import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/purchase/purchase-return
 * List purchase returns with pagination, filtering, and search
 * Requirements: 12.1, 12.2, 12.7, 12.8
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const limitPageLength = searchParams.get('limit_page_length');
    const start = searchParams.get('start');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const orderBy = searchParams.get('order_by');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters array for Purchase Receipt with is_return=1
    const filters: any[][] = [
      ["company", "=", company],
      ["is_return", "=", 1]
    ];
    
    if (search) {
      // Search by supplier name
      filters.push(["supplier_name", "like", `%${search}%`]);
    }
    
    if (documentNumber) {
      // Search by document number
      filters.push(["name", "like", `%${documentNumber}%`]);
    }
    
    if (status) {
      filters.push(["status", "=", status]);
    }
    
    if (fromDate) {
      filters.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filters.push(["posting_date", "<=", toDate]);
    }

    const fields = [
      "name", "supplier", "supplier_name", "posting_date",
      "status", "docstatus", "grand_total", "currency", "return_against",
      "creation", "modified"
    ];

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client method to get list of Purchase Receipts with is_return=1
    const data = await client.getList('Purchase Receipt', {
      fields: fields,
      filters: filters,
      limit_page_length: parseInt(limitPageLength || '20'),
      ...(start && { start: parseInt(start) }),
      order_by: orderBy || 'creation desc, posting_date desc'
    });

    const totalRecords = await client.getCount('Purchase Receipt', { filters });

    return NextResponse.json({
      success: true,
      data: data || [],
      total_records: totalRecords,
    });
  } catch (error) {
    logSiteError(error, 'GET /api/purchase/purchase-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/purchase/purchase-return
 * Create new purchase return using ERPNext's make_purchase_return method
 * Requirements: 12.1, 12.7, 12.8
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const purchaseReturnData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Validate request body structure
    if (!purchaseReturnData.supplier || !purchaseReturnData.posting_date || !purchaseReturnData.return_against) {
      return NextResponse.json(
        { success: false, message: 'Field wajib tidak lengkap: supplier, posting_date, atau return_against' },
        { status: 400 }
      );
    }

    if (!purchaseReturnData.items || !Array.isArray(purchaseReturnData.items) || purchaseReturnData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Minimal satu item harus dipilih untuk diretur' },
        { status: 400 }
      );
    }

    // Validate posting_date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(purchaseReturnData.posting_date)) {
      return NextResponse.json(
        { success: false, message: 'Format tanggal posting tidak valid. Gunakan format YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < purchaseReturnData.items.length; i++) {
      const item = purchaseReturnData.items[i];
      
      if (!item.item_code || !item.item_name) {
        return NextResponse.json(
          { success: false, message: `Item ${i + 1}: item_code dan item_name wajib diisi` },
          { status: 400 }
        );
      }
      
      if (!item.qty || item.qty <= 0) {
        return NextResponse.json(
          { success: false, message: `Item ${item.item_name}: jumlah retur harus lebih besar dari 0` },
          { status: 400 }
        );
      }
      
      if (!item.custom_return_reason) {
        return NextResponse.json(
          { success: false, message: `Item ${item.item_name}: alasan retur wajib dipilih` },
          { status: 400 }
        );
      }
      
      if (item.custom_return_reason === 'Other' && (!item.custom_return_item_notes || item.custom_return_item_notes.trim() === '')) {
        return NextResponse.json(
          { success: false, message: `Item ${item.item_name}: catatan wajib diisi untuk alasan "Other"` },
          { status: 400 }
        );
      }
    }

    // Validate Purchase Receipt existence and status
    try {
      const receipt = await client.get('Purchase Receipt', purchaseReturnData.return_against) as any;
      
      if (receipt.docstatus !== 1) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Purchase Receipt ${purchaseReturnData.return_against} harus berstatus "Submitted". Status saat ini: ${receipt.status}` 
          },
          { status: 400 }
        );
      }
      
      if (receipt.supplier !== purchaseReturnData.supplier) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Supplier tidak sesuai dengan Purchase Receipt` 
          },
          { status: 400 }
        );
      }
    } catch (receiptError) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Purchase Receipt ${purchaseReturnData.return_against} tidak ditemukan` 
        },
        { status: 400 }
      );
    }

    // Use ERPNext's make_purchase_return method to generate return template
    const returnTemplate = await client.call('erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_return', {
      source_name: purchaseReturnData.return_against,
    }) as any;

    // Customize template with user data
    returnTemplate.posting_date = purchaseReturnData.posting_date;
    returnTemplate.custom_return_notes = purchaseReturnData.custom_return_notes || purchaseReturnData.custom_notes;
    
    // Ensure company is set
    if (purchaseReturnData.company) {
      returnTemplate.company = purchaseReturnData.company;
    }
    
    // Build map of user items for quick lookup
    const userItemsMap = new Map();
    purchaseReturnData.items.forEach((item: any) => {
      userItemsMap.set(item.item_code, item);
    });

    // Filter and update items based on user selection
    returnTemplate.items = returnTemplate.items
      .filter((item: any) => userItemsMap.has(item.item_code))
      .map((item: any) => {
        const userItem = userItemsMap.get(item.item_code);
        const returnQty = -Math.abs(userItem.qty); // Negative for return
        
        return {
          ...item,
          qty: returnQty,
          received_qty: returnQty, // Must be negative for returns
          accepted_qty: returnQty, // Must be negative for returns
          rejected_qty: 0, // No rejected qty for returns
          rate: item.rate || userItem.rate || 0,
          amount: returnQty * (item.rate || userItem.rate || 0),
          warehouse: userItem.warehouse || item.warehouse,
          custom_return_reason: userItem.custom_return_reason,
          custom_return_item_notes: userItem.custom_return_item_notes || '',
        };
      });

    // Save Purchase Return to ERPNext
    const savedDoc = await client.insert('Purchase Receipt', returnTemplate) as any;

    // Refresh document to get all calculated fields
    if (savedDoc.name) {
      try {
        const refreshedDoc = await client.call('frappe.desk.form.load.getdoc', {
          doctype: 'Purchase Receipt',
          name: savedDoc.name
        }) as any;
        
        // getdoc returns data in docs[0]
        if (refreshedDoc?.docs?.[0]) {
          return NextResponse.json({
            success: true,
            data: refreshedDoc.docs[0],
            message: 'Retur Pembelian berhasil dibuat',
          });
        }
      } catch (refreshError) {
        // Fallback to saved data if refresh fails
      }
    }
    
    // Fallback: return saved data
    return NextResponse.json({
      success: true,
      data: savedDoc,
      message: 'Retur Pembelian berhasil dibuat'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/purchase/purchase-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
