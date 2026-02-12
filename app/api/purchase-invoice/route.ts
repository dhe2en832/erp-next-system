import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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
          custom_notes_pr: invoice.custom_notes_pr,
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

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
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
      custom_notes_pr 
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
      items_count: items?.length || 0
    });

    // Prepare invoice data for ERPNext
    const invoiceData = {
      supplier,
      posting_date,
      due_date,
      company,
      currency: currency || 'IDR',
      custom_notes_pr,
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
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();
    console.log('ERPNext Update Response:', data);

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
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
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
      custom_notes_pr 
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
      custom_notes_pr,
      items: items.map((item: any) => ({
        item_code: item.item_code,
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

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();
    console.log('ERPNext Response:', data);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Purchase Invoice created successfully'
      });
    } else {
      console.error('ERPNext Error:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.exc || data.message || 'Failed to create purchase invoice',
          details: data
        },
        { status: response.status }
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
