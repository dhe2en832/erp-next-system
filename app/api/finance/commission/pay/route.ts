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

export async function POST(request: NextRequest) {
  try {
    const headers = getAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      company,
      sales_person,
      posting_date,
      mode_of_payment,
      paid_from_account,
      invoices, // Array of { invoice_name, commission_amount }
    } = body;

    if (!company || !sales_person || !invoices || invoices.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company, sales_person, and invoices are required' },
        { status: 400 }
      );
    }

    const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.commission_amount || 0), 0);

    // Step 1: Create Journal Entry for commission payment
    // Debit: Commission Expense account, Credit: Cash/Bank account
    const journalEntry = {
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      company,
      posting_date: posting_date || new Date().toISOString().split('T')[0],
      user_remark: `Pembayaran Komisi Sales: ${sales_person} - ${invoices.map((i: any) => i.invoice_name).join(', ')}`,
      accounts: [
        {
          account: '519000 - Biaya Komisi Penjualan - BAC',
          debit_in_account_currency: totalAmount,
          credit_in_account_currency: 0,
          party_type: '',
          party: '',
          cost_center: 'Main - BAC',
        },
        {
          account: paid_from_account || '111100 - Kas - BAC',
          debit_in_account_currency: 0,
          credit_in_account_currency: totalAmount,
          party_type: '',
          party: '',
          cost_center: 'Main - BAC',
        },
      ],
    };

    console.log('Creating Journal Entry for commission:', JSON.stringify(journalEntry, null, 2));

    const jeResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Journal Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: journalEntry }),
    });

    const jeData = await jeResponse.json();

    if (!jeResponse.ok) {
      console.error('Failed to create Journal Entry:', jeData);
      return NextResponse.json(
        { success: false, message: jeData.message || 'Failed to create journal entry for commission payment' },
        { status: jeResponse.status }
      );
    }

    const journalEntryName = jeData.data?.name;
    console.log('Journal Entry created:', journalEntryName);

    // Step 2: Mark each invoice as commission paid
    const markResults = [];
    for (const inv of invoices) {
      try {
        const markResponse = await fetch(
          `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(inv.invoice_name)}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              data: { custom_commission_paid: 1 }
            }),
          }
        );
        const markData = await markResponse.json();
        markResults.push({
          invoice: inv.invoice_name,
          success: markResponse.ok,
          message: markResponse.ok ? 'Marked as paid' : (markData.message || 'Failed to mark'),
        });
      } catch (err) {
        markResults.push({
          invoice: inv.invoice_name,
          success: false,
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        journal_entry: journalEntryName,
        total_amount: totalAmount,
        invoices_marked: markResults,
      },
      message: `Pembayaran komisi berhasil. Jurnal: ${journalEntryName}`,
    });
  } catch (error) {
    console.error('Commission Pay API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
