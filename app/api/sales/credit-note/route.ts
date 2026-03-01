/**
 * Credit Note API Routes
 * 
 * Handles list and create operations for Credit Notes
 * Requirements: 2.1-2.10, 1.10-1.16
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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
  try {
    // console.log('=== Credit Note API Called ===');
    
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

    // Get authentication headers (API key priority, session fallback)
    const headers = getErpAuthHeaders(request);

    // Build filters array
    let filtersArray: any[] = [];
    
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

    // Build ERPNext URL
    // Fields: name, customer, customer_name, posting_date, return_against, docstatus, grand_total, custom_total_komisi_sales, creation
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","customer_name","posting_date","return_against","docstatus","grand_total","custom_total_komisi_sales","creation","modified"]&limit_page_length=${limit}&limit_start=${start}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${encodeURIComponent(orderBy)}`;
    } else {
      erpNextUrl += '&order_by=posting_date%20desc';
    }

    // console.log('Credit Note ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const responseText = await response.text();
    // console.log('Credit Note ERPNext Response Status:', response.status);
    // console.log('Credit Note ERPNext Response Text (first 500 chars):', responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid response from ERPNext server',
          details: responseText.substring(0, 200)
        },
        { status: response.status || 500 }
      );
    }

    // console.log('Credit Note API Response:', { status: response.status, dataCount: data.data?.length });

    if (response.ok) {
      // Transform data: docstatus → status, return_against → sales_invoice
      const transformedData = (data.data || []).map((creditNote: any) => {
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
      
      return NextResponse.json({
        success: true,
        data: transformedData,
        total_records: data.total_records || transformedData.length,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to fetch credit notes');
    }
  } catch (error) {
    console.error('Credit Note API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
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
  try {
    const creditNoteData = await request.json();
    // console.log('=== CREATE CREDIT NOTE ===');
    // console.log('Credit Note POST Payload:', JSON.stringify(creditNoteData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    // console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      // console.log('Using API key authentication (priority)');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      // console.log('Using session-based authentication');
      
      // Get CSRF token for ERPNext
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: {
            'Cookie': `sid=${sid}`,
          },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message && csrfData.message.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            // console.log('CSRF token added to headers');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token, continuing without it:', csrfError);
      }
    } else {
      console.error('No authentication available');
      return NextResponse.json(
        { success: false, message: 'No authentication available. Please login or configure API keys.' },
        { status: 401 }
      );
    }

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
    // console.log('Validating Sales Invoice existence and status:', creditNoteData.return_against);
    try {
      const invoiceUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(creditNoteData.return_against)}?fields=["name","status","docstatus","customer"]`;
      const invoiceResponse = await fetch(invoiceUrl, { headers });
      
      if (!invoiceResponse.ok) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Sales Invoice ${creditNoteData.return_against} tidak ditemukan` 
          },
          { status: 400 }
        );
      }
      
      const invoiceData = await invoiceResponse.json();
      const invoice = invoiceData.data;
      
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
      
      // console.log('Sales Invoice validation passed:', invoice.name);
    } catch (invoiceError) {
      console.error('Failed to validate Sales Invoice:', invoiceError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Gagal memvalidasi Sales Invoice. Silakan coba lagi.' 
        },
        { status: 500 }
      );
    }

    // Validate Accounting Period for posting_date (Requirement 1.15, 11.8)
    // console.log('Validating Accounting Period for posting_date:', creditNoteData.posting_date);
    try {
      const periodCheckUrl = `${ERPNEXT_API_URL}/api/resource/Accounting Period?` + new URLSearchParams({
        fields: JSON.stringify(['name', 'period_name', 'status', 'start_date', 'end_date']),
        filters: JSON.stringify([
          ['company', '=', creditNoteData.company],
          ['start_date', '<=', creditNoteData.posting_date],
          ['end_date', '>=', creditNoteData.posting_date],
        ]),
        limit_page_length: '1'
      });

      const periodResponse = await fetch(periodCheckUrl, { headers });
      
      if (periodResponse.ok) {
        const periodData = await periodResponse.json();
        if (periodData.data && periodData.data.length > 0) {
          const period = periodData.data[0];
          if (period.status === 'Closed' || period.status === 'Permanently Closed') {
            return NextResponse.json(
              { 
                success: false, 
                message: `Tidak dapat membuat Credit Note: Periode akuntansi ${period.period_name} sudah ditutup. Silakan pilih tanggal pada periode yang masih terbuka.` 
              },
              { status: 400 }
            );
          }
          // console.log('Accounting Period validation passed:', period.period_name);
        } else {
          console.log('No accounting period found for date, proceeding...');
        }
      }
    } catch (periodError) {
      console.warn('Failed to validate accounting period, continuing:', periodError);
      // Continue without blocking if period check fails
    }

    // Use ERPNext's make_sales_return method to generate Credit Note template (Requirement 1.10)
    const makeReturnUrl = `${ERPNEXT_API_URL}/api/method/erpnext.accounts.doctype.sales_invoice.sales_invoice.make_sales_return`;
    
    // console.log('Using make_sales_return method for proper return handling');
    // console.log('Return against Sales Invoice:', creditNoteData.return_against);

    const response = await fetch(makeReturnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_name: creditNoteData.return_against,
      }),
    });

    const responseText = await response.text();
    // console.log('Make Return Response Status:', response.status);
    
    let returnTemplate;
    try {
      const data = JSON.parse(responseText);
      returnTemplate = data.message;
    } catch (parseError) {
      console.error('Failed to parse make_return response:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Failed to generate return template' },
        { status: response.status }
      );
    }

    if (!response.ok || !returnTemplate) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate return template from original Sales Invoice' },
        { status: response.status }
      );
    }

    // console.log('Return template generated, customizing with user data...');

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
    const totalCommission = returnTemplate.items.reduce((sum: number, item: any) => {
      return sum + (item.custom_komisi_sales || 0);
    }, 0);
    returnTemplate.custom_total_komisi_sales = Math.round(totalCommission * 100) / 100;

    console.log('Commission calculation:', {
      items_count: returnTemplate.items.length,
      total_commission: returnTemplate.custom_total_komisi_sales,
      sample_item_commission: returnTemplate.items[0]?.custom_komisi_sales
    });

    // Log important fields for debugging
    // console.log('Return template fields check:', {
    //   company: returnTemplate.company,
    //   customer: returnTemplate.customer,
    //   is_return: returnTemplate.is_return,
    //   return_against: returnTemplate.return_against,
    //   items_count: returnTemplate.items?.length,
    //   custom_total_komisi_sales: returnTemplate.custom_total_komisi_sales,
    // });
    
    // console.log('Customized return template (first 500 chars):', JSON.stringify(returnTemplate).substring(0, 500));

    // Save Credit Note to ERPNext (Requirement 1.14)
    const saveResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnTemplate),
    });

    const saveResponseText = await saveResponse.text();
    // console.log('Save Credit Note Response Status:', saveResponse.status);
    
    let saveData;
    try {
      saveData = JSON.parse(saveResponseText);
    } catch (parseError) {
      console.error('Failed to parse save response:', parseError);
      console.error('Response text:', saveResponseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: saveResponse.status }
      );
    }

    // console.log('Credit Note Save Response Data:', saveData);

    if (saveResponse.ok) {
      const savedDocName = saveData.data?.name;
      
      // Refresh document using frappe.desk.form.load.getdoc to get all calculated fields
      if (savedDocName) {
        // console.log('Refreshing document with getdoc to get all fields...');
        try {
          const refreshResponse = await fetch(
            `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?` + new URLSearchParams({
              doctype: 'Sales Invoice',
              name: savedDocName
            }),
            { headers }
          );
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            // console.log('Document refreshed with getdoc successfully');
            
            // getdoc returns data in message.docs[0]
            const refreshedDoc = refreshData.message?.docs?.[0];
            if (refreshedDoc) {
              return NextResponse.json({
                success: true,
                data: refreshedDoc,
                message: 'Credit Note berhasil disimpan',
              });
            }
          }
        } catch (refreshError) {
          console.warn('Failed to refresh document with getdoc, returning saved data:', refreshError);
        }
      }
      
      // Fallback: return saved data
      return NextResponse.json({
        success: true,
        data: saveData.data,
        message: 'Credit Note berhasil disimpan',
      });
    } else {
      return handleERPNextAPIError(saveResponse, saveData, 'Failed to create credit note', returnTemplate);
    }
  } catch (error) {
    console.error('Credit Note POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
