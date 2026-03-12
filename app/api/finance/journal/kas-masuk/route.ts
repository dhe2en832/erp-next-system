import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * POST /api/finance/journal/kas-masuk
 * Creates a Journal Entry for cash inflow (Kas Masuk) with multiple items.
 * 
 * Payload:
 * {
 *   posting_date: "2024-01-15",
 *   cash_account: "111100 - Kas - BAC",
 *   company: "Company Name",
 *   items: [
 *     { keterangan: "Penjualan Tunai", nominal: 100000, kategori: "411000 - Penjualan - BAC" },
 *     { keterangan: "Pendapatan Lain", nominal: 50000, kategori: "420000 - Pendapatan Lain - BAC" }
 *   ]
 * }
 * 
 * Journal Entry:
 * - Cash account = DEBIT (total sum — cash received)
 * - Each item category account = CREDIT (income/source)
 */
export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const body = await request.json();
    interface KasMasukItem {
      keterangan: string;
      nominal: number;
      kategori: string;
    }
    const { posting_date, cash_account, company, items } = body as {
      posting_date: string;
      cash_account: string;
      company: string;
      items: KasMasukItem[];
    };

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

    const totalNominal = items.reduce((sum: number, item) => sum + Number(item.nominal), 0);

    // Build Journal Entry accounts
    interface JournalEntryAccount {
      account: string;
      debit_in_account_currency: number;
      credit_in_account_currency: number;
      user_remark: string;
    }
    const accounts: JournalEntryAccount[] = [];

    // Debit entry: cash account (total — money coming in)
    accounts.push({
      account: cash_account,
      debit_in_account_currency: totalNominal,
      credit_in_account_currency: 0,
      user_remark: `Kas Masuk - ${items.map((i) => i.keterangan).join(', ')}`,
    });

    // Credit entries: each income/source category
    for (const item of items) {
      accounts.push({
        account: item.kategori,
        debit_in_account_currency: 0,
        credit_in_account_currency: Number(item.nominal),
        user_remark: `Kas Masuk: ${item.keterangan}`,
      });
    }

    const journalPayload = {
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      posting_date,
      company,
      accounts,
      user_remark: `Kas Masuk: ${items.map((i) => `${i.keterangan} (Rp ${Number(i.nominal).toLocaleString('id-ID')})`).join('; ')}`,
      total_debit: totalNominal,
      total_credit: totalNominal,
    };

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    const result = await client.insert<{ name: string }>('Journal Entry', journalPayload);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Jurnal Kas Masuk ${result?.name || ''} berhasil dibuat`,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/journal/kas-masuk', siteId);
    
    let errorMsg = 'Gagal membuat jurnal kas masuk';
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
