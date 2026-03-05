import { NextRequest, NextResponse } from 'next/server';
import { PaymentSummaryResponse } from '@/types/payment-details';
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

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await getERPNextClientForRequest(request);

    // Build filters for ERPNext API
    const filters: any[][] = [
      ['docstatus', '=', '1'],
      ['company', '=', company]
    ];

    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }

    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    // Fetch payment entries
    const listData = await client.getList('Payment Entry', {
      fields: [
        'name',
        'posting_date',
        'payment_type',
        'party_type',
        'party',
        'party_name',
        'mode_of_payment',
        'paid_amount',
        'received_amount',
        'status',
        'docstatus'
      ],
      filters,
      limit_page_length: 500
    });

    const payments = listData || [];

    // Fetch details including sales person for each payment
    const detailPromises = payments.map(async (payment: any) => {
      try {
        const detailData = await client.get('Payment Entry', payment.name);
        
        // Get sales person from first referenced Sales Invoice
        let salesPerson = '';
        const references = detailData.data.references || [];
        
        for (const ref of references) {
          if (ref.reference_doctype === 'Sales Invoice' && ref.reference_name) {
            try {
              const invoiceData = await client.get('Sales Invoice', ref.reference_name);
              salesPerson = invoiceData.data?.sales_team?.[0]?.sales_person || '';
              if (salesPerson) break;
            } catch (error) {
              console.error(`Error fetching sales person from ${ref.reference_name}:`, error);
            }
          }
        }
        
        return {
          ...payment,
          sales_person: salesPerson
        };
      } catch (error) {
        console.error(`Error fetching details for ${payment.name}:`, error);
        return {
          ...payment,
          sales_person: ''
        };
      }
    });

    const paymentsWithSales = await Promise.all(detailPromises);

    const response: PaymentSummaryResponse = {
      success: true,
      data: paymentsWithSales,
      message: 'Data retrieved successfully'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/payment-summary', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
