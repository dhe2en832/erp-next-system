import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClientForRequest } from '@/lib/api-helpers';

/**
 * Debug endpoint untuk memeriksa data komisi
 */
export async function GET(request: NextRequest) {
  try {
    const client = await getERPNextClientForRequest(request);
    const url = new URL(request.url);
    const company = url.searchParams.get('company');

    // Debug: Cek Sales Invoice dengan sales_team
    const filters: any[][] = [['docstatus', '=', 1]];
    if (company) {
      filters.push(['company', '=', company]);
    }

    console.log('[Commission Debug] Fetching Sales Invoices...');
    
    const invoices = await client.getList<{
      name: string;
      customer: string;
      grand_total: number;
    }>('Sales Invoice', {
      filters,
      fields: ['name', 'customer', 'grand_total'],
      limit: 10,
    });

    console.log(`[Commission Debug] Found ${invoices.length} invoices`);

    const debugData = [];
    
    for (const invoice of invoices.slice(0, 5)) { // Ambil 5 invoice pertama untuk debug
      try {
        console.log(`[Commission Debug] Fetching details for ${invoice.name}`);
        
        const invoiceDetail = await client.get<{
          sales_team?: Array<{
            sales_person: string;
            incentives: number;
            commission_rate: number;
          }>;
        }>('Sales Invoice', invoice.name);

        debugData.push({
          invoice_name: invoice.name,
          customer: invoice.customer,
          grand_total: invoice.grand_total,
          sales_team: invoiceDetail.sales_team || [],
          has_commission: (invoiceDetail.sales_team?.length || 0) > 0,
          total_commission: invoiceDetail.sales_team?.reduce((sum, member) => sum + (member.incentives || 0), 0) || 0
        });

      } catch (error) {
        console.error(`[Commission Debug] Error fetching ${invoice.name}:`, error);
        debugData.push({
          invoice_name: invoice.name,
          customer: invoice.customer,
          grand_total: invoice.grand_total,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total_invoices: invoices.length,
        sample_invoices: debugData,
        filters_used: filters,
        company_filter: company
      }
    });

  } catch (error) {
    console.error('[Commission Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}