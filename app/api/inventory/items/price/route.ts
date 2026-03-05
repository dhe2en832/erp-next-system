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
    const itemCode = searchParams.get('item_code');
    const selling = searchParams.get('selling'); // 0 untuk harga beli, 1 untuk harga jual
    const company = searchParams.get('company');

    if (!itemCode) {
      return NextResponse.json({ error: "item_code is required" }, { status: 400 });
    }

    // Tentukan price list berdasarkan parameter selling
    const priceList = selling === '0' ? 'Standar Pembelian' : 'Standard Jual';

    // console.log('Item price request:', { itemCode, selling, priceList, company });

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Query ke ERPNext Item Price dengan filter company jika ada custom_company field
    const filters: any[] = [
      ["item_code", "=", itemCode],
      ["price_list", "=", priceList]
    ];
    
    // Tambahkan filter company jika parameter company dikirim
    if (company) {
      filters.push(["custom_company", "=", company]);
    }
    
    // console.log('Filters:', JSON.stringify(filters));
    
    const result = await client.getList('Item Price', {
      fields: ['price_list_rate', 'item_code', 'price_list', 'custom_company'],
      filters
    });

    // console.log('ERPNext data result:', result);
    // console.log('Filters used:', JSON.stringify(filters));
    // console.log('Company parameter:', company);

    if (!result || result.length === 0) {
      // console.log('No price data found for:', { itemCode, priceList, company });
      return NextResponse.json({ 
        success: false, 
        message: "No price found for the specified item and price list" 
      }, { status: 404 });
    }

    // Return the first matching price
    const itemPrice = result[0];
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

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/items/price', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
