/**
 * Credit Note API Routes
 * 
 * Handles list and create operations for Credit Notes
 * Requirements: 2.1-2.10, 1.10-1.16
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/sales/credit-note
 * List Credit Notes with filtering and pagination
 * 
 * Query Parameters:
 * - limit_page_length: number (default: 20)
 * - start: number (default: 0)
 * - search: string (customer name search)
 * - documentNumber: string (credit note document number)
 * - status: string (Draft | Submitted | Cancelled)
 * - from_date: string (YYYY-MM-DD)
 * - to_date: string (YYYY-MM-DD)
 * - filters: JSON string (additional ERPNext filters)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10
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
    const filtersArray: any[] = [];
    
    // CRITICAL: Filter by is_return=1 to get only Credit Notes (Sales Invoice returns)
    filtersArray.push(["is_return", "=", 1]);
    
    // Parse existing filters if provided
    if (filters) {
      try {
        const decodedFilters = decodeURIComponent(filters);
        const parsedFilters = JSON.parse(decodedFilters);
        if (Array.isArray(parsedFilters)) {
          filtersArray.push(...parsedFilters);
        }
      } catch (e) {
        console.error('Error parsing filters:', e);
        try {
          const parsedFilters = JSON.parse(filters);
          if (Array.isArray(parsedFilters)) {
            filtersArray.push(...parsedFilters);
          }
        } catch (e2) {
          console.error('Error parsing filters directly:', e2);
        }
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
      let docstatus: number;
      switch (status) {
        case 'Draft':
          docstatus = 0;
          break;
        case 'Submitted':
          docstatus = 1;
          break;
        case 'Cancelled':
          docstatus = 2;
          break;
        default:
          docstatus = 0;
      }
      filtersArray.push(["docstatus", "=", docstatus]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Use client.getList instead of fetch
    const creditNotes = await client.getList('Sales Invoice', {
      fields: ['name', 'customer', 'customer_name', 'posting_date', 'return_against', 'docstatus', 'grand_total', 'custom_total_komisi_sales', 'creation', 'modified'],
      filters: filtersArray,
      limit_page_length: parseInt(limit),
      start: parseInt(start),
      order_by: orderBy || 'creation desc, posting_date desc'
    });

    // Transform data: docstatus → status, return_against → sales_invoice
    const transformedData = (creditNotes || []).map((creditNote: any) => {
        // Map docstatus to status label
        let statusLabel: string;
        switch (creditNote.docstatus) {
          case 0:
            statusLabel = 'Draft';
            break;
          case 1:
            statusLabel = 'Submitted';
            break;
          case 2:
            statusLabel = 'Cancelled';
            break;
          default:
            statusLabel = 'Draft';
        }
        
        return {
          ...creditNote,
          status: statusLabel,
          sales_invoice: creditNote.return_against, // Transform return_against to sales_invoice
        };
      });
      
      const totalRecords = await client.getCount('Sales Invoice', { filters: filtersArray });

      return NextResponse.json({
        success: true,
        data: transformedData,
        total_records: totalRecords,
      });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/credit-note', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/sales/credit-note
 * Create new Credit Note from paid Sales Invoice
 * 
 * Request Body:
 * - company: string
 * - customer: string
 * - posting_date: string (YYYY-MM-DD)
 * - return_against: string (Sales Invoice reference)
 * - items: Array of return items with return_reason
 * - return_notes?: string
 * 
 * Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 11.6, 11.7, 11.8
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const creditNoteData = await request.json();

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Validate request body structure (Requirement 11.6)
    if (!creditNoteData.customer || !creditNoteData.posting_date || !creditNoteData.return_against) {
      return NextResponse.json(
        { success: false, message: 'Field wajib tidak lengkap: customer, posting_date, atau return_against' },
        { status: 400 }
      );
    }

    if (!creditNoteData.items || !Array.isArray(creditNoteData.items) || creditNoteData.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Minimal satu item harus dipilih untuk diretur' },
        { status: 400 }
      );
    }

    // Validate posting_date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(creditNoteData.posting_date)) {
      return NextResponse.json(
        { success: false, message: 'Format tanggal posting tidak valid. Gunakan format YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < creditNoteData.items.length; i++) {
      const item = creditNoteData.items[i];
      
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

    // Validate Sales Invoice existence and status (Requirement 11.7)
    try {
      const invoice = await client.get('Sales Invoice', creditNoteData.return_against) as any;
      
      if (invoice.status !== 'Paid') {
        return NextResponse.json(
          { 
            success: false, 
            message: `Sales Invoice ${creditNoteData.return_against} harus berstatus "Paid". Status saat ini: ${invoice.status}` 
          },
          { status: 400 }
        );
      }
      
      if (invoice.customer !== creditNoteData.customer) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Customer tidak sesuai dengan Sales Invoice` 
          },
          { status: 400 }
        );
      }
    } catch (invoiceError) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Sales Invoice ${creditNoteData.return_against} tidak ditemukan` 
        },
        { status: 400 }
      );
    }

    // Validate Accounting Period for posting_date (Requirement 1.15, 11.8)
    try {
      const periods = await client.getList('Accounting Period', {
        fields: ['name', 'period_name', 'status', 'start_date', 'end_date'],
        filters: [
          ['company', '=', creditNoteData.company],
          ['start_date', '<=', creditNoteData.posting_date],
          ['end_date', '>=', creditNoteData.posting_date],
        ],
        limit_page_length: 1
      });
      
      if (periods && periods.length > 0) {
        const period = periods[0] as any;
        if (period.status === 'Closed' || period.status === 'Permanently Closed') {
          return NextResponse.json(
            { 
              success: false, 
              message: `Tidak dapat membuat Credit Note: Periode akuntansi ${period.period_name} sudah ditutup. Silakan pilih tanggal pada periode yang masih terbuka.` 
            },
            { status: 400 }
          );
        }
      }
    } catch (periodError) {
      // Continue without blocking if period check fails
    }

    // Use ERPNext's make_sales_return method to generate Credit Note template (Requirement 1.10)
    const returnTemplate = await client.call('erpnext.accounts.doctype.sales_invoice.sales_invoice.make_sales_return', {
      source_name: creditNoteData.return_against,
    }) as any;

    // Customize template with user data (Requirement 1.11)
    returnTemplate.posting_date = creditNoteData.posting_date;
    returnTemplate.custom_return_notes = creditNoteData.custom_return_notes || creditNoteData.custom_notes;
    
    // Ensure company is set
    if (creditNoteData.company) {
      returnTemplate.company = creditNoteData.company;
    }
    
    // Build map of user items for quick lookup
    const userItemsMap = new Map();
    creditNoteData.items.forEach((item: any) => {
      userItemsMap.set(item.item_code, item);
    });

    // Filter and update items based on user selection
    // Copy custom_komisi_sales from original items (negative, proportional) (Requirement 1.12)
    returnTemplate.items = returnTemplate.items
      .filter((item: any) => userItemsMap.has(item.item_code))
      .map((item: any) => {
        const userItem = userItemsMap.get(item.item_code);
        const returnQty = -Math.abs(userItem.qty); // Negative for return
        
        // Calculate proportional commission (negative)
        // Formula: -(original_commission × return_qty / original_qty)
        const originalQty = Math.abs(item.qty); // Template has negative qty
        const originalCommission = userItem.custom_komisi_sales || 0;
        const proportionalCommission = originalQty > 0 
          ? -(originalCommission * Math.abs(userItem.qty) / originalQty)
          : 0;
        
        return {
          ...item,
          qty: returnQty,
          rate: item.rate || userItem.rate || 0,
          amount: returnQty * (item.rate || userItem.rate || 0),
          warehouse: userItem.warehouse || item.warehouse,
          custom_return_reason: userItem.custom_return_reason,
          custom_return_item_notes: userItem.custom_return_item_notes || '',
          custom_komisi_sales: Math.round(proportionalCommission * 100) / 100, // Round to 2 decimals
        };
      });

    // Calculate custom_total_komisi_sales (Requirement 1.13)
    const totalCommission = (returnTemplate.items || []).reduce((sum: number, item: any) => {
      return sum + (item.custom_komisi_sales || 0);
    }, 0);
    returnTemplate.custom_total_komisi_sales = Math.round(totalCommission * 100) / 100;

    console.log('Commission calculation:', {
      items_count: returnTemplate.items?.length || 0,
      total_commission: returnTemplate.custom_total_komisi_sales,
      sample_item_commission: returnTemplate.items?.[0]?.custom_komisi_sales
    });

    // Save Credit Note to ERPNext (Requirement 1.14)
    const savedDoc = await client.insert('Sales Invoice', returnTemplate) as any;

    // Refresh document using frappe.desk.form.load.getdoc to get all calculated fields
    if (savedDoc.name) {
      try {
        const refreshedDoc = await client.call('frappe.desk.form.load.getdoc', {
          doctype: 'Sales Invoice',
          name: savedDoc.name
        }) as any;
        
        // getdoc returns data in docs[0]
        if (refreshedDoc?.docs?.[0]) {
          return NextResponse.json({
            success: true,
            data: refreshedDoc.docs[0],
            message: 'Credit Note berhasil disimpan',
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
      message: 'Credit Note berhasil disimpan',
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/credit-note', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
