import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

interface VatInvoiceDetail {
  tanggal: string;
  nomor_invoice: string;
  customer_supplier: string;
  dpp: number; // Dasar Pengenaan Pajak (base amount before tax)
  ppn: number; // PPN amount
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

/**
 * Format currency in Indonesian Rupiah format
 * @param amount - The amount to format
 * @returns Formatted string like "Rp 1.000.000,00"
 */
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  
  return `Rp ${formatted}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const sid = request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const _ak = process.env.ERP_API_KEY;
    const _as = process.env.ERP_API_SECRET;
    const _h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_ak && _as) {
      _h['Authorization'] = `token ${_ak}:${_as}`;
    } else {
      _h['Cookie'] = `sid=${sid}`;
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build GL Entry filters with date range
    const glFilters: any[] = [['company', '=', company]];
    if (fromDate) {
      glFilters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      glFilters.push(['posting_date', '<=', toDate]);
    }

    // Query PPN Output (Sales Tax - Account 2210 - Hutang PPN)
    const ppnOutputFilters = [...glFilters, ['account', 'like', '%2210%']];
    const ppnOutputUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["posting_date","voucher_no","against","credit","debit","remarks"]&filters=${encodeURIComponent(JSON.stringify(ppnOutputFilters))}&order_by=posting_date&limit_page_length=5000`;
    
    const ppnOutputResp = await fetch(ppnOutputUrl, { method: 'GET', headers: _h });
    const ppnOutputData = await ppnOutputResp.json();

    if (!ppnOutputResp.ok) {
      return NextResponse.json(
        { success: false, message: ppnOutputData.exc || ppnOutputData.message || 'Failed to fetch PPN Output data' },
        { status: ppnOutputResp.status }
      );
    }

    // Process PPN Output entries - group by invoice
    const ppnOutputMap = new Map<string, { tanggal: string; customer: string; ppn: number }>();
    let totalPpnOutput = 0;

    (ppnOutputData.data || []).forEach((entry: any) => {
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

    // Convert to array and calculate DPP (base amount)
    const ppnOutputInvoices: VatInvoiceDetail[] = Array.from(ppnOutputMap.entries()).map(([invoiceNo, data]) => {
      // DPP = PPN / 0.11 (assuming 11% tax rate)
      const dpp = data.ppn / 0.11;
      return {
        tanggal: data.tanggal,
        nomor_invoice: invoiceNo,
        customer_supplier: data.customer,
        dpp: dpp,
        ppn: data.ppn,
        formatted_dpp: formatCurrency(dpp),
        formatted_ppn: formatCurrency(data.ppn),
      };
    });

    // Query PPN Input (Purchase Tax - Account 1410 - Pajak Dibayar Dimuka)
    const ppnInputFilters = [...glFilters, ['account', 'like', '%1410%']];
    const ppnInputUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["posting_date","voucher_no","against","debit","credit","remarks"]&filters=${encodeURIComponent(JSON.stringify(ppnInputFilters))}&order_by=posting_date&limit_page_length=5000`;
    
    const ppnInputResp = await fetch(ppnInputUrl, { method: 'GET', headers: _h });
    const ppnInputData = await ppnInputResp.json();

    if (!ppnInputResp.ok) {
      return NextResponse.json(
        { success: false, message: ppnInputData.exc || ppnInputData.message || 'Failed to fetch PPN Input data' },
        { status: ppnInputResp.status }
      );
    }

    // Process PPN Input entries - group by invoice
    const ppnInputMap = new Map<string, { tanggal: string; supplier: string; ppn: number }>();
    let totalPpnInput = 0;

    (ppnInputData.data || []).forEach((entry: any) => {
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

    // Convert to array and calculate DPP (base amount)
    const ppnInputInvoices: VatInvoiceDetail[] = Array.from(ppnInputMap.entries()).map(([invoiceNo, data]) => {
      // DPP = PPN / 0.11 (assuming 11% tax rate)
      const dpp = data.ppn / 0.11;
      return {
        tanggal: data.tanggal,
        nomor_invoice: invoiceNo,
        customer_supplier: data.supplier,
        dpp: dpp,
        ppn: data.ppn,
        formatted_dpp: formatCurrency(dpp),
        formatted_ppn: formatCurrency(data.ppn),
      };
    });

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
  } catch (error) {
    console.error('VAT Report API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
