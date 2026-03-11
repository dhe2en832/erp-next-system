import { NextRequest, NextResponse } from 'next/server';
import { PaymentWithReferences, PaymentDetailsResponse } from '@/types/payment-details';
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

    // Fetch list of payment entries
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

    // Fetch details for each payment in parallel
    const detailPromises = payments.map(async (payment: any) => {
      try {
        const detailData = await client.get('Payment Entry', payment.name) as any;
        
        // Get sales person from first referenced Sales Invoice
        let salesPerson = '';
        const references = detailData.data.references || [];
        
        for (const ref of references) {
          if (ref.reference_doctype === 'Sales Invoice' && ref.reference_name) {
            try {
              const invoiceData = await client.get('Sales Invoice', ref.reference_name) as any;
              salesPerson = invoiceData.data?.sales_team?.[0]?.sales_person || '';
              if (salesPerson) break; // Stop after finding first sales person
            } catch (error) {
              console.error(`Error fetching sales person from ${ref.reference_name}:`, error);
            }
          }
        }
        
        return {
          name: detailData.data.name,
          posting_date: detailData.data.posting_date,
          payment_type: detailData.data.payment_type,
          party_type: detailData.data.party_type,
          party: detailData.data.party,
          party_name: detailData.data.party_name,
          mode_of_payment: detailData.data.mode_of_payment,
          paid_amount: detailData.data.paid_amount,
          received_amount: detailData.data.received_amount,
          status: detailData.data.status,
          docstatus: detailData.data.docstatus,
          sales_person: salesPerson,
          references: references.map((ref: any) => ({
            reference_doctype: ref.reference_doctype,
            reference_name: ref.reference_name,
            total_amount: ref.total_amount || 0,
            allocated_amount: ref.allocated_amount || 0,
            outstanding_amount: ref.outstanding_amount || 0
          }))
        };
      } catch (error) {
        console.error(`Error fetching details for ${payment.name}:`, error);
        return {
          ...payment,
          references: []
        };
      }
    });

    const paymentsWithReferences: PaymentWithReferences[] = await Promise.all(detailPromises);

    const response: PaymentDetailsResponse = {
      success: true,
      data: paymentsWithReferences,
      message: 'Data retrieved successfully'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/payment-details', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
