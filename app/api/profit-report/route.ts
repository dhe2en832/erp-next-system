import { NextResponse } from 'next/server';
import { fetchProfitReport } from '@/lib/erpnext';
import { normalizeProfitReport } from '@/lib/normalizers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from_date, to_date, company, mode, include_hpp } = body || {};
    const effectiveCompany = company || process.env.ERP_DEFAULT_COMPANY || process.env.ERP_COMPANY;

    if (!from_date || !to_date) {
      return NextResponse.json({ success: false, message: 'from_date dan to_date wajib diisi' }, { status: 400 });
    }

    const data = await fetchProfitReport({
      from_date,
      to_date,
      company: effectiveCompany,
      mode: mode || 'valuation',
      include_hpp,
    });
    console.log('Profit report raw', { from_date, to_date, company: effectiveCompany, mode, include_hpp }, data);
    const normalized = normalizeProfitReport(data);

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('Profit report error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Gagal memuat laporan' }, { status: 500 });
  }
}
