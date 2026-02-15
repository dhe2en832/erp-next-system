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
 * POST /api/finance/payments/bounce-warkat
 * Proxy to ERPNext server script: bounce_warkat_payment
 * 
 * Payload: { company, payment_entry, reason, payment_type }
 * PAY:     Journal Entry: Dr Warkat Keluar → Cr Hutang Dagang (hutang muncul kembali)
 * RECEIVE: Journal Entry: Dr Piutang Dagang → Cr Warkat Masuk (piutang muncul kembali)
 */
export async function POST(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company, payment_entry, reason, payment_type } = body;

    if (!company || !payment_entry) {
      return NextResponse.json({
        success: false,
        message: 'Field company dan payment_entry wajib diisi',
      }, { status: 400 });
    }

    console.log('=== BOUNCE WARKAT PAYMENT ===');
    console.log('Payload:', { company, payment_entry, reason, payment_type });

    const erpUrl = `${ERPNEXT_API_URL}/api/method/bounce_warkat_payment`;

    const response = await fetch(erpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ company, payment_entry, reason: reason || 'Warkat ditolak', payment_type }),
    });

    const data = await response.json();
    console.log('Bounce Warkat Response:', response.status, data);

    if (response.ok && data.message) {
      return NextResponse.json({
        success: true,
        journal_entry: data.message.journal_entry || data.message,
        status: 'Bounced',
        message: `Warkat ${payment_entry} berhasil ditolak`,
      });
    } else {
      const errorMsg = data.message || data.exc || 'Gagal menolak warkat';
      return NextResponse.json({ success: false, message: errorMsg }, { status: response.status || 500 });
    }
  } catch (error) {
    console.error('Bounce Warkat Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
