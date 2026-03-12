import { NextRequest, NextResponse } from 'next/server';
import { CreateSalesInvoiceRequest, SalesInvoice, InvoiceItem } from '@/types/sales-invoice';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';
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
    const order_by = searchParams.get('order_by') || 'creation desc, posting_date desc';
    const search = searchParams.get('search');
    const documentNumber = searchParams.get('documentNumber');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const start = parseInt(searchParams.get('start') || '0');

    // Build filters
    const filtersArray: (string | number)[][] = [];

    // Always add company filter if provided
    if (company) {
      filtersArray.push(['company', '=', company]);
    }

    // Add search filter
    if (search) {
      filtersArray.push(['customer_name', 'like', `%${search}%`]);
    }

    // Add document number filter
    if (documentNumber) {
      filtersArray.push(['name', 'like', `%${documentNumber}%`]);
    }

    // Add status filter
    if (status) {
      filtersArray.push(['status', '=', status]);
    }

    // Add date filters
    if (fromDate) {
      filtersArray.push(['posting_date', '>=', fromDate]);
    }

    if (toDate) {
      filtersArray.push(['posting_date', '<=', toDate]);
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch invoices using client method
    const invoices = await client.getList('Sales Invoice', {
      fields: [
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'due_date',
        'grand_total',
        'status',
        'docstatus',
        'custom_total_komisi_sales',
        'creation',
        'total',
        'net_total',
        'taxes_and_charges',
        'total_taxes_and_charges',
        'outstanding_amount',
        'discount_amount',
        'additional_discount_percentage'
      ],
      filters: filtersArray,
      limit_page_length: limit,
      start,
      order_by
    });

    // Add backward compatibility - Requirements 2.8, 14.1, 14.5
    // For old invoices without discount/tax, ensure default values
    const invoicesWithDefaults = (invoices as SalesInvoice[]).map((invoice) => ({
      ...invoice,
      discount_amount: invoice.discount_amount ?? 0,
      discount_percentage: invoice.additional_discount_percentage ?? 0,
      total_taxes_and_charges: invoice.total_taxes_and_charges ?? 0,
      taxes: invoice.taxes ?? []
    }));

    const totalRecords = await client.getCount('Sales Invoice', { filters: filtersArray });

    return NextResponse.json({
      success: true,
      data: invoicesWithDefaults,
      total_records: totalRecords,
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/invoices', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const invoiceData: CreateSalesInvoiceRequest = await request.json();

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Validate tax template if provided - Requirements 5.3, 5.7
    if (invoiceData.taxes_and_charges) {
      try {
        // Fetch tax template to validate it exists and is active
        const taxTemplateData = await client.get('Sales Taxes and Charges Template', invoiceData.taxes_and_charges) as Record<string, unknown>;

        // Check if template is disabled
        if ((taxTemplateData as Record<string, unknown>).disabled === 1) {
          return NextResponse.json({
            success: false,
            message: `Tax template '${invoiceData.taxes_and_charges}' is disabled`
          }, { status: 400 });
        }

        // Validate account_head in tax template exists in COA
        const templateData = taxTemplateData as Record<string, unknown>;
        if (templateData.taxes && Array.isArray(templateData.taxes)) {
          for (const taxRow of templateData.taxes as Array<Record<string, unknown>>) {
            const accountHead = taxRow.account_head as string | undefined;
            if (accountHead) {
              try {
                await client.get('Account', accountHead);
              } catch {
                return NextResponse.json({
                  success: false,
                  message: `Account '${accountHead}' not found in Chart of Accounts`
                }, { status: 400 });
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error('Tax template validation error:', error);
        return NextResponse.json({
          success: false,
          message: `Tax template '${invoiceData.taxes_and_charges}' not found`,
          error: error instanceof Error ? error.message : String(error)
        }, { status: 400 });
      }
    }

    // Prepare payload with proper ERPNext structure
    const payload: Record<string, unknown> = {
      doctype: 'Sales Invoice',
      company: invoiceData.company,
      customer: invoiceData.customer,
      posting_date: invoiceData.posting_date,
      due_date: invoiceData.due_date || invoiceData.posting_date,
      currency: invoiceData.currency || 'IDR',
      selling_price_list: invoiceData.selling_price_list || 'Standard Jual',
      price_list_currency: invoiceData.price_list_currency || 'IDR',
      plc_conversion_rate: invoiceData.plc_conversion_rate || 1,
      status: 'Draft',
      docstatus: 0,
      custom_total_komisi_sales: invoiceData.custom_total_komisi_sales || 0,
      custom_notes_si: invoiceData.custom_notes_si || '',
      // Discount fields
      discount_amount: invoiceData.discount_amount || 0,
      additional_discount_percentage: invoiceData.additional_discount_percentage || 0,
      apply_discount_on: invoiceData.apply_discount_on || 'Net Total',
      // Items - CRITICAL: Pre-populate custom_hpp_snapshot and custom_financial_cost_percent
      items: await Promise.all(((invoiceData.items || []) as Array<InvoiceItem & Record<string, unknown>>).map(async (item) => {
        let hppSnapshot = 0;
        let financialCostPercent = 0;

        // Get HPP from Delivery Note Item if available
        if (item.dn_detail) {
          try {
            const dnItemData = await client.get('Delivery Note Item', item.dn_detail) as Record<string, unknown>;
            hppSnapshot = (dnItemData.custom_hpp_snapshot as number) || (dnItemData.incoming_rate as number) || 0;
            financialCostPercent = (dnItemData.custom_financial_cost_percent as number) || 0;
          } catch (error) {
            console.error(`Error fetching DN item ${item.dn_detail}:`, error);
          }
        }

        // Fallback: Get Financial Cost from Item master if not from DN
        if (financialCostPercent === 0) {
          try {
            const itemData = await client.get('Item', item.item_code) as Record<string, unknown>;
            financialCostPercent = (itemData.custom_financial_cost_percent as number) || 0;
          } catch (error) {
            console.error(`Error fetching Item ${item.item_code}:`, error);
          }
        }

        return {
          item_code: item.item_code,
          qty: item.qty,
          rate: item.rate,
          warehouse: item.warehouse,
          delivery_note: item.delivery_note || undefined,
          dn_detail: item.dn_detail || undefined,
          sales_order: (item.sales_order as string) || undefined,
          so_detail: (item.so_detail as string) || undefined,
          custom_komisi_sales: (item.custom_komisi_sales as number) || 0,
          // CRITICAL FIX: Pre-populate these fields to prevent "Not Saved" status
          custom_hpp_snapshot: hppSnapshot,
          custom_financial_cost_percent: financialCostPercent,
        };
      }))
    };

    // Add optional fields if provided
    if (invoiceData.sales_team && invoiceData.sales_team.length > 0) {
      payload.sales_team = invoiceData.sales_team;
    }

    if (invoiceData.payment_terms_template) {
      payload.payment_terms_template = invoiceData.payment_terms_template;
    }

    // Tax handling: OPTIONAL - only if user selects tax template
    if (invoiceData.taxes_and_charges) {
      payload.taxes_and_charges = invoiceData.taxes_and_charges;

      // Send pre-calculated tax rows from frontend
      if (invoiceData.taxes && invoiceData.taxes.length > 0) {
        payload.taxes = invoiceData.taxes;
      }
    }

    // Create Sales Invoice using frappe.client.insert
    interface InsertResult {
      name?: string;
      message?: { name?: string };
      data?: { name?: string };
      [key: string]: unknown;
    }
    const result = await client.call<InsertResult>('frappe.client.insert', { doc: payload });

    // CRITICAL FIX: Force ERPNext to recognize document as "saved"
    const resultData = result as Record<string, unknown>;
    const invoiceName = (resultData.message as Record<string, unknown>)?.name as string || (resultData.data as Record<string, unknown>)?.name as string || resultData.name as string;
    if (invoiceName) {
      try {
        // Fetch the latest version of the document
        const latestDoc = await client.get('Sales Invoice', invoiceName) as Record<string, unknown>;

        // Clean __unsaved flags from child tables
        if ((latestDoc.items as Array<Record<string, unknown>> | undefined) && Array.isArray(latestDoc.items)) {
          latestDoc.items = (latestDoc.items as Array<Record<string, unknown>>).map((item: Record<string, unknown>) => {
            const { __unsaved, ...cleanItem } = item;
            void __unsaved; // Explicitly ignore
            return cleanItem;
          });
        }
        if ((latestDoc.sales_team as Array<Record<string, unknown>> | undefined) && Array.isArray(latestDoc.sales_team)) {
          latestDoc.sales_team = (latestDoc.sales_team as Array<Record<string, unknown>>).map((team: Record<string, unknown>) => {
            const { __unsaved, ...cleanTeam } = team;
            void __unsaved; // Explicitly ignore
            return cleanTeam;
          });
        }
        if ((latestDoc.taxes as Array<Record<string, unknown>> | undefined) && Array.isArray(latestDoc.taxes)) {
          latestDoc.taxes = (latestDoc.taxes as Array<Record<string, unknown>>).map((tax: Record<string, unknown>) => {
            const { __unsaved, ...cleanTax } = tax;
            void __unsaved; // Explicitly ignore
            return cleanTax;
          });
        }
        if ((latestDoc.payment_schedule as Array<Record<string, unknown>> | undefined) && Array.isArray(latestDoc.payment_schedule)) {
          latestDoc.payment_schedule = (latestDoc.payment_schedule as Array<Record<string, unknown>>).map((schedule: Record<string, unknown>) => {
            const { __unsaved, ...cleanSchedule } = schedule;
            void __unsaved; // Explicitly ignore
            return cleanSchedule;
          });
        }

        // Save the cleaned document to update cache
        await client.call('frappe.client.save', { doc: latestDoc });
        console.log('✅ Document cache updated successfully for:', invoiceName);
      } catch (cacheError) {
        console.warn('⚠️ Cache update failed, but document is saved:', cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully in ERPNext',
      data: result
    });

  } catch (error: unknown) {
    logSiteError(error, 'POST /api/sales/invoices', siteId);
    console.error('Create Invoice Error:', error);

    // Try to use the error handler utility
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResult = handleERPNextAPIError(
      { ok: false, status: 500 } as Response,
      { message: errorMessage },
      ''
    );

    return errorResult;
  }
}
