import { NextRequest, NextResponse } from 'next/server';
import { CreatePurchaseInvoiceRequest } from '@/types/purchase-invoice';

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
    const documentNumber = searchParams.get('documentNumber');
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
      // Search by supplier name only (like PR API)
      filters += `,["supplier_name","like","%${search}%"]`;
    }
    
    if (documentNumber) {
      filters += `,["name","like","%${documentNumber}%"]`;
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
    
    // Note: discount_amount and discount_percentage removed from fields to avoid ERPNext permission errors
    // These fields are added with default values (0) in the response transformation layer below
    // Include discount and tax fields in the response - Requirements 3.6, 3.8, 14.2, 14.5
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=["name","supplier","supplier_name","posting_date","due_date","grand_total","outstanding_amount","status","currency","total","net_total","taxes_and_charges","total_taxes_and_charges"]&filters=${encodeURIComponent(filters)}&order_by=posting_date desc&limit_page_length=${limit}&start=${start}`;

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
      // Add backward compatibility - Requirements 3.8, 14.2, 14.5
      // For old invoices without discount/tax, ensure default values
      const invoices = data.data?.map((invoice: any) => ({
        ...invoice,
        discount_amount: invoice.discount_amount || 0,
        discount_percentage: invoice.discount_percentage || 0,
        total_taxes_and_charges: invoice.total_taxes_and_charges || 0,
        taxes: invoice.taxes || []
      })) || [];

      return NextResponse.json({
        success: true,
        data: invoices,
        total_records: data.total_records || invoices.length,
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
    console.log('=== CREATE PURCHASE INVOICE - ERPNEXT REST API ===');
    
    // Use API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    const invoiceData: CreatePurchaseInvoiceRequest = await request.json();
    console.log('Purchase Invoice Data:', JSON.stringify(invoiceData, null, 2));

    if (!invoiceData.supplier || !invoiceData.company) {
      return NextResponse.json(
        { success: false, message: 'Supplier and company are required' },
        { status: 400 }
      );
    }

    // Validate discount fields - Requirements 5.1, 5.2, 5.4
    if (invoiceData.discount_percentage !== undefined) {
      if (invoiceData.discount_percentage < 0 || invoiceData.discount_percentage > 100) {
        return NextResponse.json({
          success: false,
          message: 'Discount percentage must be between 0 and 100'
        }, { status: 400 });
      }
    }

    // Calculate subtotal for discount_amount validation
    const subtotal = invoiceData.items?.reduce((sum, item) => {
      return sum + (item.qty * item.rate);
    }, 0) || 0;

    if (invoiceData.discount_amount !== undefined) {
      if (invoiceData.discount_amount < 0) {
        return NextResponse.json({
          success: false,
          message: 'Discount amount cannot be negative'
        }, { status: 400 });
      }
      if (invoiceData.discount_amount > subtotal) {
        return NextResponse.json({
          success: false,
          message: 'Discount amount cannot exceed subtotal'
        }, { status: 400 });
      }
    }

    // Priority rule: discount_amount > discount_percentage - Requirement 5.4
    console.log('Discount validation passed:', {
      discount_percentage: invoiceData.discount_percentage,
      discount_amount: invoiceData.discount_amount,
      subtotal
    });

    // Validate tax template if provided - Requirements 5.3, 5.7
    if (invoiceData.taxes_and_charges) {
      try {
        // Fetch tax template to validate it exists and is active
        const taxTemplateUrl = `${baseUrl}/api/resource/Purchase Taxes and Charges Template/${encodeURIComponent(invoiceData.taxes_and_charges)}`;
        const taxTemplateResponse = await fetch(taxTemplateUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
        });

        if (!taxTemplateResponse.ok) {
          return NextResponse.json({
            success: false,
            message: `Tax template '${invoiceData.taxes_and_charges}' not found`
          }, { status: 400 });
        }

        const taxTemplateData = await taxTemplateResponse.json();
        
        // Check if template is disabled
        if (taxTemplateData.data?.disabled === 1) {
          return NextResponse.json({
            success: false,
            message: `Tax template '${invoiceData.taxes_and_charges}' is disabled`
          }, { status: 400 });
        }

        // Validate account_head in tax template exists in COA
        if (taxTemplateData.data?.taxes && Array.isArray(taxTemplateData.data.taxes)) {
          for (const taxRow of taxTemplateData.data.taxes) {
            if (taxRow.account_head) {
              const accountUrl = `${baseUrl}/api/resource/Account/${encodeURIComponent(taxRow.account_head)}`;
              const accountResponse = await fetch(accountUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `token ${apiKey}:${apiSecret}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!accountResponse.ok) {
                return NextResponse.json({
                  success: false,
                  message: `Account '${taxRow.account_head}' not found in Chart of Accounts`
                }, { status: 400 });
              }
            }
          }
        }

        console.log('Tax template validation passed:', invoiceData.taxes_and_charges);
      } catch (error: any) {
        console.error('Tax template validation error:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to validate tax template',
          error: error.toString()
        }, { status: 400 });
      }
    }

    console.log('Creating Purchase Invoice:', {
      supplier: invoiceData.supplier,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date,
      company: invoiceData.company,
      currency: invoiceData.currency,
      discount_amount: invoiceData.discount_amount,
      discount_percentage: invoiceData.discount_percentage,
      taxes_and_charges: invoiceData.taxes_and_charges,
      items_count: invoiceData.items?.length || 0
    });

    // Prepare invoice data for ERPNext with discount and tax support
    const payload: any = {
      doctype: 'Purchase Invoice',
      company: invoiceData.company,
      supplier: invoiceData.supplier,
      supplier_name: invoiceData.supplier_name,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date || invoiceData.posting_date,
      items: invoiceData.items || [],
      currency: invoiceData.currency || 'IDR',
      buying_price_list: invoiceData.buying_price_list || 'Standard Beli',
      price_list_currency: invoiceData.price_list_currency || 'IDR',
      plc_conversion_rate: invoiceData.plc_conversion_rate || 1,
      status: invoiceData.status || 'Draft',
      docstatus: invoiceData.docstatus || 0,
      // Write-off amount to prevent TypeError (must be 0, not null)
      write_off_amount: 0,
      base_write_off_amount: 0,
      // Discount fields - Requirements 3.1, 3.2
      discount_amount: invoiceData.discount_amount || 0,
      discount_percentage: invoiceData.discount_percentage || 0,
      additional_discount_percentage: invoiceData.additional_discount_percentage || 0,
      apply_discount_on: invoiceData.apply_discount_on || 'Net Total'
    };

    // Add optional fields if provided
    if (invoiceData.bill_no) {
      payload.bill_no = invoiceData.bill_no;
    }

    if (invoiceData.bill_date) {
      payload.bill_date = invoiceData.bill_date;
    }

    // Add tax fields - Requirement 3.3
    if (invoiceData.taxes_and_charges) {
      payload.taxes_and_charges = invoiceData.taxes_and_charges;
    }

    if (invoiceData.taxes && invoiceData.taxes.length > 0) {
      payload.taxes = invoiceData.taxes;
    }

    // Add calculated totals if provided
    if (invoiceData.grand_total) {
      payload.grand_total = invoiceData.grand_total;
      payload.total = invoiceData.total || invoiceData.grand_total;
      payload.net_total = invoiceData.net_total || invoiceData.grand_total;
      payload.base_total = invoiceData.base_total || invoiceData.grand_total;
      payload.base_net_total = invoiceData.base_net_total || invoiceData.grand_total;
      payload.base_grand_total = invoiceData.base_grand_total || invoiceData.grand_total;
      payload.outstanding_amount = invoiceData.outstanding_amount || invoiceData.grand_total;
    }

    console.log('Final Payload:', JSON.stringify(payload, null, 2));

    // Create Purchase Invoice using ERPNext REST API
    const erpNextUrl = `${baseUrl}/api/resource/Purchase Invoice`;
    
    console.log('ERPNext REST API URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('ERPNext Response Status:', response.status);

    const responseText = await response.text();
    console.log('ERPNext Response Text:', responseText);

    if (!response.ok) {
      console.error('ERPNext API Error:', responseText);
      return NextResponse.json({
        success: false,
        message: 'Failed to create purchase invoice in ERPNext',
        error: responseText,
        status: response.status
      }, { status: 500 });
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('ERPNext Success Response:', data);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON response from ERPNext',
        error: responseText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase Invoice created successfully in ERPNext',
      data: data
    });

  } catch (error: any) {
    console.error('Create Purchase Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create purchase invoice',
      error: error.toString()
    }, { status: 500 });
  }
}
