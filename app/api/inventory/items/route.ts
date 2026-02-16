import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = searchParams.get('filters');
    const limit = searchParams.get('limit') || '20';
    const start = searchParams.get('start') || '0';

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Item?fields=["item_code","item_name","description","item_group","stock_uom","opening_stock"]&limit_page_length=${limit}&start=${start}`;
    
    if (filters) {
      erpNextUrl += `&filters=${filters}`;
    }

    console.log('Items ERPNext URL:', erpNextUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try session-based authentication first
    if (sid) {
      headers['Cookie'] = `sid=${sid}`;
    } else {
      // Fallback to API key authentication
      const apiKey = process.env.ERP_API_KEY;
      const apiSecret = process.env.ERP_API_SECRET;
      
      if (apiKey && apiSecret) {
        headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      } else {
        return NextResponse.json(
          { success: false, message: 'No authentication available' },
          { status: 401 }
        );
      }
    }

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('Items API Response:', { status: response.status, data });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch items' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Items API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      'opening_stock', 'brand', 'standard_rate', 'last_purchase_rate', 'valuation_method'
    ];
    
    Object.keys(createData).forEach(key => {
      if (allowedFields.includes(key) && createData[key] !== undefined) {
        validCreateData[key] = createData[key];
      }
    });

    // Add valuation method for new items
    validCreateData.valuation_method = 'Moving Average';

    console.log('Creating item:', {
      originalData: itemData,
      filteredData: validCreateData
    });

    // Try API Key authentication for POST (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for POST requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for POST');
    } else {
      // Fallback to session
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session authentication for POST');
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Item`, {
      method: 'POST',
      headers,
      body: JSON.stringify(validCreateData),
    });

    const data = await response.json();
    
    console.log('Create Item Response:', {
      status: response.status,
      createData: validCreateData,
      erpNextResponse: data
    });

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
            console.log('Creating Item Price for new item:', priceUpdate);
            
            const createPriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                item_code: newItemCode,
                price_list: priceUpdate.price_list,
                price_list_rate: priceUpdate.price_list_rate
              }),
            });
            
            if (createPriceResponse.ok) {
              console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate}`);
            } else {
              console.log(`Failed to create ${priceUpdate.price_list} price`);
            }
          } catch (error) {
            console.log(`Error creating ${priceUpdate.price_list} price:`, error);
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

    // Filter only valid updateable fields (exclude system-managed price fields)
    const validUpdateData: any = {};
    const allowedFields = [
      'item_name', 'description', 'item_group', 'stock_uom', 
      'opening_stock', 'brand'
      // Removed: 'standard_rate', 'last_purchase_rate' (system-managed)
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        validUpdateData[key] = updateData[key];
      }
    });

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Updating item:', {
      item_code,
      originalData: updateData,
      filteredData: validUpdateData
    });

    // Try API Key authentication for PUT (CSRF not required)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try API Key first for PUT requests
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API Key authentication for PUT');
    } else if (sid) {
      // Fallback to session with CSRF token
      console.log('Getting CSRF token...');
      const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.auth.get_csrf_token`, {
        method: 'GET',
        headers: {
          'Cookie': `sid=${sid}`,
        },
      });

      console.log('CSRF Response status:', csrfResponse.status);
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token || '';
        console.log('CSRF Token obtained:', csrfToken);
      } else {
        console.log('CSRF Token failed:', csrfResponse.status);
        const csrfError = await csrfResponse.text();
        console.log('CSRF Error body:', csrfError);
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
    
    console.log('Update Item Response:', {
      status: response.status,
      item_code,
      updateData: validUpdateData,
      erpNextResponse: data
    });

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
        console.log('Updating Item Price:', priceUpdate);
        
        // Check if Item Price exists
        const checkResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price?filters=[["item_code","=","${item_code}"],["price_list","=","${priceUpdate.price_list}"]]`, {
          method: 'GET',
          headers,
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (checkData.data && checkData.data.length > 0) {
            // Update existing Item Price
            const existingPrice = checkData.data[0];
            const updatePriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price/${existingPrice.name}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                price_list_rate: priceUpdate.price_list_rate
              }),
            });
            
            if (updatePriceResponse.ok) {
              console.log(`Updated ${priceUpdate.price_list} price to ${priceUpdate.price_list_rate}`);
            } else {
              console.log(`Failed to update ${priceUpdate.price_list} price`);
            }
          } else {
            // Create new Item Price
            const createPriceResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Item Price`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                item_code: item_code,
                price_list: priceUpdate.price_list,
                price_list_rate: priceUpdate.price_list_rate
              }),
            });
            
            if (createPriceResponse.ok) {
              console.log(`Created ${priceUpdate.price_list} price at ${priceUpdate.price_list_rate}`);
            } else {
              console.log(`Failed to create ${priceUpdate.price_list} price`);
            }
          }
        }
      } catch (error) {
        console.log(`Error updating ${priceUpdate.price_list} price:`, error);
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
