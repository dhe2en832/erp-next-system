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

    if (!itemCode) return NextResponse.json({ error: "item_code is required" }, { status: 400 });

    // console.log('Stock check request for item:', itemCode);

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Query ke DocType Bin untuk mendapatkan stok per gudang
    const bins = await client.getList('Bin', {
      fields: ['warehouse', 'actual_qty', 'reserved_qty'],
      filters: [["item_code", "=", itemCode]]
    });

    // console.log('ERPNext data result:', bins);
    
    if (!bins) {
      // console.log('No data found in ERPNext response');
      return NextResponse.json([]);
    }

    // Format data agar mudah dibaca oleh UI
    const stockData = bins.map((bin: any) => ({
      warehouse: bin.warehouse,
      available: bin.actual_qty - bin.reserved_qty, // Stok yang benar-benar bisa dijual
      actual: bin.actual_qty,
      reserved: bin.reserved_qty
    }));

    // console.log('Formatted stock data:', stockData);

    // Filter hanya warehouse yang ada stok (available > 0)
    const availableStock = stockData.filter((stock: any) => stock.available > 0);
    
    if (availableStock.length === 0) {
      // console.log('No available stock, returning all warehouses');
      // Jika tidak ada stok tersedia, kirim semua warehouse dengan available = 0
      const zeroStockData = stockData.map((stock: any) => ({
        ...stock,
        available: 0
      }));
      return NextResponse.json(zeroStockData);
    }

    return NextResponse.json(availableStock);
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/check', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
