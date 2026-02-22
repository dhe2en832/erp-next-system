import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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
  try {
    console.log('=== Delivery Note Return API Called ===');
    
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

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","customer_name","posting_date","return_against","docstatus","grand_total","return_notes","return_processed_date","return_processed_by","creation"]&limit_page_length=${limit}&start=${start}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log('Delivery Note Return ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    console.log('Delivery Note Return ERPNext Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    console.log('Delivery Note Return API Response:', { status: response.status, data });

    if (response.ok) {
      // Transform data to match frontend expectations
      const transformedData = (data.data || []).map((dn: any) => ({
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
      
      return NextResponse.json({
        success: true,
        data: transformedData,
        total_records: data.total_records || transformedData.length,
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to fetch delivery note returns');
    }
  } catch (error) {
    console.error('Delivery Note Return API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
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
  try {
    const returnData = await request.json();
    console.log('=== CREATE DELIVERY NOTE RETURN ===');
    console.log('Delivery Note Return POST Payload:', JSON.stringify(returnData, null, 2));

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;
    console.log('Session ID (sid):', sid ? 'Present' : 'Missing');

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
      console.log('Using API key authentication (priority)');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication');
      
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
            console.log('CSRF token added to headers');
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

    // Transform to Delivery Note format
    const deliveryNoteData = {
      doctype: 'Delivery Note',
      is_return: 1,
      return_against: returnData.return_against,
      customer: returnData.customer,
      posting_date: returnData.posting_date,
      company: returnData.company,
      items: returnData.items.map((item: any) => ({
        ...item,
        dn_detail: item.delivery_note_item, // CRITICAL: Map delivery_note_item to dn_detail for ERPNext tracking
      })),
      return_notes: returnData.return_notes || returnData.custom_notes,
    };

    console.log('Making request to ERPNext with headers:', { ...headers, Authorization: headers.Authorization ? '***' : 'None' });

    // Use ERPNext's make_return method to ensure proper return handling
    // This will automatically set dn_detail and update returned_qty in original DN
    const makeReturnUrl = `${ERPNEXT_API_URL}/api/method/erpnext.stock.doctype.delivery_note.delivery_note.make_sales_return`;
    
    console.log('Using make_sales_return method for proper return handling');
    console.log('Return against DN:', returnData.return_against);

    const response = await fetch(makeReturnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_name: returnData.return_against,
      }),
    });

    const responseText = await response.text();
    console.log('Make Return Response Status:', response.status);
    
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
        { success: false, message: 'Failed to generate return template from original DN' },
        { status: response.status }
      );
    }

    console.log('Return template generated, customizing with user data...');

    // Customize the return template with user's data
    returnTemplate.posting_date = returnData.posting_date;
    returnTemplate.return_notes = returnData.return_notes || returnData.custom_notes;
    
    // Ensure company is set (should be inherited from template, but set explicitly if provided)
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
          rate: item.rate || userItem.rate || 0, // Ensure rate is set
          amount: returnQty * (item.rate || userItem.rate || 0), // Calculate amount
          warehouse: userItem.warehouse || item.warehouse, // Use user's warehouse or template warehouse
          return_reason: userItem.return_reason,
          return_item_notes: userItem.return_item_notes || '',
        };
      });

    // Log important fields for debugging
    console.log('Return template fields check:', {
      company: returnTemplate.company,
      customer: returnTemplate.customer,
      is_return: returnTemplate.is_return,
      return_against: returnTemplate.return_against,
      items_count: returnTemplate.items?.length,
      has_totals: {
        total: returnTemplate.total,
        grand_total: returnTemplate.grand_total,
      },
      first_item_warehouse: returnTemplate.items?.[0]?.warehouse,
    });
    
    // Validate that all items have warehouse
    const itemsWithoutWarehouse = returnTemplate.items.filter((item: any) => !item.warehouse);
    if (itemsWithoutWarehouse.length > 0) {
      console.warn('WARNING: Some items missing warehouse:', itemsWithoutWarehouse.map((i: any) => i.item_code));
    }
    
    console.log('Customized return template:', JSON.stringify(returnTemplate).substring(0, 500));

    // Fetch stock levels for each item before saving
    console.log('Fetching stock levels for items...');
    for (const item of returnTemplate.items) {
      if (item.item_code && item.warehouse) {
        try {
          const stockResponse = await fetch(
            `${ERPNEXT_API_URL}/api/resource/Bin?` + new URLSearchParams({
              fields: JSON.stringify(['actual_qty', 'projected_qty']),
              filters: JSON.stringify([
                ['item_code', '=', item.item_code],
                ['warehouse', '=', item.warehouse]
              ]),
              limit_page_length: '1'
            }),
            { headers }
          );
          
          if (stockResponse.ok) {
            const stockData = await stockResponse.json();
            if (stockData.data && stockData.data.length > 0) {
              item.actual_qty = stockData.data[0].actual_qty || 0;
              console.log(`Stock for ${item.item_code} at ${item.warehouse}: ${item.actual_qty}`);
            }
          }
        } catch (stockError) {
          console.warn(`Failed to fetch stock for ${item.item_code}:`, stockError);
          // Continue without stock data
        }
      }
    }

    // Now save the customized return document
    const saveResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnTemplate),
    });

    const saveResponseText = await saveResponse.text();
    console.log('Save Return Response Status:', saveResponse.status);
    
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

    console.log('Delivery Note Return Save Response Data:', saveData);

    if (saveResponse.ok) {
      const savedDocName = saveData.data?.name;
      
      // CRITICAL: Update company_total_stock for each item after save
      // This is a workaround because the Python validation hook doesn't seem to be triggered
      if (savedDocName && saveData.data?.items) {
        console.log('Updating company_total_stock for each item...');
        
        for (const item of saveData.data.items) {
          if (item.name && item.item_code && item.warehouse) {
            try {
              // Get stock from Bin
              const stockResponse = await fetch(
                `${ERPNEXT_API_URL}/api/resource/Bin?` + new URLSearchParams({
                  fields: JSON.stringify(['actual_qty']),
                  filters: JSON.stringify([
                    ['item_code', '=', item.item_code],
                    ['warehouse', '=', item.warehouse]
                  ]),
                  limit_page_length: '1'
                }),
                { headers }
              );
              
              if (stockResponse.ok) {
                const stockData = await stockResponse.json();
                if (stockData.data && stockData.data.length > 0) {
                  const actualQty = stockData.data[0].actual_qty || 0;
                  
                  // Update the item with company_total_stock
                  const updateResponse = await fetch(
                    `${ERPNEXT_API_URL}/api/resource/Delivery Note Item/${item.name}`,
                    {
                      method: 'PUT',
                      headers,
                      body: JSON.stringify({
                        company_total_stock: actualQty
                      })
                    }
                  );
                  
                  if (updateResponse.ok) {
                    console.log(`✓ Updated company_total_stock for ${item.item_code}: ${actualQty}`);
                    item.company_total_stock = actualQty; // Update in memory
                  } else {
                    console.warn(`⚠ Failed to update company_total_stock for ${item.item_code}`);
                  }
                }
              }
            } catch (stockError) {
              console.warn(`Failed to update stock for ${item.item_code}:`, stockError);
            }
          }
        }
      }
      
      // Refresh document using frappe.desk.form.load.getdoc to get all calculated fields
      if (savedDocName) {
        console.log('Refreshing document with getdoc to get all fields...');
        try {
          const refreshResponse = await fetch(
            `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc?` + new URLSearchParams({
              doctype: 'Delivery Note',
              name: savedDocName
            }),
            { headers }
          );
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Document refreshed with getdoc successfully');
            
            // getdoc returns data in message.docs[0]
            const refreshedDoc = refreshData.message?.docs?.[0];
            if (refreshedDoc) {
              return NextResponse.json({
                success: true,
                data: refreshedDoc, // Return refreshed data with company_total_stock
                message: 'Retur penjualan berhasil disimpan',
              });
            }
          }
        } catch (refreshError) {
          console.warn('Failed to refresh document with getdoc, returning updated data:', refreshError);
        }
      }
      
      // Fallback: return updated save data
      return NextResponse.json({
        success: true,
        data: saveData.data,
        message: 'Retur penjualan berhasil disimpan',
      });
    } else {
      return handleERPNextAPIError(saveResponse, saveData, 'Failed to create delivery note return', returnTemplate);
    }
  } catch (error) {
    console.error('Delivery Note Return POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
