import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

// Helper function to get CSRF token from ERPNext
async function getCSRFToken(sid: string): Promise<string | null> {
  try {
    console.log('Attempting to get CSRF token with sid:', sid.substring(0, 10) + '...');
    
    const response = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.auth.get_csrf_token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
    });

    console.log('CSRF Token Response Status:', response.status);
    console.log('CSRF Token Response OK:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('CSRF Token Response Data:', data);
      const token = data.message?.csrf_token || null;
      console.log('Extracted CSRF Token:', token ? token.substring(0, 10) + '...' : 'null');
      return token;
    } else {
      const errorText = await response.text();
      console.error('CSRF Token Error Response:', errorText);
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const supplier = searchParams.get('supplier');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const id = searchParams.get('id'); // For single document fetch

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle single document fetch
    if (id) {
      if (!company) {
        return NextResponse.json(
          { success: false, message: 'Company is required for single document fetch' },
          { status: 400 }
        );
      }

      console.log(`Fetching Purchase Invoice ${id} for company ${company}`);

      // Fetch single Purchase Invoice with all fields
      const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${id}?fields=["*"]`;

      const response = await fetch(
        erpNextUrl,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sid=${sid}`,
          },
          credentials: 'include',
        }
      );

      const data = await response.json();
      console.log('Purchase Invoice detail response:', data);

      if (response.ok) {
        const invoice = data.data;
        
        // Verify company matches
        if (invoice.company !== company) {
          return NextResponse.json(
            { success: false, message: 'Purchase Invoice not found in this company' },
            { status: 404 }
          );
        }

        // Fetch items separately to get complete item details
        const itemsUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice Item?fields=["*"]&filters=[["parent","=","${id}"]]&order_by=idx asc`;
        
        const itemsResponse = await fetch(
          itemsUrl,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `sid=${sid}`,
            },
            credentials: 'include',
          }
        );

        const itemsData = await itemsResponse.json();
        
        if (itemsResponse.ok) {
          invoice.items = itemsData.data || [];
        } else {
          console.warn('Failed to fetch items, using empty array');
          invoice.items = [];
        }
        
        console.log('Invoice with items:', invoice);
        console.log('Items count:', invoice.items.length);
        console.log('All invoice fields:', Object.keys(invoice));
        console.log('Custom notes field value:', invoice.custom_note_pi);
        console.log('Custom notes pr field value:', invoice.custom_notes_pr);
        console.log('Remarks field value:', invoice.remarks);

        // Get supplier details for address display
        let supplierAddressDisplay = '';
        if (invoice.supplier) {
          try {
            const supplierUrl = `${ERPNEXT_API_URL}/api/resource/Supplier/${invoice.supplier}?fields=["supplier_name","address_display"]`;
            
            const supplierResponse = await fetch(
              supplierUrl,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': `sid=${sid}`,
                },
                credentials: 'include',
              }
            );

            const supplierData = await supplierResponse.json();
            
            if (supplierResponse.ok && supplierData.data) {
              supplierAddressDisplay = supplierData.data.address_display || '';
            }
          } catch (error) {
            console.warn('Failed to fetch supplier details:', error);
          }
        }

        // Transform the data to match our interface
        const transformedInvoice = {
          name: invoice.name,
          supplier: invoice.supplier,
          supplier_name: invoice.supplier_name,
          supplier_address_display: supplierAddressDisplay,
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          company: invoice.company,
          currency: invoice.currency,
          status: invoice.status,
          grand_total: invoice.grand_total,
          outstanding_amount: invoice.outstanding_amount,
          custom_note_pi: invoice.remarks, // Map remarks to custom_note_pi for frontend
          items: invoice.items.map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            qty: item.qty,
            uom: item.uom,
            rate: item.rate,
            amount: item.amount,
            warehouse: item.warehouse,
            purchase_receipt: item.purchase_receipt,
            purchase_receipt_item: item.purchase_receipt_item,
            purchase_order: item.purchase_order,
            purchase_order_item: item.purchase_order_item,
          }))
        };

        console.log('Transformed Purchase Invoice:', transformedInvoice);

        return NextResponse.json({
          success: true,
          data: transformedInvoice,
        });
      } else {
        console.error('ERPNext API Error:', data);
        
        // Handle specific permission error
        if (data.exc && data.exc.includes('PermissionError')) {
          return NextResponse.json(
            { success: false, message: 'Anda tidak memiliki izin untuk mengakses Purchase Invoice ini. Silakan hubungi administrator.' },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { success: false, message: data.exc || data.message || 'Purchase Invoice tidak ditemukan' },
          { status: response.status }
        );
      }
    }

    // Handle list fetch (existing logic)
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      filters += `,["name","like","%${search}%"],["supplier","like","%${search}%"]`;
    }
    
    if (supplier) {
      filters += `,["supplier","=","${supplier}"]`;
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (fromDate) {
      filters += `,["posting_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["posting_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    // Build ERPNext URL with dynamic pagination
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status","currency"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;

    console.log('Purchase Invoice ERPNext URL:', erpNextUrl);

    const response = await fetch(
      erpNextUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      }
    );

    const data = await response.json();
    console.log('Purchase Invoice response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: data.total_records || (data.data || []).length,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch purchase invoices' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Purchase Invoice ID is required for update' },
        { status: 400 }
      );
    }

    // Use API key authentication (like Purchase Receipts)
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      supplier, 
      posting_date, 
      due_date, 
      items, 
      company, 
      currency,
      remarks,
      custom_notes_pi
    } = body;

    if (!supplier || !company) {
      return NextResponse.json(
        { success: false, message: 'Supplier and company are required' },
        { status: 400 }
      );
    }

    console.log('Updating Purchase Invoice:', {
      id,
      supplier,
      posting_date,
      due_date,
      company,
      currency,
      remarks,
      items_count: items?.length || 0
    });

    console.log('Request body fields:', Object.keys(body));
    console.log('Full request body:', body);

    // Prepare invoice data for ERPNext
    const invoiceData = {
      supplier,
      posting_date,
      due_date,
      company,
      currency: currency || 'IDR',
      remarks,
      custom_notes_pi,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.item_name,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        uom: item.uom,
        warehouse: item.warehouse,
        purchase_receipt: item.purchase_receipt,
        purchase_receipt_item: item.purchase_receipt_item,
        purchase_order: item.purchase_order,
        purchase_order_item: item.purchase_order_item
      }))
    };

    console.log('Invoice Data for ERPNext:', invoiceData);

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();
    console.log('ERPNext Update Response:', data);
    console.log('ERPNext Update Response fields:', Object.keys(data.data || {}));
    console.log('Remarks field in update response:', data.data?.remarks);
    console.log('Custom notes field in update response:', data.data?.custom_notes_pi);
    console.log('Custom notes pr field in update response:', data.data?.custom_notes_pr);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Purchase Invoice updated successfully'
      });
    } else {
      console.error('ERPNext Update Error:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.exc || data.message || 'Failed to update purchase invoice',
          details: data
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use API key authentication (like Purchase Receipts)
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      supplier, 
      posting_date, 
      due_date, 
      items, 
      company, 
      currency,
      grand_total,
      remarks 
    } = body;

    if (!supplier || !company) {
      return NextResponse.json(
        { success: false, message: 'Supplier and company are required' },
        { status: 400 }
      );
    }

    console.log('Creating Purchase Invoice:', {
      supplier,
      posting_date,
      due_date,
      company,
      currency,
      grand_total,
      items_count: items?.length || 0
    });

    // Prepare invoice data for ERPNext
    const invoiceData = {
      doctype: 'Purchase Invoice',
      supplier,
      posting_date,
      due_date,
      company,
      currency: currency || 'IDR',
      grand_total,
      remarks,
      custom_notes_pi: remarks,
      items: items.map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        uom: item.uom,
        warehouse: item.warehouse,
        purchase_receipt: item.purchase_receipt,
        purchase_receipt_item: item.purchase_receipt_item,
        purchase_order: item.purchase_order,
        purchase_order_item: item.purchase_order_item,
        // Add quantity fields for custom API
        received_qty: item.received_qty || 0,
        rejected_qty: item.rejected_qty || 0
      }))
    };

    console.log('Invoice Data for ERPNext:', invoiceData);

    // Try custom API method first
    const customApiUrl = `${ERPNEXT_API_URL}/api/method/batasku_custom.api.create_purchase_invoice_with_details`;
    
    console.log('Using custom API method only...');
    const customResponse = await fetch(customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify({
        invoice_data: JSON.stringify(invoiceData)
      }),
    });

    const customData = await customResponse.json();
    console.log('Custom API Response:', customData);

    // Handle custom API response structure
    const apiData = customData.message || customData; // Handle wrapper
    
    if (customResponse.ok && apiData.success) {
      // Add logging for custom API response
      if (apiData.data?.items && apiData.data.items.length > 0) {
        console.log('First item fields:', Object.keys(apiData.data.items[0]));
        console.log('pr_detail in first item:', apiData.data.items[0].pr_detail);
        console.log('po_detail in first item:', apiData.data.items[0].po_detail);
        console.log('received_qty in first item:', apiData.data.items[0].received_qty);
        console.log('rejected_qty in first item:', apiData.data.items[0].rejected_qty);
        console.log('qty in first item:', apiData.data.items[0].qty);
        console.log('Full item data:', JSON.stringify(apiData.data.items[0], null, 2));
      }
      
      // Log custom notes from response
      console.log('Custom notes in response:', apiData.data?.custom_note_pi);
      console.log('Remarks in response:', apiData.data?.remarks);
      
      return NextResponse.json({
        success: true,
        data: apiData.data,
        message: apiData.message || 'Purchase Invoice created successfully via custom API'
      });
    } else {
      console.error('Custom API failed:', customData);
      return NextResponse.json(
        { 
          success: false, 
          message: apiData?.message?.message || apiData?.message || 'Custom API failed' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Purchase Invoice creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
