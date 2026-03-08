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
    // console.log('Testing Stock Ledger for valuation rates...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemCodes = searchParams.get('item_codes'); // comma separated item codes
    
    if (!itemCodes) {
      return NextResponse.json({
        success: false,
        message: 'item_codes parameter is required'
      }, { status: 400 });
    }

    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json({
        success: false,
        message: 'No session found'
      }, { status: 401 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Parse item codes
    const itemCodeArray = itemCodes.split(',').map(code => code.trim());
    const valuationRates: { [key: string]: number } = {};

    // For each item, get latest stock ledger entry with valuation rate
    for (const itemCode of itemCodeArray) {
      try {
        // Get stock ledger entries for this item, ordered by posting_date desc
        const ledgerEntries = await client.getList('Stock Ledger Entry', {
          fields: ['item_code', 'valuation_rate', 'posting_date'],
          filters: [
            ["item_code", "=", itemCode],
            ["valuation_rate", ">", 0]
          ],
          order_by: 'posting_date desc',
          limit_page_length: 1
        });
        
        // console.log(`Fetching stock ledger for ${itemCode}`);
        
        if (ledgerEntries && ledgerEntries.length > 0) {
          const latestEntry = ledgerEntries[0];
          valuationRates[itemCode] = latestEntry.valuation_rate || 0;
          // console.log(`Valuation rate for ${itemCode}:`, latestEntry.valuation_rate);
        } else {
          valuationRates[itemCode] = 0;
          // console.log(`No valuation rate found for ${itemCode}`);
        }
      } catch (error) {
        valuationRates[itemCode] = 0;
        // console.log(`Error fetching ledger for ${itemCode}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: valuationRates,
      message: 'Valuation rates fetched from stock ledger'
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/inventory/items/valuation-rate', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
