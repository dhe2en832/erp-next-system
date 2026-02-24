import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemCode = searchParams.get('item_code');
  const selling = searchParams.get('selling'); // 0 untuk harga beli, 1 untuk harga jual
  const company = searchParams.get('company');

  if (!itemCode) {
    return NextResponse.json({ error: "item_code is required" }, { status: 400 });
  }

  // Tentukan price list berdasarkan parameter selling
  const priceList = selling === '0' ? 'Standar Pembelian' : 'Standard Jual';

  // console.log('Item price request:', { itemCode, selling, priceList, company });
  // console.log('ERP_URL:', process.env.ERPNEXT_API_URL);
  // console.log('API Key exists:', !!process.env.ERP_API_KEY);

  try {
    // Query ke ERPNext Item Price dengan filter company jika ada custom_company field
    const filters = [
      ["item_code", "=", itemCode],
      ["price_list", "=", priceList]
    ];
    
    // Tambahkan filter company jika parameter company dikirim
    if (company) {
      filters.push(["custom_company", "=", company]);
    }
    
    const erpUrl = `${process.env.ERPNEXT_API_URL}/api/resource/Item Price?fields=["price_list_rate","item_code","price_list","custom_company"]&filters=${JSON.stringify(filters)}`;
    // console.log('ERPNext URL:', erpUrl);
    // console.log('Filters:', JSON.stringify(filters));
    
    const response = await fetch(erpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    // console.log('ERPNext response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // console.log('ERPNext error response:', errorText);
      return NextResponse.json({ error: `ERPNext API Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const result = await response.json();
    // console.log('ERPNext data result:', result);
    // console.log('Filters used:', JSON.stringify(filters));
    // console.log('Company parameter:', company);

    if (!result.data || result.data.length === 0) {
      // console.log('No price data found for:', { itemCode, priceList, company });
      return NextResponse.json({ 
        success: false, 
        message: "No price found for the specified item and price list" 
      }, { status: 404 });
    }

    // Return the first matching price
    const itemPrice = result.data[0];
    const responseData = {
      item_code: itemPrice.item_code,
      price_list_rate: itemPrice.price_list_rate,
      price_list: itemPrice.price_list,
      custom_company: itemPrice.custom_company,
      formatted_price: `Rp ${itemPrice.price_list_rate.toLocaleString('id-ID')}`
    };

    // console.log('Item price response:', responseData);
    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Item price fetch error:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
