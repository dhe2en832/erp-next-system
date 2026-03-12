import { NextRequest, NextResponse } from 'next/server';
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
    
    // ✅ BACKWARD COMPATIBLE: Support both old & new param names
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit_page_length') || searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
const orderBy = searchParams.get('order_by') || 'modified desc';
    const fieldsParam = searchParams.get('fields');

    // ✅ Dynamic fields with fallback to default
    const defaultFields = [
      'name', 'item_code', 'item_name', 'description', 'item_group', 
      'stock_uom', 'opening_stock', 'last_purchase_rate', 'valuation_rate',
      'standard_rate', 'creation', 'modified', 'custom_financial_cost_percent'
    ];
    const fields = fieldsParam ? fieldsParam.split(',') : defaultFields;
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // ✅ STEP 1: Get total count using frappe.client.get_count
    let totalCount = 0;
    try {
      const countFilters = filters ? JSON.parse(filters) : [];
      
      // console.log('🔢 Fetching total count with filters:', JSON.stringify(countFilters));
      
      totalCount = await client.getCount('Item', {
        filters: countFilters
      });
      
      // console.log('📊 Total count from ERPNext:', totalCount);
    } catch (error) {
      console.log('⚠️ Failed to get total count:', error);
    }

    // ✅ STEP 2: Get actual data with fields
    const queryFilters: (string | number | boolean | null | string[])[][] = filters ? JSON.parse(filters) : [];
    
    const items = await client.getList<Record<string, unknown>>('Item', {
      fields,
      filters: queryFilters,
      limit_page_length: parseInt(limit),
      start: parseInt(start),
      order_by: orderBy
    });
    
    // Log raw ERPNext response (for debugging if needed)
    // console.log('📦 Raw ERPNext Response:', JSON.stringify({
    //   status: response.status,
    //   data_length: items?.length,
    //   total_count: totalCount,
    //   first_item: items?.[0]?.item_code,
    //   last_item: items?.[items?.length - 1]?.item_code,
    //   start_param: start,
    // }, null, 2));
    
    // console.log('✅ Items API Response:', { 
    //   count: items?.length,
    //   total_count: totalCount
    // });

    // Use total_count from first request, or fallback to data length
    const finalTotalCount = totalCount || items?.length || 0;
    
    // console.log('✅ Final total count:', finalTotalCount);
    
    return NextResponse.json({
      success: true,
      data: items || [],
      total_records: finalTotalCount,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST dan PUT tetap seperti kode asli Anda (tidak diubah)
// ... (paste kode POST/PUT Anda di sini)

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const itemData = await request.json();

    const cookies = request.cookies;
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && cookies.get(siteSpecificCookie)?.value) || cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get company from request or cookies
    let company = itemData.company;
    if (!company) {
      const companyCookie = cookies.get('selected_company')?.value;
      if (companyCookie) {
        company = companyCookie;
      }
    }

    // Generate item code automatically
    const generateItemCode = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `STO-${year}${month}${day}-${random}`;
    };

    // For new items, generate item code automatically
    const { item_code, ...createData } = itemData;
    
    // Generate new item code
    createData.item_code = item_code || generateItemCode();
    
    // Remove system-managed fields for create
    const validCreateData: Record<string, unknown> = {};
    const allowedFields = [
      'item_code', 'item_name', 'description', 'item_group', 'stock_uom', 
      'opening_stock', 'brand', 'standard_rate', 'last_purchase_rate', 'valuation_method',
      'custom_financial_cost_percent'
    ];
    
    Object.keys(createData).forEach(key => {
      if (allowedFields.includes(key) && (createData as Record<string, unknown>)[key] !== undefined) {
        validCreateData[key] = (createData as Record<string, unknown>)[key];
      }
    });

    // Add valuation method for new items
    validCreateData.valuation_method = 'Moving Average';

    // console.log('Creating item:', {
    //   originalData: itemData,
    //   filteredData: validCreateData,
    //   company
    // });

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    interface ItemInsertResult {
      item_code?: string;
      name?: string;
      [key: string]: unknown;
    }
    const result = await client.insert<ItemInsertResult>('Item', validCreateData);
    
    // console.log('Create Item Response:', {
    //   createData: validCreateData,
    //   erpNextResponse: result
    // });

    // Update Item Price records if price fields provided
    const newItemCode = result?.item_code || result?.name;
    
    if (newItemCode) {
      const priceUpdates = [];
      
      if ((createData as Record<string, unknown>).last_purchase_rate !== undefined) {
        priceUpdates.push({
          price_list: 'Standar Pembelian',
          price_list_rate: (createData as Record<string, unknown>).last_purchase_rate
        });
      }
      
      if ((createData as Record<string, unknown>).standard_rate !== undefined) {
        priceUpdates.push({
          price_list: 'Standard Jual', 
          price_list_rate: (createData as Record<string, unknown>).standard_rate
        });
      }

      // Update Item Price records for new item
      for (const priceUpdate of priceUpdates) {
        try {
          // console.log('Creating Item Price for new item:', priceUpdate);
          
          const pricePayload: Record<string, unknown> = {
            item_code: newItemCode,
            price_list: priceUpdate.price_list,
            price_list_rate: priceUpdate.price_list_rate
          };
          
          // Add custom_company if company is available
          if (company) {
            pricePayload.custom_company = company;
          }
          
          await client.insert<Record<string, unknown>>('Item Price', pricePayload);
          
          // console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
        } catch {
          // console.log(`Error creating ${priceUpdate.price_list} price:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Item created successfully'
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/inventory/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const itemData = await request.json();
    const { item_code, ...updateData } = itemData;

    if (!item_code) {
      return NextResponse.json(
        { success: false, message: 'Item code is required for update' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && cookies.get(siteSpecificCookie)?.value) || cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get company from request or cookies
    let company = itemData.company;
    if (!company) {
      const companyCookie = cookies.get('selected_company')?.value;
      if (companyCookie) {
        company = companyCookie;
      }
    }

    // Filter only valid updateable fields (exclude system-managed price fields)
    const validUpdateData: Record<string, unknown> = {};
    const allowedFields = [
      'item_name', 'description', 'item_group', 'stock_uom', 
      'opening_stock', 'brand', 'custom_financial_cost_percent'
      // Removed: 'standard_rate', 'last_purchase_rate' (system-managed)
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && (updateData as Record<string, unknown>)[key] !== undefined) {
        validUpdateData[key] = (updateData as Record<string, unknown>)[key];
      }
    });

    // console.log('Updating item:', {
    //   item_code,
    //   originalData: updateData,
    //   filteredData: validUpdateData,
    //   company
    // });

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Update master item
    const result = await client.update<Record<string, unknown>>('Item', item_code, validUpdateData);
    
    // console.log('Update Item Response:', {
    //   item_code,
    //   updateData: validUpdateData,
    //   erpNextResponse: result
    // });

    // Update Item Price records if price fields changed
    const priceUpdates = [];
    
    if ((updateData as Record<string, unknown>).last_purchase_rate !== undefined) {
      priceUpdates.push({
        price_list: 'Standar Pembelian',
        price_list_rate: (updateData as Record<string, unknown>).last_purchase_rate
      });
    }
    
    if ((updateData as Record<string, unknown>).standard_rate !== undefined) {
      priceUpdates.push({
        price_list: 'Standard Jual', 
        price_list_rate: (updateData as Record<string, unknown>).standard_rate
      });
    }

    // Update Item Price records
    for (const priceUpdate of priceUpdates) {
      try {
        // console.log('Updating Item Price:', priceUpdate);
        
        // Build filters for checking existing Item Price
        const filters: (string | number | boolean | null | string[])[][] = [
          ["item_code", "=", item_code],
          ["price_list", "=", priceUpdate.price_list]
        ];
        
        // Add company filter if available
        if (company) {
          filters.push(["custom_company", "=", company]);
        }
        
        interface ItemPriceSummary {
          name: string;
        }
        // Check if Item Price exists
        const existingPrices = await client.getList<ItemPriceSummary>('Item Price', {
          filters,
          fields: ['name']
        });

        if (existingPrices && existingPrices.length > 0) {
          // Update existing Item Price
          const existingPrice = existingPrices[0];
          const updatePricePayload: Record<string, unknown> = {
            price_list_rate: priceUpdate.price_list_rate
          };
          
          // Update custom_company if provided
          if (company) {
            updatePricePayload.custom_company = company;
          }
          
          await client.update<Record<string, unknown>>('Item Price', existingPrice.name, updatePricePayload);
          
          // console.log(`Updated ${priceUpdate.price_list} price to ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
        } else {
          // Create new Item Price
          const createPricePayload: Record<string, unknown> = {
            item_code: item_code,
            price_list: priceUpdate.price_list,
            price_list_rate: priceUpdate.price_list_rate
          };
          
          // Add custom_company if available
          if (company) {
            createPricePayload.custom_company = company;
          }
          
          await client.insert<Record<string, unknown>>('Item Price', createPricePayload);
          
          // console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
        }
      } catch {
        // console.log(`Error updating ${priceUpdate.price_list} price:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Item updated successfully'
    });

  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/inventory/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
