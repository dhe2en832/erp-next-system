import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/finance/journal/kas-keluar
 * Creates a Journal Entry for cash outflow (Kas Keluar) with multiple items.
 * 
 * Payload:
 * {
 *   posting_date: "2024-01-15",
 *   cash_account: "111100 - Kas - BAC",
 *   company: "Company Name",
 *   items: [
 *     { keterangan: "Beli ATK", nominal: 50000, kategori: "511000 - Biaya ATK - BAC" },
 *     { keterangan: "Transport", nominal: 25000, kategori: "512000 - Biaya Transport - BAC" }
 *   ]
 * }
 * 
 * Journal Entry:
 * - Each item category account = DEBIT (expense)
 * - Cash account = CREDIT (total sum)
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    const { posting_date, cash_account, company, items } = body;

    if (!posting_date || !cash_account || !company || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'posting_date, cash_account, company, dan items harus diisi' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.keterangan || !item.nominal || !item.kategori) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki keterangan, nominal, dan kategori' },
          { status: 400 }
        );
      }
      if (item.nominal <= 0) {
        return NextResponse.json(
          { success: false, message: 'Nominal harus lebih dari 0' },
          { status: 400 }
        );
      }
    }

    const totalNominal = items.reduce((sum: number, item: any) => sum + Number(item.nominal), 0);

    // Build Journal Entry accounts
    const accounts: any[] = [];

    // Debit entries: each expense category
    for (const item of items) {
      accounts.push({
        account: item.kategori,
        debit_in_account_currency: Number(item.nominal),
        credit_in_account_currency: 0,
        user_remark: `Kas Keluar: ${item.keterangan}`,
      });
    }

    // Credit entry: cash account (total)
    accounts.push({
      account: cash_account,
      debit_in_account_currency: 0,
      credit_in_account_currency: totalNominal,
      user_remark: `Kas Keluar - ${items.map((i: any) => i.keterangan).join(', ')}`,
    });

    const journalPayload = {
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      posting_date,
      company,
      accounts,
      user_remark: `Kas Keluar: ${items.map((i: any) => `${i.keterangan} (Rp ${Number(i.nominal).toLocaleString('id-ID')})`).join('; ')}`,
      total_debit: totalNominal,
      total_credit: totalNominal,
    };

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const result = await client.insert('Journal Entry', journalPayload);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Jurnal Kas Keluar ${result?.name || ''} berhasil dibuat`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/journal/kas-keluar', siteId);
    
    let errorMsg = 'Gagal membuat jurnal kas keluar';
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
