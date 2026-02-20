import { NextRequest, NextResponse } from 'next/server';
import { CreateSalesInvoiceRequest } from '@/types/sales-invoice';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET SALES INVOICES - SIMPLE COOKIE AUTH ===');
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const order_by = searchParams.get('order_by') || 'creation desc';
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = searchParams.get('limit') || '100';
    const start = searchParams.get('start') || '0';
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build filters
    let filtersArray = [];
    
    // Always add company filter if provided
    if (company) {
      filtersArray.push(["company", "=", company]);
    }
    
    // Add search filter
    if (search) {
      filtersArray.push(["customer_name", "like", `%${search}%`]);
    }
    
    // Add document number filter
    if (documentNumber) {
      filtersArray.push(["name", "like", `%${documentNumber}%`]);
    }
    
    // Add status filter
    if (status) {
      filtersArray.push(["status", "=", status]);
    }
    
    // Add date filters
    if (fromDate) {
      filtersArray.push(["posting_date", ">=", fromDate]);
    }
    
    if (toDate) {
      filtersArray.push(["posting_date", "<=", toDate]);
    }

    // Build URL with filters
    // Note: discount_amount and discount_percentage removed from fields to avoid ERPNext permission errors
    // These fields are added with default values (0) in the response transformation layer below
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","customer_name","posting_date","grand_total","status","docstatus","custom_total_komisi_sales","creation","total","net_total","taxes_and_charges","total_taxes_and_charges","outstanding_amount"]&limit_page_length=${limit}&limit_start=${start}&order_by=${order_by}`;
    
    if (filtersArray.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filtersArray))}`;
    }
    
    console.log('Invoice ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
    });

    const data = await response.json();
    console.log('🔍 Invoice Response Status:', response.status);
    console.log('📋 Complete Invoice Response Data:', JSON.stringify(data, null, 2));
    
    // Log each invoice detail
    if (data.data && Array.isArray(data.data)) {
      console.log('📊 Invoice Count:', data.data.length);
      data.data.forEach((invoice: any, index: number) => {
        console.log(`📄 Invoice ${index + 1}:`, {
          name: invoice.name,
          customer: invoice.customer,
          delivery_note: invoice.delivery_note,
          items_count: invoice.items ? invoice.items.length : 0,
          items_with_dn: invoice.items ? invoice.items.filter((item: any) => item.delivery_note).length : 0
        });
        
        // Log items if exist
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item: any, itemIndex: number) => {
            if (item.delivery_note) {
              console.log(`  📦 Item ${itemIndex + 1} DN:`, item.delivery_note);
            }
          });
        }
      });
    }

    if (response.ok) {
      // Add backward compatibility - Requirements 2.8, 14.1, 14.5
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
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch invoices' },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.toString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE SALES INVOICE - ERPNEXT REST API ===');
    
    const invoiceData: CreateSalesInvoiceRequest = await request.json();
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    console.log('API Config:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      apiSecret: apiSecret ? 'SET' : 'NOT SET',
      baseUrl
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
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
    // If both are provided, ERPNext will use discount_amount as primary
    console.log('Discount validation passed:', {
      discount_percentage: invoiceData.discount_percentage,
      discount_amount: invoiceData.discount_amount,
      subtotal
    });

    // Validate tax template if provided - Requirements 5.3, 5.7
    if (invoiceData.taxes_and_charges) {
      try {
        // Fetch tax template to validate it exists and is active
        const taxTemplateUrl = `${baseUrl}/api/resource/Sales Taxes and Charges Template/${encodeURIComponent(invoiceData.taxes_and_charges)}`;
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

    // Create Sales Invoice using ERPNext REST API
    const erpNextUrl = `${baseUrl}/api/resource/Sales Invoice`;
    
    console.log('ERPNext REST API URL:', erpNextUrl);

    // Prepare payload with proper ERPNext structure using VALID data
    const payload: any = {
      company: invoiceData.company,
      customer: invoiceData.customer,
      customer_name: invoiceData.customer_name,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date || invoiceData.posting_date,
      items: invoiceData.items || [],
      currency: invoiceData.currency || 'IDR',
      // Use valid Price List
      selling_price_list: invoiceData.selling_price_list || 'Standard Jual',
      price_list_currency: invoiceData.price_list_currency || 'IDR',
      plc_conversion_rate: invoiceData.plc_conversion_rate || 1,
      // Use valid Territory
      territory: invoiceData.territory || 'Semua Wilayah',
      // Skip tax_category to use system default (Tax Category is empty)
      status: invoiceData.status || 'Draft',
      docstatus: invoiceData.docstatus || 0,
      // Custom fields
      custom_total_komisi_sales: invoiceData.custom_total_komisi_sales || 0,
      custom_notes_si: invoiceData.custom_notes_si || '',
      // Write-off amount to prevent TypeError (must be 0, not null)
      write_off_amount: 0,
      base_write_off_amount: 0,
      // Discount fields - Requirements 2.1, 2.2
      discount_amount: invoiceData.discount_amount || 0,
      discount_percentage: invoiceData.discount_percentage || 0,
      additional_discount_percentage: invoiceData.additional_discount_percentage || 0,
      apply_discount_on: invoiceData.apply_discount_on || 'Net Total'
    };

    // Add optional fields if provided
    if (invoiceData.sales_team && invoiceData.sales_team.length > 0) {
      payload.sales_team = invoiceData.sales_team;
    }

    if (invoiceData.payment_terms_template) {
      payload.payment_terms_template = invoiceData.payment_terms_template;
    }

    // Add tax fields - Requirement 2.3
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

    console.log('Final Payload with sales_team:', JSON.stringify(payload, null, 2));
    console.log('Sales Team in payload:', payload.sales_team);

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
        message: 'Failed to create invoice in ERPNext',
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
      message: 'Invoice created successfully in ERPNext',
      data: data
    });

  } catch (error: any) {
    console.error('Create Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create invoice',
      error: error.toString()
    }, { status: 500 });
  }
}
