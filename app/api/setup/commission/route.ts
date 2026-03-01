import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const salesPerson = searchParams.get('sales_person');
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  if (!salesPerson) {
    return NextResponse.json({ error: 'sales_person diperlukan' }, { status: 400 });
  }

  try {
    // Query Sales Order dengan komisi
    const soResponse = await fetch(
      `${process.env.ERP_URL}/api/resource/Sales Order?fields=["name","base_grand_total","transaction_date","sales_team.sales_person","sales_team.allocated_percentage"]&filters=[["docstatus","=",1],["sales_team.sales_person","=","${salesPerson}"]]&order_by=transaction_date desc`,
      {
        headers: {
          'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        },
      }
    );

    const soResult = await soResponse.json();

    // Query Sales Invoice yang sudah paid
    const invoiceResponse = await fetch(
      `${process.env.ERP_URL}/api/resource/Sales Invoice?fields=["name","base_grand_total","posting_date","status","sales_team.sales_person","custom_total_komisi_sales"]&filters=[["docstatus","=",1],["status","=","Paid"],["sales_team.sales_person","=","${salesPerson}"]]`,
      {
        headers: {
          'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        },
      }
    );

    const invoiceResult = await invoiceResponse.json();

    // Query Credit Notes (Sales Invoice dengan is_return=1) untuk invoices yang paid
    const invoiceNames = invoiceResult.data.map((inv: any) => inv.name);
    let creditNotes: any[] = [];
    let commissionPayments: any[] = [];
    
    if (invoiceNames.length > 0) {
      const creditNoteResponse = await fetch(
        `${process.env.ERP_URL}/api/resource/Sales Invoice?fields=["name","return_against","base_grand_total","posting_date","custom_total_komisi_sales"]&filters=[["docstatus","=",1],["is_return","=",1],["return_against","in",${JSON.stringify(invoiceNames)}]]`,
        {
          headers: {
            'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
          },
        }
      );

      const creditNoteResult = await creditNoteResponse.json();
      creditNotes = creditNoteResult.data || [];

      // Query Commission Payments to check if commission has been paid
      try {
        const paymentResponse = await fetch(
          `${process.env.ERP_URL}/api/resource/Journal Entry?fields=["name","posting_date","accounts.reference_name","accounts.reference_type"]&filters=[["docstatus","=",1],["voucher_type","=","Commission Payment"]]`,
          {
            headers: {
              'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
            },
          }
        );

        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          commissionPayments = paymentResult.data || [];
        }
      } catch (err) {
        console.log('Could not fetch commission payments:', err);
      }
    }

    // Group Credit Notes by return_against (Sales Invoice)
    const creditNotesByInvoice: Record<string, any[]> = {};
    creditNotes.forEach((cn: any) => {
      if (!creditNotesByInvoice[cn.return_against]) {
        creditNotesByInvoice[cn.return_against] = [];
      }
      creditNotesByInvoice[cn.return_against].push(cn);
    });

    // Create a map of paid invoices by name for quick lookup
    const paidInvoicesByName: Record<string, any> = {};
    commissionPayments.forEach((payment: any) => {
      if (payment.accounts) {
        payment.accounts.forEach((acc: any) => {
          if (acc.reference_type === 'Sales Invoice' && acc.reference_name) {
            if (!paidInvoicesByName[acc.reference_name]) {
              paidInvoicesByName[acc.reference_name] = [];
            }
            paidInvoicesByName[acc.reference_name].push({
              payment_name: payment.name,
              payment_date: payment.posting_date
            });
          }
        });
      }
    });

    // Calculate commission adjustments for each invoice
    const paidInvoicesWithAdjustments = invoiceResult.data.map((inv: any) => {
      const relatedCreditNotes = creditNotesByInvoice[inv.name] || [];
      const commissionPaymentsForInvoice = paidInvoicesByName[inv.name] || [];
      
      const creditNoteAdjustment = relatedCreditNotes.reduce(
        (sum: number, cn: any) => sum + Math.abs(cn.custom_total_komisi_sales || 0),
        0
      );
      
      // Check if any credit notes were created after commission payment
      let hasPostPaymentCreditNote = false;
      if (commissionPaymentsForInvoice.length > 0 && relatedCreditNotes.length > 0) {
        const latestPaymentDate = commissionPaymentsForInvoice
          .map((p: any) => new Date(p.payment_date))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
        
        hasPostPaymentCreditNote = relatedCreditNotes.some((cn: any) => {
          const cnDate = new Date(cn.posting_date);
          return cnDate > latestPaymentDate;
        });
      }
      
      return {
        ...inv,
        credit_note_adjustment: creditNoteAdjustment,
        credit_notes: relatedCreditNotes,
        net_commission: (inv.custom_total_komisi_sales || 0) - creditNoteAdjustment,
        has_commission_payment: commissionPaymentsForInvoice.length > 0,
        has_post_payment_credit_note: hasPostPaymentCreditNote,
        commission_payments: commissionPaymentsForInvoice
      };
    });

    // Hitung total komisi (asumsi 5% dari sales person)
    const totalSales = soResult.data.reduce((sum: number, so: any) => sum + so.base_grand_total, 0);
    const totalPaid = invoiceResult.data.reduce((sum: number, inv: any) => sum + inv.base_grand_total, 0);
    const commissionRate = 0.05; // 5%
    const potentialCommission = totalSales * commissionRate;
    const earnedCommission = totalPaid * commissionRate;
    
    // Calculate total credit note adjustments
    const totalCreditNoteAdjustments = paidInvoicesWithAdjustments.reduce(
      (sum: number, inv: any) => sum + inv.credit_note_adjustment,
      0
    );
    
    // Net earned commission after adjustments
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
      sales_orders: soResult.data,
      paid_invoices: paidInvoicesWithAdjustments
    });

  } catch (error) {
    console.error('Commission data fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch commission data" }, { status: 500 });
  }
}
