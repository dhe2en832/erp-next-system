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
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Fetch Bin (stock balance per warehouse per item)
    const fields = ['item_code', 'warehouse', 'actual_qty', 'stock_value', 'stock_uom'];
    const filters: (string | number | boolean | null | string[])[][] = [
      ['actual_qty', '>', 0],
    ];

    interface BinSummary {
      item_code: string;
      warehouse: string;
      actual_qty: number;
      stock_value: number;
      stock_uom: string;
      [key: string]: unknown;
    }
    const bins = await client.getList<BinSummary>('Bin', {
      fields,
      filters,
      order_by: 'item_code',
      limit_page_length: 1000
    });

    // Try to enrich with item names
    const itemCodes = [...new Set((bins || []).map((b: BinSummary) => b.item_code))];

    const itemNames: Record<string, string> = {};
    if (itemCodes.length > 0 && itemCodes.length <= 100) {
      try {
        const itemFilters: (string | number | boolean | null | string[])[][] = [['name', 'in', itemCodes]];
        interface ItemSummary {
          name: string;
          item_name: string;
        }
        const items = await client.getList<ItemSummary>('Item', {
          fields: ['name', 'item_name'],
          filters: itemFilters,
          limit_page_length: 1000
        });
        
        (items || []).forEach((item: ItemSummary) => {
          itemNames[item.name] = item.item_name;
        });
      } catch {
        // Continue without item names
      }
    }

    const enrichedData = (bins || []).map((bin: BinSummary) => ({
      ...bin,
      item_name: itemNames[bin.item_code] || '',
    }));

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/reports/stock-balance', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
