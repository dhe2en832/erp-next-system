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

    interface PaymentEntryBasic {
      name: string;
      posting_date: string;
      payment_type: 'Receive' | 'Pay';
      party_type: string;
      party: string;
      party_name: string;
      mode_of_payment: string;
      paid_amount: number;
      received_amount: number;
      status: string;
      docstatus: number;
    }

    // Fetch list of payment entries
    const listData = await client.getList<PaymentEntryBasic>('Payment Entry', {
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
    const detailPromises = payments.map(async (payment) => {
      try {
        interface PaymentReference {
          reference_doctype: string;
          reference_name: string;
          total_amount: number;
          allocated_amount: number;
          outstanding_amount: number;
        }
        interface PaymentEntryDetail {
          name: string;
          posting_date: string;
          payment_type: 'Receive' | 'Pay';
          party_type: string;
          party: string;
          party_name: string;
          mode_of_payment: string;
          paid_amount: number;
          received_amount: number;
          status: string;
          docstatus: number;
          references: PaymentReference[];
        }
        const detailData = await client.get<PaymentEntryDetail>('Payment Entry', payment.name);
        
        // Get sales person from first referenced Sales Invoice
        let salesPerson = '';
        const references = detailData.references || [];
        
        for (const ref of references) {
          if (ref.reference_doctype === 'Sales Invoice' && ref.reference_name) {
            try {
              interface SalesTeamMember {
                sales_person: string;
              }
              interface SalesInvoiceDetail {
                sales_team?: SalesTeamMember[];
              }
              const invoiceData = await client.get<SalesInvoiceDetail>('Sales Invoice', ref.reference_name);
              salesPerson = invoiceData.sales_team?.[0]?.sales_person || '';
              if (salesPerson) break; // Stop after finding first sales person
            } catch (error) {
              console.error(`Error fetching sales person from ${ref.reference_name}:`, error);
            }
          }
        }
        
        return {
          name: detailData.name,
          posting_date: detailData.posting_date,
          payment_type: detailData.payment_type,
          party_type: detailData.party_type,
          party: detailData.party,
          party_name: detailData.party_name,
          mode_of_payment: detailData.mode_of_payment,
          paid_amount: detailData.paid_amount,
          received_amount: detailData.received_amount,
          status: detailData.status,
          docstatus: detailData.docstatus,
          sales_person: salesPerson,
          references: references.map((ref) => ({
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
