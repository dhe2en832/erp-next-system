import { NextRequest, NextResponse } from 'next/server';
import { PurchaseInvoiceWithItems, PurchaseInvoiceDetailsResponse } from '@/types/purchase-invoice-details';
import { validateDateRange } from '@/utils/report-validation';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

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

    const client = await getERPNextClientForRequest(request);

    // Build filters for ERPNext API
    const filters: [string, string, string | number][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company]
    ];

    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }

    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    interface PurchaseInvoiceBasic {
      name: string;
      supplier: string;
      supplier_name: string;
      posting_date: string;
      status: string;
      docstatus: number;
      grand_total: number;
      outstanding_amount: number;
    }

    // Fetch list of purchase invoices
    const listData = await client.getList<PurchaseInvoiceBasic>('Purchase Invoice', {
      fields: [
        'name',
        'supplier',
        'supplier_name',
        'posting_date',
        'status',
        'docstatus',
        'grand_total',
        'outstanding_amount'
      ],
      filters,
      limit_page_length: 500
    });

    const invoices = listData || [];

    // Fetch details for each invoice in parallel
    const detailPromises = invoices.map(async (invoice) => {
      try {
        interface PurchaseInvoiceItem {
          item_code: string;
          item_name?: string;
          description?: string;
          qty: number;
          uom: string;
          rate: number;
          discount_percentage?: number;
          discount_amount?: number;
          tax_amount?: number;
          amount: number;
        }
        interface PurchaseInvoiceDetail {
          name: string;
          supplier: string;
          supplier_name: string;
          posting_date: string;
          due_date: string;
          status: string;
          docstatus: number;
          grand_total: number;
          outstanding_amount: number;
          items: PurchaseInvoiceItem[];
        }
        const detailData = await client.get<PurchaseInvoiceDetail>('Purchase Invoice', invoice.name);

        return {
          name: detailData.name,
          supplier: detailData.supplier,
          supplier_name: detailData.supplier_name,
          posting_date: detailData.posting_date,
          due_date: detailData.due_date,
          status: detailData.status,
          docstatus: detailData.docstatus,
          grand_total: detailData.grand_total,
          outstanding_amount: detailData.outstanding_amount,
          items: (detailData.items || []).map((item) => ({
            item_code: item.item_code,
            item_name: item.item_name || '',
            description: item.description || '',
            qty: item.qty,
            uom: item.uom,
            rate: item.rate,
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            tax_amount: item.tax_amount || 0,
            amount: item.amount
          }))
        };
      } catch (error) {
        console.error(`Error fetching details for ${invoice.name}:`, error);
        return {
          ...invoice,
          due_date: '',
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

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/purchase-invoice-details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
