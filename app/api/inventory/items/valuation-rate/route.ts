import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Stock Ledger for valuation rates...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemCodes = searchParams.get('item_codes'); // comma separated item codes
    
    if (!itemCodes) {
      return NextResponse.json({
        success: false,
        message: 'item_codes parameter is required'
      }, { status: 400 });
    }

    // Get session cookie
    const cookieHeader = request.headers.get('cookie');
    const sid = cookieHeader?.match(/sid=([^;]+)/)?.[1];

    if (!sid) {
      return NextResponse.json({
        success: false,
        message: 'No session found'
      }, { status: 401 });
    }

    // Parse item codes
    const itemCodeArray = itemCodes.split(',').map(code => code.trim());
    const valuationRates: { [key: string]: number } = {};

    // For each item, get latest stock ledger entry with valuation rate
    for (const itemCode of itemCodeArray) {
      try {
        // Get stock ledger entries for this item, ordered by posting_date desc
        const ledgerUrl = `${ERPNEXT_API_URL}/api/resource/Stock Ledger Entry?fields=["item_code","valuation_rate","posting_date"]&filters=[["item_code","=","${itemCode}"],["valuation_rate",">",0]]&order_by=posting_date desc&limit_page_length=1`;
        
        console.log(`Fetching stock ledger for ${itemCode}:`, ledgerUrl);
        
        const ledgerResponse = await fetch(ledgerUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sid=${sid}`,
          },
        });

        if (ledgerResponse.ok) {
          const ledgerData = await ledgerResponse.json();
          if (ledgerData.data && ledgerData.data.length > 0) {
            const latestEntry = ledgerData.data[0];
            valuationRates[itemCode] = latestEntry.valuation_rate || 0;
            console.log(`Valuation rate for ${itemCode}:`, latestEntry.valuation_rate);
          } else {
            valuationRates[itemCode] = 0;
            console.log(`No valuation rate found for ${itemCode}`);
          }
        } else {
          valuationRates[itemCode] = 0;
          console.log(`Failed to fetch ledger for ${itemCode}`);
        }
      } catch (error) {
        valuationRates[itemCode] = 0;
        console.log(`Error fetching ledger for ${itemCode}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: valuationRates,
      message: 'Valuation rates fetched from stock ledger'
    });

  } catch (error) {
    console.error('Error in stock ledger API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch valuation rates from stock ledger',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
