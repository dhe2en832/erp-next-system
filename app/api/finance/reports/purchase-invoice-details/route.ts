import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/lib/report-auth-helper';
import { PurchaseInvoiceWithItems, PurchaseInvoiceDetailsResponse } from '@/types/purchase-invoice-details';
import { validateDateRange } from '@/utils/report-validation';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Validate required parameters
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Validate date range
    const dateValidation = validateDateRange(fromDate, toDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { success: false, message: dateValidation.error },
        { status: 400 }
      );
    }

    const headers = getAuthHeaders(request);

    // Build filters for ERPNext API
    const filters: any[] = [
      ['docstatus', '=', '1'],
      ['company', '=', company]
    ];

    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }

    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // Fetch list of purchase invoices
    const listUrl = new URL(`${ERPNEXT_API_URL}/api/resource/Purchase Invoice`);
    listUrl.searchParams.set('fields', JSON.stringify([
      'name',
      'supplier',
      'supplier_name',
      'posting_date',
      'status',
      'docstatus',
      'grand_total',
      'outstanding_amount'
    ]));
    listUrl.searchParams.set('filters', JSON.stringify(filters));
    listUrl.searchParams.set('limit_page_length', '500');

    const listResponse = await fetch(listUrl.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000)
    });

    if (!listResponse.ok) {
      if (listResponse.status === 401) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized. Please check your credentials.' },
          { status: 401 }
        );
      }
      const errorData = await listResponse.json();
      return NextResponse.json(
        { 
          success: false, 
          message: errorData.message || 'Failed to fetch purchase invoices from ERPNext' 
        },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const invoices = listData.data || [];

    // Fetch details for each invoice in parallel
    const detailPromises = invoices.map(async (invoice: any) => {
      try {
        const detailUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Invoice/${invoice.name}`;
        const detailResponse = await fetch(detailUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(30000)
        });

        if (!detailResponse.ok) {
          console.error(`Failed to fetch details for ${invoice.name}`);
          return {
            ...invoice,
            items: []
          };
        }

        const detailData = await detailResponse.json();
        return {
          name: detailData.data.name,
          supplier: detailData.data.supplier,
          supplier_name: detailData.data.supplier_name,
          posting_date: detailData.data.posting_date,
          due_date: detailData.data.due_date,
          status: detailData.data.status,
          docstatus: detailData.data.docstatus,
          grand_total: detailData.data.grand_total,
          outstanding_amount: detailData.data.outstanding_amount,
          items: (detailData.data.items || []).map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            qty: item.qty,
            uom: item.uom,
            rate: item.rate,
            discount_percentage: item.discount_percentage,
            discount_amount: item.discount_amount || 0,
            tax_amount: item.tax_amount || 0,
            amount: item.amount
          }))
        };
      } catch (error) {
        console.error(`Error fetching details for ${invoice.name}:`, error);
        return {
          ...invoice,
          items: []
        };
      }
    });

    const invoicesWithItems: PurchaseInvoiceWithItems[] = await Promise.all(detailPromises);

    const response: PurchaseInvoiceDetailsResponse = {
      success: true,
      data: invoicesWithItems,
      message: 'Data retrieved successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Purchase Invoice Details API Error:', error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, message: 'Request timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Network error. Please check your connection.' },
      { status: 500 }
    );
  }
}
