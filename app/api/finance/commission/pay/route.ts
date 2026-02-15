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
      employee_id,
      posting_date,
      mode_of_payment,
      paid_from_account,
      commission_expense_account,
      invoices, // Array of { invoice_name, commission_amount }
    } = body;

    if (!company || !sales_person || !invoices || invoices.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company, sales_person, and invoices are required' },
        { status: 400 }
      );
    }

    const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.commission_amount || 0), 0);
    
    // Build account names based on company
    // Extract company abbreviation (e.g., "Berkat Abadi Cirebon" -> "BAC")
    const companyWords = company.split(' ');
    const companyAbbr = companyWords.length > 1 
      ? companyWords.map((w: string) => w[0]).join('').toUpperCase()
      : company.substring(0, 3).toUpperCase();
    
    const liabilityAccount = commission_expense_account || `2150.0001 - Hutang Komisi Sales - ${companyAbbr}`;
    const cashAccount = paid_from_account;

    console.log('[DEBUG] Using accounts:', { liabilityAccount, cashAccount, company });

    // Step 1: Create Journal Entry for commission payment
    // Debit: Hutang Komisi Sales (liability) with Party Type Employee if employee_id provided
    // Credit: Cash/Bank account
    const debitEntry: any = {
      account: liabilityAccount,
      debit_in_account_currency: totalAmount,
      credit_in_account_currency: 0,
    };

    // If employee_id is provided, set Party Type = Employee
    if (employee_id) {
      debitEntry.party_type = 'Employee';
      debitEntry.party = employee_id;
    }

    const creditEntry: any = {
      account: cashAccount,
      debit_in_account_currency: 0,
      credit_in_account_currency: totalAmount,
    };

    const journalEntry = {
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      company,
      posting_date: posting_date || new Date().toISOString().split('T')[0],
      user_remark: `Pembayaran Komisi Sales: ${sales_person} - ${invoices.map((i: any) => i.invoice_name).join(', ')}`,
      accounts: [debitEntry, creditEntry],
    };

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

    // Step 1b: Submit the Journal Entry (docstatus = 1)
    if (journalEntryName) {
      try {
        const submitResponse = await fetch(
          `${ERPNEXT_API_URL}/api/resource/Journal Entry/${encodeURIComponent(journalEntryName)}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              data: { docstatus: 1 }
            }),
          }
        );
        const submitData = await submitResponse.json();
        if (submitResponse.ok) {
          console.log('Journal Entry submitted:', journalEntryName);
        } else {
          console.error('Failed to submit Journal Entry:', submitData);
        }
      } catch (err) {
        console.error('Error submitting Journal Entry:', err);
      }
    }

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
