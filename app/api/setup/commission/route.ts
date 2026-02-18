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
      `${process.env.ERP_URL}/api/resource/Sales Invoice?fields=["name","base_grand_total","posting_date","status","sales_team.sales_person"]&filters=[["docstatus","=",1],["status","=","Paid"],["sales_team.sales_person","=","${salesPerson}"]]`,
      {
        headers: {
          'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        },
      }
    );

    const invoiceResult = await invoiceResponse.json();

    // Hitung total komisi (asumsi 5% dari sales person)
    const totalSales = soResult.data.reduce((sum: number, so: any) => sum + so.base_grand_total, 0);
    const totalPaid = invoiceResult.data.reduce((sum: number, inv: any) => sum + inv.base_grand_total, 0);
    const commissionRate = 0.05; // 5%
    const potentialCommission = totalSales * commissionRate;
    const earnedCommission = totalPaid * commissionRate;

    return NextResponse.json({
      summary: {
        total_sales: totalSales,
        total_paid: totalPaid,
        potential_commission: potentialCommission,
        earned_commission: earnedCommission,
        commission_rate: commissionRate * 100
      },
      sales_orders: soResult.data,
      paid_invoices: invoiceResult.data
    });

  } catch (error) {
    console.error('Commission data fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch commission data" }, { status: 500 });
  }
}
