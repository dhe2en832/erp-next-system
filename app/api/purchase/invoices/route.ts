import { NextRequest, NextResponse } from 'next/server';
import { CreatePurchaseInvoiceRequest } from '@/types/purchase-invoice';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Handle single document fetch
    if (id) {
      if (!company) {
        return NextResponse.json(
          { success: false, message: 'Company is required for single document fetch' },
          { status: 400 }
        );
      }

      // Fetch single Purchase Invoice with all fields
      const invoice = await client.getDoc('Purchase Invoice', id);

      // Verify company matches
      if (invoice.company !== company) {
        return NextResponse.json(
          { success: false, message: 'Purchase Invoice not found in this company' },
          { status: 404 }
        );
      }

      // Fetch items separately to get complete item details
      const items = await client.getList('Purchase Invoice Item', {
        fields: ['*'],
        filters: [['parent', '=', id]],
        order_by: 'idx asc'
      });

      invoice.items = items || [];

      // Get supplier details for address display
      let supplierAddressDisplay = '';
      if (invoice.supplier) {
        try {
          const supplierData = await client.getDoc('Supplier', invoice.supplier);
          supplierAddressDisplay = supplierData.address_display || '';
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

      return NextResponse.json({
        success: true,
        data: transformedInvoice,
      });
    }

    // Handle list fetch (existing logic)
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters array
    let filters: any[][] = [
      ["company", "=", company]
    ];
    
    if (search) {
      // Search by supplier name only (like PR API)
      filters.push(["supplier_name", "like", `%${search}%`]);
    }
    
    if (documentNumber) {
      filters.push(["name", "like", `%${documentNumber}%`]);
    }
    
    if (supplier) {
      filters.push(["supplier", "=", supplier]);
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
      "name", "supplier", "supplier_name", "posting_date", "due_date",
      "grand_total", "outstanding_amount", "status", "currency", "total",
      "net_total", "taxes_and_charges", "total_taxes_and_charges"
    ];

    // Build ERPNext URL with dynamic pagination
    const limit = searchParams.get('limit_page_length') || '20';
    const limitStart = searchParams.get('limit_start') || '0';
    
    // Use client method instead of direct fetch
    const data = await client.getList('Purchase Invoice', {
      fields: fields,
      filters: filters,
      order_by: 'posting_date desc',
      limit_page_length: parseInt(limit),
      start: parseInt(limitStart)
    });

    // Add backward compatibility - Requirements 3.8, 14.2, 14.5
    // For old invoices without discount/tax, ensure default values
    const invoices = (data || []).map((invoice: any) => ({
      ...invoice,
      discount_amount: invoice.discount_amount || 0,
      discount_percentage: invoice.discount_percentage || 0,
      total_taxes_and_charges: invoice.total_taxes_and_charges || 0,
      taxes: invoice.taxes || []
    }));

    return NextResponse.json({
      success: true,
      data: invoices,
      total_records: invoices.length,
    });
  } catch (error) {
    logSiteError(error, 'GET /api/purchase/invoices', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Purchase Invoice ID is required for update' },
        { status: 400 }
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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Use client.update method
    const updatedInvoice = await client.update('Purchase Invoice', id, invoiceData);

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
      message: 'Purchase Invoice updated successfully'
    });
  } catch (error) {
    logSiteError(error, 'PUT /api/purchase/invoices', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const invoiceData: CreatePurchaseInvoiceRequest = await request.json();

    if (!invoiceData.supplier || !invoiceData.company) {
      return NextResponse.json(
        { success: false, message: 'Supplier and company are required' },
        { status: 400 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

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

    // Validate tax template if provided - Requirements 5.3, 5.7
    if (invoiceData.taxes_and_charges) {
      try {
        // Fetch tax template to validate it exists and is active
        const taxTemplateData = await client.getDoc('Purchase Taxes and Charges Template', invoiceData.taxes_and_charges);
        
        // Check if template is disabled
        if (taxTemplateData.disabled === 1) {
          return NextResponse.json({
            success: false,
            message: `Tax template '${invoiceData.taxes_and_charges}' is disabled`
          }, { status: 400 });
        }

        // Validate account_head in tax template exists in COA
        if (taxTemplateData.taxes && Array.isArray(taxTemplateData.taxes)) {
          for (const taxRow of taxTemplateData.taxes) {
            if (taxRow.account_head) {
              try {
                await client.getDoc('Account', taxRow.account_head);
              } catch (error) {
                return NextResponse.json({
                  success: false,
                  message: `Account '${taxRow.account_head}' not found in Chart of Accounts`
                }, { status: 400 });
              }
            }
          }
        }
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          message: `Tax template '${invoiceData.taxes_and_charges}' not found`
        }, { status: 400 });
      }
    }

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

    // Create Purchase Invoice using client method
    const newInvoice = await client.insert('Purchase Invoice', payload);

    return NextResponse.json({
      success: true,
      message: 'Purchase Invoice created successfully in ERPNext',
      data: newInvoice
    });

  } catch (error: any) {
    logSiteError(error, 'POST /api/purchase/invoices', siteId);
    
    let errorMessage = 'Failed to create purchase invoice';
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error.toString()
    }, { status: 500 });
  }
}
