import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company is required' }, { status: 400 });
    }

    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch Bin (stock balance per warehouse per item)
    const fields = ['item_code', 'warehouse', 'actual_qty', 'stock_value', 'stock_uom'];
    const filters = [
      ['actual_qty', '>', '0'],
    ];

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Bin?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=item_code&limit_page_length=1000`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      // Try to enrich with item names
      const bins = data.data || [];
      const itemCodes = [...new Set(bins.map((b: any) => b.item_code))];

      let itemNames: Record<string, string> = {};
      if (itemCodes.length > 0 && itemCodes.length <= 100) {
        try {
          const itemFilters = [['name', 'in', itemCodes]];
          const itemUrl = `${ERPNEXT_API_URL}/api/resource/Item?fields=["name","item_name"]&filters=${encodeURIComponent(JSON.stringify(itemFilters))}&limit_page_length=1000`;
          const itemResponse = await fetch(itemUrl, { method: 'GET', headers });
          if (itemResponse.ok) {
            const itemData = await itemResponse.json();
            (itemData.data || []).forEach((item: any) => {
              itemNames[item.name] = item.item_name;
            });
          }
        } catch {
          // Continue without item names
        }
      }

      const enrichedData = bins.map((bin: any) => ({
        ...bin,
        item_name: itemNames[bin.item_code] || '',
      }));

      return NextResponse.json({ success: true, data: enrichedData });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch stock balance' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Stock Balance Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
