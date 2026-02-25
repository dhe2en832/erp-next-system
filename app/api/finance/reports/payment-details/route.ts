import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/lib/report-auth-helper';
import { PaymentWithReferences, PaymentDetailsResponse } from '@/types/payment-details';

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

    // Fetch list of payment entries
    const listUrl = new URL(`${ERPNEXT_API_URL}/api/resource/Payment Entry`);
    listUrl.searchParams.set('fields', JSON.stringify([
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
          message: errorData.message || 'Failed to fetch payment entries from ERPNext' 
        },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const payments = listData.data || [];

    // Fetch details for each payment in parallel
    const detailPromises = payments.map(async (payment: any) => {
      try {
        const detailUrl = `${ERPNEXT_API_URL}/api/resource/Payment Entry/${payment.name}`;
        const detailResponse = await fetch(detailUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(30000)
        });

        if (!detailResponse.ok) {
          console.error(`Failed to fetch details for ${payment.name}`);
          return {
            ...payment,
            references: []
          };
        }

        const detailData = await detailResponse.json();
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
          references: (detailData.data.references || []).map((ref: any) => ({
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

  } catch (error: any) {
    console.error('Payment Details API Error:', error);
    
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
