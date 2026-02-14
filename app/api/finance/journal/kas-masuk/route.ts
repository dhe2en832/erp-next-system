import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const sid = request.cookies.get('sid')?.value;
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }
  return headers;
}

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
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

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

    // Debit entry: cash account (total — money coming in)
    accounts.push({
      account: cash_account,
      debit_in_account_currency: totalNominal,
      credit_in_account_currency: 0,
      user_remark: `Kas Masuk - ${items.map((i: any) => i.keterangan).join(', ')}`,
    });

    // Credit entries: each income/source category
    for (const item of items) {
      accounts.push({
        account: item.kategori,
        debit_in_account_currency: 0,
        credit_in_account_currency: Number(item.nominal),
        user_remark: item.keterangan,
      });
    }

    const journalPayload = {
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      posting_date,
      company,
      accounts,
      user_remark: `Kas Masuk: ${items.map((i: any) => `${i.keterangan} (Rp ${Number(i.nominal).toLocaleString('id-ID')})`).join('; ')}`,
      total_debit: totalNominal,
      total_credit: totalNominal,
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Journal Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(journalPayload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: `Jurnal Kas Masuk ${data.data?.name || ''} berhasil dibuat`,
      });
    } else {
      const errorMsg = data._server_messages
        ? (() => { try { const msgs = JSON.parse(data._server_messages); return typeof msgs[0] === 'string' ? JSON.parse(msgs[0]).message : msgs[0].message; } catch { return data.message || 'Gagal membuat jurnal'; } })()
        : data.message || 'Gagal membuat jurnal kas masuk';
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: response.status }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
