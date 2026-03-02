import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';

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

    const fields = ['name', 'supplier', 'supplier_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'];
    const filters = [
      ['docstatus', '=', '1'],
      ['company', '=', company],
      ['outstanding_amount', '>', '0'],
    ];

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=posting_date desc&limit_page_length=500`;

    const response = await fetch(erpNextUrl, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      const invoices = data.data || [];
      
      // Fetch Purchase Returns
      const returnFields = ['name', 'return_against', 'grand_total', 'outstanding_amount'];
      const returnFilters = [
        ['docstatus', '=', '1'],
        ['company', '=', company],
        ['is_return', '=', '1'],
      ];

      const returnsUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice?fields=${encodeURIComponent(JSON.stringify(returnFields))}&filters=${encodeURIComponent(JSON.stringify(returnFilters))}&limit_page_length=500`;

      let returnsMap = new Map<string, number>();
      try {
        const returnsResponse = await fetch(returnsUrl, { method: 'GET', headers });
        if (returnsResponse.ok) {
          const returnsData = await returnsResponse.json();
          (returnsData.data || []).forEach((ret: any) => {
            const originalInvoice = ret.return_against || ret.name;
            const returnAmount = Math.abs(ret.grand_total || 0);
            returnsMap.set(originalInvoice, (returnsMap.get(originalInvoice) || 0) + returnAmount);
          });
        }
      } catch (error) {
        console.error('Error fetching purchase returns:', error);
        // Continue without returns if fetch fails
      }
      
      // Adjust outstanding amounts for returns
      const apData = invoices
        .map((inv: any) => {
          const returnAmount = returnsMap.get(inv.name) || 0;
          const adjustedOutstanding = Math.max(0, inv.outstanding_amount - returnAmount);
          
          return {
            voucher_no: inv.name,
            supplier: inv.supplier,
            supplier_name: inv.supplier_name,
            posting_date: inv.posting_date,
            due_date: inv.due_date,
            invoice_grand_total: inv.grand_total,
            outstanding_amount: adjustedOutstanding,
            return_amount: returnAmount,
            formatted_grand_total: formatCurrency(inv.grand_total),
            formatted_outstanding: formatCurrency(adjustedOutstanding),
            formatted_return_amount: formatCurrency(returnAmount),
          };
        })
        .filter((inv: any) => inv.outstanding_amount > 0);
      
      return NextResponse.json({ success: true, data: apData, total_records: apData.length });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch accounts payable' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('AP Report API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
