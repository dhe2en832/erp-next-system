import { NextRequest, NextResponse } from 'next/server';
import { formatCurrency } from '@/utils/format';
import { validateDateRange } from '@/utils/report-validation';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

interface VatInvoiceDetail {
  tanggal: string;
  nomor_invoice: string;
  customer_supplier: string;
  dpp: number; // Dasar Pengenaan Pajak (base amount before tax)
  ppn: number; // PPN amount
  tax_rate: number; // Tax rate as percentage (e.g., 11 for 11%)
  formatted_dpp: string;
  formatted_ppn: string;
}

interface VatReportData {
  ppn_output: {
    invoices: VatInvoiceDetail[];
    total: number;
    formatted_total: string;
  };
  ppn_input: {
    invoices: VatInvoiceDetail[];
    total: number;
    formatted_total: string;
  };
  summary: {
    total_ppn_output: number;
    total_ppn_input: number;
    ppn_kurang_lebih_bayar: number; // Output - Input (positive = payable, negative = refundable)
    formatted: {
      total_ppn_output: string;
      total_ppn_input: string;
      ppn_kurang_lebih_bayar: string;
    };
  };
  period: {
    from_date: string | null;
    to_date: string | null;
  };
}

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
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

    // Build GL Entry filters with date range
    const glFilters: any[][] = [['company', '=', company]];
    if (fromDate) {
      glFilters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      glFilters.push(['posting_date', '<=', toDate]);
    }

    // Query PPN Output (Sales Tax - Account 2210 - Hutang PPN)
    const ppnOutputFilters = [...glFilters, ['account', 'like', '%2210%']];
    const ppnOutputData = await client.getList('GL Entry', {
      fields: ['posting_date', 'voucher_no', 'against', 'credit', 'debit', 'remarks'],
      filters: ppnOutputFilters,
      order_by: 'posting_date',
      limit_page_length: 5000
    });

    // Process PPN Output entries - group by invoice
    const ppnOutputMap = new Map<string, { tanggal: string; customer: string; ppn: number }>();
    let totalPpnOutput = 0;

    (ppnOutputData || []).forEach((entry: any) => {
      const ppnAmount = (entry.credit || 0) - (entry.debit || 0); // Credit is PPN liability
      if (ppnAmount > 0 && entry.voucher_no) {
        if (!ppnOutputMap.has(entry.voucher_no)) {
          ppnOutputMap.set(entry.voucher_no, {
            tanggal: entry.posting_date || '',
            customer: entry.against || '',
            ppn: 0,
          });
        }
        const invoice = ppnOutputMap.get(entry.voucher_no)!;
        invoice.ppn += ppnAmount;
        totalPpnOutput += ppnAmount;
      }
    });

    // Convert to array and calculate DPP (base amount) with dynamic tax rate
    const ppnOutputInvoices: VatInvoiceDetail[] = await Promise.all(
      Array.from(ppnOutputMap.entries()).map(async ([invoiceNo, data]) => {
        let taxRate = 0.11; // Default to 11%
        
        try {
          const invoiceResponse = await client.get('Sales Invoice', invoiceNo) as any;
          const taxes = invoiceResponse.data?.taxes || [];
          if (taxes.length > 0 && taxes[0].rate) {
            taxRate = taxes[0].rate / 100; // Convert percentage to decimal
          }
        } catch (error) {
          console.error(`Error fetching tax rate for ${invoiceNo}:`, error);
        }
        
        const dpp = data.ppn / taxRate;
        return {
          tanggal: data.tanggal,
          nomor_invoice: invoiceNo,
          customer_supplier: data.customer,
          dpp: dpp,
          ppn: data.ppn,
          tax_rate: taxRate * 100, // Store as percentage
          formatted_dpp: formatCurrency(dpp),
          formatted_ppn: formatCurrency(data.ppn),
        };
      })
    );

    // Query PPN Input (Purchase Tax - Account 1410 - Pajak Dibayar Dimuka)
    const ppnInputFilters = [...glFilters, ['account', 'like', '%1410%']];
    const ppnInputData = await client.getList('GL Entry', {
      fields: ['posting_date', 'voucher_no', 'against', 'debit', 'credit', 'remarks'],
      filters: ppnInputFilters,
      order_by: 'posting_date',
      limit_page_length: 5000
    });

    // Process PPN Input entries - group by invoice
    const ppnInputMap = new Map<string, { tanggal: string; supplier: string; ppn: number }>();
    let totalPpnInput = 0;

    (ppnInputData || []).forEach((entry: any) => {
      const ppnAmount = (entry.debit || 0) - (entry.credit || 0); // Debit is PPN asset (prepaid tax)
      if (ppnAmount > 0 && entry.voucher_no) {
        if (!ppnInputMap.has(entry.voucher_no)) {
          ppnInputMap.set(entry.voucher_no, {
            tanggal: entry.posting_date || '',
            supplier: entry.against || '',
            ppn: 0,
          });
        }
        const invoice = ppnInputMap.get(entry.voucher_no)!;
        invoice.ppn += ppnAmount;
        totalPpnInput += ppnAmount;
      }
    });

    // Convert to array and calculate DPP (base amount) with dynamic tax rate
    const ppnInputInvoices: VatInvoiceDetail[] = await Promise.all(
      Array.from(ppnInputMap.entries()).map(async ([invoiceNo, data]) => {
        let taxRate = 0.11; // Default to 11%
        
        try {
          const invoiceResponse = await client.get('Purchase Invoice', invoiceNo) as any;
          const taxes = invoiceResponse.data?.taxes || [];
          if (taxes.length > 0 && taxes[0].rate) {
            taxRate = taxes[0].rate / 100; // Convert percentage to decimal
          }
        } catch (error) {
          console.error(`Error fetching tax rate for ${invoiceNo}:`, error);
        }
        
        const dpp = data.ppn / taxRate;
        return {
          tanggal: data.tanggal,
          nomor_invoice: invoiceNo,
          customer_supplier: data.supplier,
          dpp: dpp,
          ppn: data.ppn,
          tax_rate: taxRate * 100, // Store as percentage
          formatted_dpp: formatCurrency(dpp),
          formatted_ppn: formatCurrency(data.ppn),
        };
      })
    );

    // Calculate summary
    const ppnKurangLebihBayar = totalPpnOutput - totalPpnInput;

    // Initialize report data structure
    const reportData: VatReportData = {
      ppn_output: {
        invoices: ppnOutputInvoices,
        total: totalPpnOutput,
        formatted_total: formatCurrency(totalPpnOutput),
      },
      ppn_input: {
        invoices: ppnInputInvoices,
        total: totalPpnInput,
        formatted_total: formatCurrency(totalPpnInput),
      },
      summary: {
        total_ppn_output: totalPpnOutput,
        total_ppn_input: totalPpnInput,
        ppn_kurang_lebih_bayar: ppnKurangLebihBayar,
        formatted: {
          total_ppn_output: formatCurrency(totalPpnOutput),
          total_ppn_input: formatCurrency(totalPpnInput),
          ppn_kurang_lebih_bayar: formatCurrency(ppnKurangLebihBayar),
        },
      },
      period: {
        from_date: fromDate,
        to_date: toDate,
      },
    };

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/reports/vat-report', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
