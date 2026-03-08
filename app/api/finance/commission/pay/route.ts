import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // Check site-specific cookie first, fallback to generic sid
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

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

    // Use client method to create Journal Entry
    const jeData = await client.insert('Journal Entry', journalEntry);
    const journalEntryName = jeData?.name;

    // Step 1b: Submit the Journal Entry (docstatus = 1)
    if (journalEntryName) {
      try {
        await client.update('Journal Entry', journalEntryName, { docstatus: 1 });
      } catch (err) {
        console.error('Error submitting Journal Entry:', err);
      }
    }

    // Step 2: Mark each invoice as commission paid
    const markResults = [];
    for (const inv of invoices) {
      try {
        await client.update('Sales Invoice', inv.invoice_name, { custom_commission_paid: 1 });
        markResults.push({
          invoice: inv.invoice_name,
          success: true,
          message: 'Marked as paid',
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
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/finance/commission/pay', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
