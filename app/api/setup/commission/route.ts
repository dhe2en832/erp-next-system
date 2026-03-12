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
    const { searchParams } = new URL(request.url);
    const salesPerson = searchParams.get('sales_person');

    if (!salesPerson) {
      return NextResponse.json({ error: 'sales_person diperlukan' }, { status: 400 });
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Query Sales Order dengan komisi
    const salesOrders = await client.getList('Sales Order', {
      fields: ['name', 'base_grand_total', 'transaction_date', 'sales_team.sales_person', 'sales_team.allocated_percentage'],
      filters: [
        ['docstatus', '=', 1],
        ['sales_team.sales_person', '=', salesPerson]
      ],
      order_by: 'transaction_date desc'
    });

    // Query Sales Invoice yang sudah paid
    interface InvoiceSummary {
      name: string;
      base_grand_total?: number;
      posting_date?: string;
      status?: string;
      custom_total_komisi_sales?: number;
      [key: string]: unknown;
    }

    const invoices = await client.getList<InvoiceSummary>('Sales Invoice', {
      fields: ['name', 'base_grand_total', 'posting_date', 'status', 'sales_team.sales_person', 'custom_total_komisi_sales'],
      filters: [
        ['docstatus', '=', 1],
        ['status', '=', 'Paid'],
        ['sales_team.sales_person', '=', salesPerson]
      ]
    });

    // Query Credit Notes and Commission Payments
    const invoiceNames = invoices.map((inv: InvoiceSummary) => inv.name);
    let creditNotes: Record<string, unknown>[] = [];
    let commissionPayments: Record<string, unknown>[] = [];
    
    if (invoiceNames.length > 0) {
      creditNotes = await client.getList<Record<string, unknown>>('Sales Invoice', {
        fields: ['name', 'return_against', 'base_grand_total', 'posting_date', 'custom_total_komisi_sales'],
        filters: [
          ['docstatus', '=', 1],
          ['is_return', '=', 1],
          ['return_against', 'in', invoiceNames]
        ]
      });

      try {
        commissionPayments = await client.getList<Record<string, unknown>>('Journal Entry', {
          fields: ['name', 'posting_date', 'accounts.reference_name', 'accounts.reference_type'],
          filters: [
            ['docstatus', '=', 1],
            ['voucher_type', '=', 'Commission Payment']
          ]
        });
      } catch (err) {
        console.log('Could not fetch commission payments:', err);
      }
    }

    // Group Credit Notes by return_against
    const creditNotesByInvoice: Record<string, Record<string, unknown>[]> = {};
    creditNotes.forEach((cn: Record<string, unknown>) => {
      const returnAgainst = cn.return_against as string;
      if (!creditNotesByInvoice[returnAgainst]) {
        creditNotesByInvoice[returnAgainst] = [];
      }
      creditNotesByInvoice[returnAgainst].push(cn);
    });

    // Create a map of paid invoices
    const paidInvoicesByName: Record<string, { payment_name: string; payment_date: string }[]> = {};
    commissionPayments.forEach((payment: Record<string, unknown>) => {
      const accounts = payment.accounts as Record<string, unknown>[] | undefined;
      if (accounts) {
        accounts.forEach((acc: Record<string, unknown>) => {
          const refName = acc.reference_name as string;
          if (acc.reference_type === 'Sales Invoice' && refName) {
            if (!paidInvoicesByName[refName]) {
              paidInvoicesByName[refName] = [];
            }
            paidInvoicesByName[refName].push({
              payment_name: payment.name as string,
              payment_date: payment.posting_date as string
            });
          }
        });
      }
    });

    // Calculate commission adjustments
    const paidInvoicesWithAdjustments = (invoices as Record<string, unknown>[]).map((inv: Record<string, unknown>) => {
      const invName = inv.name as string;
      const relatedCreditNotes = creditNotesByInvoice[invName] || [];
      const commissionPaymentsForInvoice = paidInvoicesByName[invName] || [];
      
      const creditNoteAdjustment = relatedCreditNotes.reduce(
        (sum: number, cn: Record<string, unknown>) => sum + Math.abs((cn.custom_total_komisi_sales as number) || 0),
        0
      );
      
      let hasPostPaymentCreditNote = false;
      if (commissionPaymentsForInvoice.length > 0 && relatedCreditNotes.length > 0) {
        const latestPaymentDate = commissionPaymentsForInvoice
          .map((p: { payment_date: string }) => new Date(p.payment_date))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
        
        hasPostPaymentCreditNote = relatedCreditNotes.some((cn: Record<string, unknown>) => {
          const cnDate = new Date(cn.posting_date as string);
          return cnDate > latestPaymentDate;
        });
      }
      
      const invCommission = inv.custom_total_komisi_sales as number || 0;
      return {
        ...inv,
        credit_note_adjustment: creditNoteAdjustment,
        credit_notes: relatedCreditNotes,
        net_commission: invCommission - creditNoteAdjustment,
        has_commission_payment: commissionPaymentsForInvoice.length > 0,
        has_post_payment_credit_note: hasPostPaymentCreditNote,
        commission_payments: commissionPaymentsForInvoice
      };
    });

    // Calculate totals
    const totalSales = (salesOrders as Record<string, unknown>[]).reduce((sum: number, so: Record<string, unknown>) => sum + (so.base_grand_total as number), 0);
    const totalPaid = (invoices as Record<string, unknown>[]).reduce((sum: number, inv: Record<string, unknown>) => sum + (inv.base_grand_total as number), 0);
    const commissionRate = 0.05;
    const potentialCommission = totalSales * commissionRate;
    const earnedCommission = totalPaid * commissionRate;
    
    const totalCreditNoteAdjustments = paidInvoicesWithAdjustments.reduce(
      (sum: number, inv: Record<string, unknown>) => sum + (inv.credit_note_adjustment as number),
      0
    );
    
    const netEarnedCommission = earnedCommission - totalCreditNoteAdjustments;

    return NextResponse.json({
      summary: {
        total_sales: totalSales,
        total_paid: totalPaid,
        potential_commission: potentialCommission,
        earned_commission: earnedCommission,
        credit_note_adjustments: totalCreditNoteAdjustments,
        net_earned_commission: netEarnedCommission,
        commission_rate: commissionRate * 100
      },
      sales_orders: salesOrders,
      paid_invoices: paidInvoicesWithAdjustments
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/commission', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
