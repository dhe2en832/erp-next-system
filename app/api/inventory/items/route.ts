import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ✅ BACKWARD COMPATIBLE: Support both old & new param names
    const filters = searchParams.get('filters');
    const company = searchParams.get('company');
    const limit = searchParams.get('limit_page_length') || searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';
    const orderBy = searchParams.get('order_by') || 'modified desc';
    const fieldsParam = searchParams.get('fields');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // ✅ Dynamic fields with fallback to default
    const defaultFields = [
      'name', 'item_code', 'item_name', 'description', 'item_group', 
      'stock_uom', 'opening_stock', 'last_purchase_rate', 'valuation_rate',
      'standard_rate', 'creation', 'modified', 'custom_financial_cost_percent'
    ];
    const fields = fieldsParam ? fieldsParam.split(',') : defaultFields;
    
    // ✅ Minimal headers to avoid 417 Expectation Failed
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    }

    // ✅ STEP 1: Get total count using frappe.client.get_count
    let totalCount = 0;
    try {
      const countUrl = `${ERPNEXT_API_URL}/api/method/frappe.client.get_count`;
      const countBody = {
        doctype: 'Item',
        filters: filters ? JSON.parse(filters) : []
      };
      
      // console.log('🔢 Fetching total count with filters:', JSON.stringify(countBody.filters));
      
      const countResponse = await fetch(countUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(countBody),
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        totalCount = countData.message || 0;
        console.log('📊 Total count from ERPNext:', totalCount);
      } else {
        console.log('⚠️ Count request failed:', countResponse.status);
      }
    } catch (error) {
      console.log('⚠️ Failed to get total count:', error);
    }

    // ✅ STEP 2: Get actual data with fields
    const queryParams = new URLSearchParams();
    queryParams.append('fields', JSON.stringify(fields));
    queryParams.append('limit_page_length', limit);
    queryParams.append('limit_start', start); // ERPNext uses limit_start for pagination offset
    queryParams.append('order_by', orderBy);
    
    if (filters) {
      queryParams.append('filters', filters);
    }

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Item?${queryParams.toString()}`;
    // console.log('🔍 Items ERPNext URL:', erpNextUrl);

    // ✅ GET request without body
    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    // Log raw ERPNext response (for debugging if needed)
    // console.log('📦 Raw ERPNext Response:', JSON.stringify({
    //   status: response.status,
    //   data_length: data.data?.length,
    //   total_count: data.total_count,
    //   has_total_count: 'total_count' in data,
    //   response_keys: Object.keys(data),
    //   first_item: data.data?.[0]?.item_code,
    //   last_item: data.data?.[data.data?.length - 1]?.item_code,
    //   start_param: start,
    // }, null, 2));
    
    console.log('✅ Items API Response:', { 
      status: response.status, 
      count: data.data?.length,
      total_count: data.total_count,
      message: data.message
    });

    if (response.ok) {
      // Use total_count from first request, or from data response, or fallback to data length
      const finalTotalCount = totalCount || data.total_count || data.data?.length || 0;
      
      console.log('✅ Final total count:', finalTotalCount);
      
      return NextResponse.json({
        success: true,
        data: data.data || [],
        total_records: finalTotalCount,
      });
    } else {
      console.error('❌ ERPNext Error:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch items' },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('❌ Items API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST dan PUT tetap seperti kode asli Anda (tidak diubah)
// ... (paste kode POST/PUT Anda di sini)

export async function POST(request: NextRequest) {
  try {
    const itemData = await request.json();

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

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
    const validCreateData: any = {};
    const allowedFields = [
      'item_code', 'item_name', 'description', 'item_group', 'stock_uom', 
      'opening_stock', 'brand', 'standard_rate', 'last_purchase_rate', 'valuation_method',
      'custom_financial_cost_percent'
    ];
    
    Object.keys(createData).forEach(key => {
      if (allowedFields.includes(key) && createData[key] !== undefined) {
        validCreateData[key] = createData[key];
      }
    });

    // Add valuation method for new items
    validCreateData.valuation_method = 'Moving Average';

    // console.log('Creating item:', {
    //   originalData: itemData,
    //   filteredData: validCreateData,
    //   company
    // });

    // Try API Key authentication for POST (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for POST requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      // console.log('Using API Key authentication for POST');
    } else {
      // Fallback to session
      headers['Cookie'] = `sid=${sid}`;
      // console.log('Using session authentication for POST');
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item`, {
      method: 'POST',
      headers,
      body: JSON.stringify(validCreateData),
    });

    const data = await response.json();
    
    // console.log('Create Item Response:', {
    //   status: response.status,
    //   createData: validCreateData,
    //   erpNextResponse: data
    // });

    if (response.ok) {
      // Update Item Price records if price fields provided
      const newItemCode = data.data?.item_code || data.data?.name;
      
      if (newItemCode) {
        const priceUpdates = [];
        
        if (createData.last_purchase_rate !== undefined) {
          priceUpdates.push({
            price_list: 'Standar Pembelian',
            price_list_rate: createData.last_purchase_rate
          });
        }
        
        if (createData.standard_rate !== undefined) {
          priceUpdates.push({
            price_list: 'Standard Jual', 
            price_list_rate: createData.standard_rate
          });
        }

        // Update Item Price records for new item
        for (const priceUpdate of priceUpdates) {
          try {
            // console.log('Creating Item Price for new item:', priceUpdate);
            
            const pricePayload: any = {
              item_code: newItemCode,
              price_list: priceUpdate.price_list,
              price_list_rate: priceUpdate.price_list_rate
            };
            
            // Add custom_company if company is available
            if (company) {
              pricePayload.custom_company = company;
            }
            
            const createPriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price`, {
              method: 'POST',
              headers,
              body: JSON.stringify(pricePayload),
            });
            
            if (createPriceResponse.ok) {
              // console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
            } else {
              const errorData = await createPriceResponse.json();
              // console.log(`Failed to create ${priceUpdate.price_list} price:`, errorData);
            }
          } catch (error) {
            // console.log(`Error creating ${priceUpdate.price_list} price:`, error);
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: data.data,
        message: 'Item created successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create item' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Create Item Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const sid = cookies.get('sid')?.value;

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
    const validUpdateData: any = {};
    const allowedFields = [
      'item_name', 'description', 'item_group', 'stock_uom', 
      'opening_stock', 'brand', 'custom_financial_cost_percent'
      // Removed: 'standard_rate', 'last_purchase_rate' (system-managed)
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        validUpdateData[key] = updateData[key];
      }
    });

    // console.log('Updating item:', {
    //   item_code,
    //   originalData: updateData,
    //   filteredData: validUpdateData,
    //   company
    // });

    // Try API Key authentication for PUT (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for PUT requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      // console.log('Using API Key authentication for PUT');
    } else if (sid) {
      // Fallback to session with CSRF token
      // console.log('Getting CSRF token...');
      const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.auth.get_csrf_token`, {
        method: 'GET',
        headers: {
          'Cookie': `sid=${sid}`,
        },
      });

      // console.log('CSRF Response status:', csrfResponse.status);
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token || '';
        // console.log('CSRF Token obtained:', csrfToken);
      } else {
        // console.log('CSRF Token failed:', csrfResponse.status);
        const csrfError = await csrfResponse.text();
        // console.log('CSRF Error body:', csrfError);
      }

      headers['Cookie'] = `sid=${sid}`;
      
      if (csrfToken) {
        headers['X-Frappe-CSRF-Token'] = csrfToken;
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // Update master item
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item/${encodeURIComponent(item_code)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(validUpdateData),
    });

    const data = await response.json();
    
    // console.log('Update Item Response:', {
    //   status: response.status,
    //   item_code,
    //   updateData: validUpdateData,
    //   erpNextResponse: data
    // });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to update item' },
        { status: response.status }
      );
    }

    // Update Item Price records if price fields changed
    const priceUpdates = [];
    
    if (updateData.last_purchase_rate !== undefined) {
      priceUpdates.push({
        price_list: 'Standar Pembelian',
        price_list_rate: updateData.last_purchase_rate
      });
    }
    
    if (updateData.standard_rate !== undefined) {
      priceUpdates.push({
        price_list: 'Standard Jual', 
        price_list_rate: updateData.standard_rate
      });
    }

    // Update Item Price records
    for (const priceUpdate of priceUpdates) {
      try {
        // console.log('Updating Item Price:', priceUpdate);
        
        // Build filters for checking existing Item Price
        const filters: any[] = [
          ["item_code", "=", item_code],
          ["price_list", "=", priceUpdate.price_list]
        ];
        
        // Add company filter if available
        if (company) {
          filters.push(["custom_company", "=", company]);
        }
        
        // Check if Item Price exists
        const checkResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price?filters=${JSON.stringify(filters)}`, {
          method: 'GET',
          headers,
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (checkData.data && checkData.data.length > 0) {
            // Update existing Item Price
            const existingPrice = checkData.data[0];
            const updatePricePayload: any = {
              price_list_rate: priceUpdate.price_list_rate
            };
            
            // Update custom_company if provided
            if (company) {
              updatePricePayload.custom_company = company;
            }
            
            const updatePriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price/${existingPrice.name}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(updatePricePayload),
            });
            
            if (updatePriceResponse.ok) {
              // console.log(`Updated ${priceUpdate.price_list} price to ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
            } else {
              const errorData = await updatePriceResponse.json();
              // console.log(`Failed to update ${priceUpdate.price_list} price:`, errorData);
            }
          } else {
            // Create new Item Price
            const createPricePayload: any = {
              item_code: item_code,
              price_list: priceUpdate.price_list,
              price_list_rate: priceUpdate.price_list_rate
            };
            
            // Add custom_company if available
            if (company) {
              createPricePayload.custom_company = company;
            }
            
            const createPriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price`, {
              method: 'POST',
              headers,
              body: JSON.stringify(createPricePayload),
            });
            
            if (createPriceResponse.ok) {
              // console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate} for company ${company || 'default'}`);
            } else {
              const errorData = await createPriceResponse.json();
              // console.log(`Failed to create ${priceUpdate.price_list} price:`, errorData);
            }
          }
        }
      } catch (error) {
        // console.log(`Error updating ${priceUpdate.price_list} price:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: data.data,
      message: 'Item updated successfully'
    });

  } catch (error) {
    console.error('Update Item Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
