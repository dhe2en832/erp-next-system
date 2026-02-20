import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

interface VatInvoiceDetail {
  tanggal: string;
  nomor_invoice: string;
  customer_supplier: string;
  dpp: number;
  ppn: number;
}

/**
 * Export VAT Report to Excel in SPT PPN format
 */
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
    const ppnOutputUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["posting_date","voucher_no","against","credit","debit"]&filters=${encodeURIComponent(JSON.stringify(ppnOutputFilters))}&order_by=posting_date&limit_page_length=5000`;
    
    const ppnOutputResp = await fetch(ppnOutputUrl, { method: 'GET', headers: _h });
    const ppnOutputApiData = await ppnOutputResp.json();

    if (!ppnOutputResp.ok) {
      return NextResponse.json(
        { success: false, message: ppnOutputApiData.exc || ppnOutputApiData.message || 'Failed to fetch PPN Output data' },
        { status: ppnOutputResp.status }
      );
    }

    // Process PPN Output entries
    const ppnOutputMap = new Map<string, { tanggal: string; customer: string; ppn: number }>();
    let totalPpnOutput = 0;

    (ppnOutputApiData.data || []).forEach((entry: any) => {
      const ppnAmount = (entry.credit || 0) - (entry.debit || 0);
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

    const ppnOutputInvoices: VatInvoiceDetail[] = Array.from(ppnOutputMap.entries()).map(([invoiceNo, data]) => {
      const dpp = data.ppn / 0.11;
      return {
        tanggal: data.tanggal,
        nomor_invoice: invoiceNo,
        customer_supplier: data.customer,
        dpp: dpp,
        ppn: data.ppn,
      };
    });

    // Query PPN Input (Purchase Tax - Account 1410 - Pajak Dibayar Dimuka)
    const ppnInputFilters = [...glFilters, ['account', 'like', '%1410%']];
    const ppnInputUrl = `${ERPNEXT_API_URL}/api/resource/GL Entry?fields=["posting_date","voucher_no","against","debit","credit"]&filters=${encodeURIComponent(JSON.stringify(ppnInputFilters))}&order_by=posting_date&limit_page_length=5000`;
    
    const ppnInputResp = await fetch(ppnInputUrl, { method: 'GET', headers: _h });
    const ppnInputApiData = await ppnInputResp.json();

    if (!ppnInputResp.ok) {
      return NextResponse.json(
        { success: false, message: ppnInputApiData.exc || ppnInputApiData.message || 'Failed to fetch PPN Input data' },
        { status: ppnInputResp.status }
      );
    }

    // Process PPN Input entries
    const ppnInputMap = new Map<string, { tanggal: string; supplier: string; ppn: number }>();
    let totalPpnInput = 0;

    (ppnInputApiData.data || []).forEach((entry: any) => {
      const ppnAmount = (entry.debit || 0) - (entry.credit || 0);
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

    const ppnInputInvoices: VatInvoiceDetail[] = Array.from(ppnInputMap.entries()).map(([invoiceNo, data]) => {
      const dpp = data.ppn / 0.11;
      return {
        tanggal: data.tanggal,
        nomor_invoice: invoiceNo,
        customer_supplier: data.supplier,
        dpp: dpp,
        ppn: data.ppn,
      };
    });

    // Calculate summary
    const ppnKurangLebihBayar = totalPpnOutput - totalPpnInput;

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['LAPORAN PPN (SPT MASA PPN)'],
      ['Perusahaan:', company],
      ['Periode:', `${fromDate || 'Awal'} s/d ${toDate || 'Akhir'}`],
      [],
      ['RINGKASAN'],
      ['Total PPN Output (Penjualan)', totalPpnOutput],
      ['Total PPN Input (Pembelian)', totalPpnInput],
      ['PPN Kurang/Lebih Bayar', ppnKurangLebihBayar],
      [],
      ['Keterangan:'],
      ['- Nilai positif = PPN yang harus disetor'],
      ['- Nilai negatif = PPN lebih bayar (dapat dikreditkan)'],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    // Sheet 2: PPN Output (Sales)
    const ppnOutputData: any[] = [
      ['LAPORAN PPN OUTPUT (PENJUALAN)'],
      ['Periode:', `${fromDate || 'Awal'} s/d ${toDate || 'Akhir'}`],
      [],
      ['Tanggal', 'Nomor Invoice', 'Customer', 'DPP (Dasar Pengenaan Pajak)', 'PPN 11%'],
    ];
    ppnOutputInvoices.forEach(inv => {
      ppnOutputData.push([
        inv.tanggal,
        inv.nomor_invoice,
        inv.customer_supplier,
        inv.dpp,
        inv.ppn,
      ]);
    });
    ppnOutputData.push([]);
    ppnOutputData.push(['', '', 'TOTAL', '', totalPpnOutput]);
    
    const ppnOutputSheet = XLSX.utils.aoa_to_sheet(ppnOutputData);
    XLSX.utils.book_append_sheet(workbook, ppnOutputSheet, 'PPN Output');

    // Sheet 3: PPN Input (Purchase)
    const ppnInputData: any[] = [
      ['LAPORAN PPN INPUT (PEMBELIAN)'],
      ['Periode:', `${fromDate || 'Awal'} s/d ${toDate || 'Akhir'}`],
      [],
      ['Tanggal', 'Nomor Invoice', 'Supplier', 'DPP (Dasar Pengenaan Pajak)', 'PPN 11%'],
    ];
    ppnInputInvoices.forEach(inv => {
      ppnInputData.push([
        inv.tanggal,
        inv.nomor_invoice,
        inv.customer_supplier,
        inv.dpp,
        inv.ppn,
      ]);
    });
    ppnInputData.push([]);
    ppnInputData.push(['', '', 'TOTAL', '', totalPpnInput]);
    
    const ppnInputSheet = XLSX.utils.aoa_to_sheet(ppnInputData);
    XLSX.utils.book_append_sheet(workbook, ppnInputSheet, 'PPN Input');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with period
    const filename = `Laporan_PPN_${fromDate || 'All'}_${toDate || 'All'}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('VAT Report Export API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
