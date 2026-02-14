import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemCode = searchParams.get('item_code');
  const priceList = searchParams.get('price_list') || 'Standard Jual';
  // Get company from query parameter or use default
  const company = searchParams.get('company') || 'Entitas 2020 (Demo)';

  if (!itemCode) {
    return NextResponse.json({ error: "item_code is required" }, { status: 400 });
  }

  console.log('Item price request:', { itemCode, priceList, company });
  console.log('ERP_URL:', process.env.ERPNEXT_API_URL);
  console.log('API Key exists:', !!process.env.ERP_API_KEY);

  try {
    // Query ke ERPNext Item Price tanpa company filter (company tidak diizinkan)
    const erpUrl = `${process.env.ERPNEXT_API_URL}/api/resource/Item Price?fields=["price_list_rate","item_code","price_list"]&filters=[["item_code","=","${itemCode}"],["price_list","=","${priceList}"]]`;
    console.log('ERPNext URL:', erpUrl);
    
    const response = await fetch(erpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('ERPNext response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('ERPNext error response:', errorText);
      return NextResponse.json({ error: `ERPNext API Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const result = await response.json();
    console.log('ERPNext data result:', result);

    if (!result.data || result.data.length === 0) {
      console.log('No price data found');
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
      formatted_price: `Rp ${itemPrice.price_list_rate.toLocaleString('id-ID')}`
    };

    console.log('Item price response:', responseData);
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
