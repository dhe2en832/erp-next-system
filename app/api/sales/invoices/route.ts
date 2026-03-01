import { NextRequest, NextResponse } from 'next/server';
import { CreateSalesInvoiceRequest } from '@/types/sales-invoice';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // console.log('=== GET SALES INVOICES - SIMPLE COOKIE AUTH ===');
    
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
    // console.log('🔍 Invoice Response Status:', response.status);
    // console.log('📋 Complete Invoice Response Data:', JSON.stringify(data, null, 2));
    
    // Log each invoice detail
    if (data.data && Array.isArray(data.data)) {
      // console.log('📊 Invoice Count:', data.data.length);
      data.data.forEach((invoice: any, index: number) => {
        // console.log(`📄 Invoice ${index + 1}:`, {
        //   name: invoice.name,
        //   customer: invoice.customer,
        //   delivery_note: invoice.delivery_note,
        //   items_count: invoice.items ? invoice.items.length : 0,
        //   items_with_dn: invoice.items ? invoice.items.filter((item: any) => item.delivery_note).length : 0
        // });
        
        // Log items if exist
        // if (invoice.items && invoice.items.length > 0) {
        //   invoice.items.forEach((item: any, itemIndex: number) => {
        //     if (item.delivery_note) {
        //       console.log(`  📦 Item ${itemIndex + 1} DN:`, item.delivery_note);
        //     }
        //   });
        // }

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
    // console.log('=== CREATE SALES INVOICE - ERPNEXT REST API ===');
    
    const invoiceData: CreateSalesInvoiceRequest = await request.json();
    // console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));

    // Get API credentials from environment variables
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

    // console.log('API Config:', {
    //   apiKey: apiKey ? 'SET' : 'NOT SET',
    //   apiSecret: apiSecret ? 'SET' : 'NOT SET',
    //   baseUrl
    // });

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
    // console.log('Discount validation passed:', {
    //   discount_percentage: invoiceData.discount_percentage,
    //   discount_amount: invoiceData.discount_amount,
    //   subtotal
    // });

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

        // console.log('Tax template validation passed:', invoiceData.taxes_and_charges);
      } catch (error: any) {
        console.error('Tax template validation error:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to validate tax template',
          error: error.toString()
        }, { status: 400 });
      }
    }

    // Create Sales Invoice using frappe.client.insert
    const erpNextUrl = `${baseUrl}/api/method/frappe.client.insert`;
    
    // console.log('Using frappe.client.insert to create Sales Invoice');

    // Prepare payload with proper ERPNext structure
    const payload: any = {
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
      items: await Promise.all((invoiceData.items || []).map(async (item: any, index: number) => {
        let hppSnapshot = 0;
        let financialCostPercent = 0;
        
        // Get HPP from Delivery Note Item if available
        if (item.dn_detail) {
          try {
            const dnItemUrl = `${baseUrl}/api/resource/Delivery Note Item/${encodeURIComponent(item.dn_detail)}`;
            const dnItemResponse = await fetch(dnItemUrl, {
              method: 'GET',
              headers: {
                'Authorization': `token ${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (dnItemResponse.ok) {
              const dnItemData = await dnItemResponse.json();
              hppSnapshot = dnItemData.data?.custom_hpp_snapshot || dnItemData.data?.incoming_rate || 0;
              financialCostPercent = dnItemData.data?.custom_financial_cost_percent || 0;
              // console.log(`Item ${item.item_code}: HPP=${hppSnapshot}, FinCost=${financialCostPercent} from DN Item`);
            }
          } catch (error) {
            console.error(`Error fetching DN item ${item.dn_detail}:`, error);
          }
        }
        
        // Fallback: Get Financial Cost from Item master if not from DN
        if (financialCostPercent === 0) {
          try {
            const itemUrl = `${baseUrl}/api/resource/Item/${encodeURIComponent(item.item_code)}`;
            const itemResponse = await fetch(itemUrl, {
              method: 'GET',
              headers: {
                'Authorization': `token ${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              financialCostPercent = itemData.data?.custom_financial_cost_percent || 0;
              // console.log(`Item ${item.item_code}: FinCost=${financialCostPercent} from Item master`);
            }
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
          sales_order: item.sales_order || undefined,
          so_detail: item.so_detail || undefined,
          custom_komisi_sales: item.custom_komisi_sales || 0,
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
    // If user selects tax template, send both template name AND calculated tax rows
    if (invoiceData.taxes_and_charges) {
      payload.taxes_and_charges = invoiceData.taxes_and_charges;
      // console.log('Tax template selected by user:', invoiceData.taxes_and_charges);
      
      // Send pre-calculated tax rows from frontend
      if (invoiceData.taxes && invoiceData.taxes.length > 0) {
        payload.taxes = invoiceData.taxes;
        // console.log('Tax rows provided:', invoiceData.taxes.length, 'rows');
      }
    } else {
      console.log('No tax template selected - invoice without tax');
    }

    // console.log('Payload for frappe.client.insert:', JSON.stringify(payload, null, 2));

    const response = await fetch(erpNextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc: payload
      })
    });

    // console.log('ERPNext Response Status:', response.status);

    const responseText = await response.text();
    // console.log('ERPNext Response Text:', responseText);

    if (!response.ok) {
      console.error('ERPNext API Error:', responseText);
      
      // Use the error handler utility to extract proper error message
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
      
      const errorResult = handleERPNextAPIError(response, data, JSON.stringify(payload));
      
      return errorResult;
    }

    let data;
    try {
      data = JSON.parse(responseText);
      // console.log('ERPNext Success Response:', data);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON response from ERPNext',
        error: responseText
      }, { status: 500 });
    }

    // CRITICAL FIX: Force ERPNext to recognize document as "saved"
    // After creating via API, ERPNext's form cache is not updated
    // This causes "Not Saved" status which blocks Credit Note creation
    // Solution: Fetch the latest document, clean __unsaved flags, and save to update cache
    const invoiceName = data.message?.name || data.data?.name;
    if (invoiceName) {
      try {
        // console.log('Forcing document save to update ERPNext cache for:', invoiceName);
        
        // Step 1: Fetch the latest version of the document
        const getUrl = `${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}`;
        const getResponse = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
        });

        if (!getResponse.ok) {
          console.warn('⚠️ Failed to fetch document for cache update');
          throw new Error('Failed to fetch document');
        }

        const docData = await getResponse.json();
        const latestDoc = docData.data;

        // Step 2: Clean __unsaved flags from child tables
        // This is critical - frappe.client.insert marks child tables as __unsaved
        if (latestDoc.items && Array.isArray(latestDoc.items)) {
          latestDoc.items = latestDoc.items.map((item: any) => {
            const { __unsaved, ...cleanItem } = item;
            return cleanItem;
          });
        }
        if (latestDoc.sales_team && Array.isArray(latestDoc.sales_team)) {
          latestDoc.sales_team = latestDoc.sales_team.map((team: any) => {
            const { __unsaved, ...cleanTeam } = team;
            return cleanTeam;
          });
        }
        if (latestDoc.taxes && Array.isArray(latestDoc.taxes)) {
          latestDoc.taxes = latestDoc.taxes.map((tax: any) => {
            const { __unsaved, ...cleanTax } = tax;
            return cleanTax;
          });
        }
        if (latestDoc.payment_schedule && Array.isArray(latestDoc.payment_schedule)) {
          latestDoc.payment_schedule = latestDoc.payment_schedule.map((schedule: any) => {
            const { __unsaved, ...cleanSchedule } = schedule;
            return cleanSchedule;
          });
        }

        // Step 3: Save the cleaned document to update cache
        const saveUrl = `${baseUrl}/api/method/frappe.client.save`;
        const saveResponse = await fetch(saveUrl, {
          method: 'POST',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doc: latestDoc
          })
        });

        if (saveResponse.ok) {
          console.log('✅ Document cache updated successfully for:', invoiceName);
        } else {
          const errorText = await saveResponse.text();
          console.warn('⚠️ Failed to update cache, but document is saved in database:', errorText);
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache update failed, but document is saved:', cacheError);
        // Don't fail the request - document is already saved
      }
    } else {
      console.warn('⚠️ No invoice name found in response, skipping cache update');
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
