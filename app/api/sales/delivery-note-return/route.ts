import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/sales/delivery-note-return
 * List delivery note returns (Delivery Notes with is_return=1) with pagination and filtering
 * 
 * Query Parameters:
 * - limit_page_length: number (default: 20)
 * - start: number (default: 0)
 * - search: string (customer name search)
 * - documentNumber: string (return document number)
 * - status: string (Draft | Submitted | Cancelled)
 * - from_date: string (YYYY-MM-DD)
 * - to_date: string (YYYY-MM-DD)
 * - filters: JSON string (additional ERPNext filters)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.7
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit_page_length') || searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by');
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters array
    let filtersArray: any[][] = [];
    
    // CRITICAL: Filter for returns only (is_return=1)
    filtersArray.push(["is_return", "=", 1]);
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const decodedFilters = decodeURIComponent(filters);
        const parsedFilters = JSON.parse(decodedFilters);
        filtersArray = filtersArray.concat(parsedFilters);
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }
    
    // Add search filter (customer name)
    if (search) {
      filtersArray.push(["customer_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter (map to docstatus)
    if (status) {
      if (status === 'Draft') {
        filtersArray.push(["docstatus", "=", 0]);
      } else if (status === 'Submitted') {
        filtersArray.push(["docstatus", "=", 1]);
      } else if (status === 'Cancelled') {
        filtersArray.push(["docstatus", "=", 2]);
      }
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Use client method instead of fetch
    const data = await client.getList('Delivery Note', {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'return_against', 'docstatus', 'grand_total', 'return_notes', 'return_processed_date', 'return_processed_by', 'creation'],
      filters: filtersArray,
      limit_page_length: parseInt(limit),
      start: parseInt(start),
      order_by: orderBy || 'creation desc'
    });

    // Transform data to match frontend expectations
    const transformedData = (data || []).map((dn: any) => ({
      name: dn.name,
      customer: dn.customer,
      customer_name: dn.customer_name,
      posting_date: dn.posting_date,
      delivery_note: dn.return_against, // Map return_against to delivery_note
      status: dn.docstatus === 0 ? 'Draft' : dn.docstatus === 1 ? 'Submitted' : 'Cancelled',
      grand_total: dn.grand_total,
      custom_notes: dn.return_notes,
      return_processed_date: dn.return_processed_date,
      return_processed_by: dn.return_processed_by,
      creation: dn.creation,
    }));

    const totalRecords = await client.getCount('Delivery Note', { filters: filtersArray });

    return NextResponse.json({
      success: true,
      data: transformedData,
      total_records: totalRecords,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/delivery-note-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/sales/delivery-note-return
 * Create a new delivery note return (Delivery Note with is_return=1)
 * 
 * Request Body:
 * - company: string
 * - customer: string
 * - posting_date: string (YYYY-MM-DD)
 * - return_against: string (original DN reference)
 * - items: Array of return items with return_reason
 * - return_notes?: string
 * 
 * Requirements: 1.6, 4.1, 8.1, 8.2, 8.3, 9.2, 9.7
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const returnData = await request.json();
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Validate request body structure
    if (!returnData.customer || !returnData.posting_date || !returnData.return_against) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customer, posting_date, or return_against' },
        { status: 400 }
      );
    }

    if (!returnData.items || !Array.isArray(returnData.items) || returnData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of returnData.items) {
      if (!item.item_code || !item.qty || item.qty <= 0) {
        return NextResponse.json(
          { success: false, message: 'Each item must have item_code and qty > 0' },
          { status: 400 }
        );
      }
      if (!item.return_reason) {
        return NextResponse.json(
          { success: false, message: 'Return reason is required for all items' },
          { status: 400 }
        );
      }
      if (item.return_reason === 'Other' && !item.return_item_notes) {
        return NextResponse.json(
          { success: false, message: 'Return notes are required when reason is "Other"' },
          { status: 400 }
        );
      }
      
      // Make quantities negative for returns
      item.qty = -Math.abs(item.qty);
    }

    // Use ERPNext's make_return method to ensure proper return handling
    const returnTemplate = await client.call('erpnext.stock.doctype.delivery_note.delivery_note.make_sales_return', {
      source_name: returnData.return_against,
    });

    if (!returnTemplate) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate return template from original DN' },
        { status: 500 }
      );
    }

    // Customize the return template with user's data
    returnTemplate.posting_date = returnData.posting_date;
    returnTemplate.return_notes = returnData.return_notes || returnData.custom_notes;
    
    // Ensure company is set
    if (returnData.company) {
      returnTemplate.company = returnData.company;
    }
    
    // Update items with user's return quantities and reasons
    const userItemsMap = new Map();
    returnData.items.forEach((item: any) => {
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
          return_reason: userItem.return_reason,
          return_item_notes: userItem.return_item_notes || '',
        };
      });

    // Validate that all items have warehouse
    const itemsWithoutWarehouse = returnTemplate.items.filter((item: any) => !item.warehouse);
    if (itemsWithoutWarehouse.length > 0) {
      console.warn('WARNING: Some items missing warehouse:', itemsWithoutWarehouse.map((i: any) => i.item_code));
    }

    // Fetch stock levels for each item before saving
    for (const item of returnTemplate.items) {
      if (item.item_code && item.warehouse) {
        try {
          const stockData = await client.getList('Bin', {
            fields: ['actual_qty', 'projected_qty'],
            filters: [
              ['item_code', '=', item.item_code],
              ['warehouse', '=', item.warehouse]
            ],
            limit_page_length: 1
          });
          
          if (stockData && stockData.length > 0) {
            item.actual_qty = stockData[0].actual_qty || 0;
          }
        } catch (stockError) {
          console.warn(`Failed to fetch stock for ${item.item_code}:`, stockError);
        }
      }
    }

    // Save the customized return document
    const saveData = await client.insert('Delivery Note', returnTemplate) as any;
    const savedDocName = saveData?.name;
    
    // Update company_total_stock for each item after save
    if (savedDocName && saveData?.items) {
      for (const item of saveData.items) {
        if (item.name && item.item_code && item.warehouse) {
          try {
            const stockData = await client.getList('Bin', {
              fields: ['actual_qty'],
              filters: [
                ['item_code', '=', item.item_code],
                ['warehouse', '=', item.warehouse]
              ],
              limit_page_length: 1
            });
            
            if (stockData && stockData.length > 0) {
              const actualQty = stockData[0].actual_qty || 0;
              
              await client.update('Delivery Note Item', item.name, {
                company_total_stock: actualQty
              });
              
              item.company_total_stock = actualQty;
            }
          } catch (stockError) {
            console.warn(`Failed to update stock for ${item.item_code}:`, stockError);
          }
        }
      }
    }
    
    // Refresh document to get all calculated fields
    if (savedDocName) {
      try {
        const refreshedDoc = await client.getDoc('Delivery Note', savedDocName) as any;
        if (refreshedDoc) {
          return NextResponse.json({
            success: true,
            data: refreshedDoc,
            message: 'Retur penjualan berhasil disimpan',
          });
        }
      } catch (refreshError) {
        console.warn('Failed to refresh document, returning saved data:', refreshError);
      }
    }
    
    // Fallback: return saved data
    return NextResponse.json({
      success: true,
      data: saveData,
      message: 'Retur penjualan berhasil disimpan',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/delivery-note-return', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
