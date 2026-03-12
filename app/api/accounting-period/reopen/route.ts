import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { ERPNextClient } from '@/lib/erpnext';
import type { AccountingPeriod } from '@/types/accounting-period';

export async function POST(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const body = await request.json();
    const { period_name, company, reason, force_permanent = false } = body;

    if (!period_name || !company || !reason) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name, company, and reason are required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await client.get<AccountingPeriod>('Accounting Period', period_name);

    // Validate period status
    if (period.status === 'Open') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period is already open' },
        { status: 422 }
      );
    }

    // Check if trying to reopen permanently closed period without force flag
    if (period.status === 'Permanently Closed' && !force_permanent) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Cannot reopen a permanently closed period without force_permanent flag' },
        { status: 422 }
      );
    }

    // Check if next period is closed
    const nextPeriods = await client.getList<AccountingPeriod>('Accounting Period', {
      filters: [
        ['company', '=', company],
        ['start_date', '>', period.end_date],
        ['status', 'in', ['Closed', 'Permanently Closed']],
      ],
      fields: ['name', 'period_name', 'start_date'],
      limit: 1,
      order_by: 'start_date asc',
    });

    if (nextPeriods.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'VALIDATION_ERROR', 
          message: `Cannot reopen period because next period "${nextPeriods[0].period_name}" is already closed` 
        },
        { status: 422 }
      );
    }

    // Get session cookie to identify actual user
    const sessionCookie = request.cookies.get('sid')?.value;
    const currentUser = sessionCookie ? await client.getCurrentUser(sessionCookie) : 'System';

    // CRITICAL: Handle closing journal entry cancellation/reversal
    let journalCancellationResult = { success: false, method: 'none' as 'cancel' | 'reversal' | 'none', original_journal: null as string | null, reversal_journal: null as string | null, details: { action: '', timestamp: '' } };
    
    if (period.closing_journal_entry && period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
      journalCancellationResult = await handleClosingJournalCancellation(
        period.closing_journal_entry,
        period,
        client
      );
    }

    // Update period status to Open
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const updateData: Record<string, unknown> = {
      status: 'Open',
      closed_by: null,
      closed_on: null,
    };

    // Only clear closing_journal_entry if it exists and is not NO_CLOSING_JOURNAL
    if (period.closing_journal_entry && period.closing_journal_entry !== 'NO_CLOSING_JOURNAL') {
      updateData.closing_journal_entry = null;
    }

    // If reopening permanently closed period, also clear permanent closure fields
    if (period.status === 'Permanently Closed') {
      updateData.permanently_closed_by = null;
      updateData.permanently_closed_on = null;
    }

    // CRITICAL: Set all closed_documents[].closed = 0 to allow transactions
    // This is required because ERPNext checks both status AND closed_documents flags
    if (period.closed_documents && Array.isArray(period.closed_documents)) {
      updateData.closed_documents = period.closed_documents.map((doc: Record<string, unknown>) => ({
        ...doc,
        closed: 0
      }));
    }

    await client.update('Accounting Period', period_name, updateData);

    // Create audit log with appropriate reason
    const auditReason = period.status === 'Permanently Closed' 
      ? `Reopened from permanent closure: ${reason}` 
      : reason;

    await client.insert('Period Closing Log', {
      accounting_period: period_name,
      action_type: 'Reopened',
      action_by: currentUser,
      action_date: erpnextDatetime,
      reason: auditReason,
      before_snapshot: JSON.stringify({ status: period.status }),
      after_snapshot: JSON.stringify({ status: 'Open' }),
    });

    return NextResponse.json({
      success: true,
      message: 'Period reopened successfully',
      journal_cancellation: journalCancellationResult,
    });
  } catch (error: unknown) {
    logSiteError(error, 'POST /api/accounting-period/reopen', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Handle closing journal entry cancellation or reversal
 * 
 * Strategy:
 * 1. Try to CANCEL the journal entry (primary method - safest)
 * 2. If cancel fails, create REVERSAL journal entry (fallback)
 * 
 * Returns: { 
 *   success: boolean, 
 *   method: 'cancel' | 'reversal' | 'none', 
 *   original_journal: string | null,
 *   reversal_journal: string | null,
 *   details: { action: string, timestamp: string }
 * }
 */
async function handleClosingJournalCancellation(
  journalName: string,
  period: AccountingPeriod,
  client: ERPNextClient
): Promise<{ 
  success: boolean; 
  method: 'cancel' | 'reversal' | 'none'; 
  original_journal: string | null;
  reversal_journal: string | null;
  details: { action: string; timestamp: string };
}> {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Step 1: Try to cancel the journal entry
    try {
      await client.cancel('Journal Entry', journalName);

      return {
        success: true,
        method: 'cancel',
        original_journal: journalName,
        reversal_journal: null,
        details: {
          action: `Closing journal ${journalName} cancelled successfully`,
          timestamp,
        },
      };
    } catch (cancelError) {
      // If cancel fails, proceed to reversal
      console.log(`Cancel failed for ${journalName}, attempting reversal...`, cancelError);
    }

    // Step 2: If cancel failed, create reversal journal entry
    const reversalResult = await createReversalJournal(journalName, period, client);
    
    return reversalResult;
  } catch (error) {
    console.error('Error handling closing journal cancellation:', error);
    return {
      success: false,
      method: 'none',
      original_journal: null,
      reversal_journal: null,
      details: {
        action: `Error handling journal cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
      },
    };
  }
}

/**
 * Create reversal journal entry (balik jurnal)
 * 
 * Reversal logic:
 * - For each debit entry in original journal → create credit entry in reversal
 * - For each credit entry in original journal → create debit entry in reversal
 * - Posting date = today (or period end date)
 * - Remark: "Reversal of [original journal name]"
 */
async function createReversalJournal(
  originalJournalName: string,
  period: AccountingPeriod,
  client: ERPNextClient
): Promise<{ 
  success: boolean; 
  method: 'reversal'; 
  original_journal: string | null;
  reversal_journal: string | null;
  details: { action: string; timestamp: string };
}> {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Get original journal entry details
    interface JournalEntryWithAccounts {
      name: string;
      accounts: {
        account: string;
        credit_in_account_currency: number;
        debit_in_account_currency: number;
        user_remark?: string;
      }[];
    }
    const originalJournal = await client.get<JournalEntryWithAccounts>('Journal Entry', originalJournalName);

    if (!originalJournal.accounts || originalJournal.accounts.length === 0) {
      throw new Error(`No accounts found in original journal ${originalJournalName}`);
    }

    // Build reversal accounts (flip debit/credit)
    const reversalAccounts = originalJournal.accounts.map((acc) => ({
      account: acc.account,
      debit_in_account_currency: acc.credit_in_account_currency || 0,
      credit_in_account_currency: acc.debit_in_account_currency || 0,
      user_remark: `Reversal: ${acc.user_remark || acc.account}`,
    }));

    // Create reversal journal entry
    const reversalJournal = await client.insert<{ name: string }>('Journal Entry', {
      voucher_type: 'Journal Entry',
      posting_date: period.end_date,
      company: period.company,
      accounts: reversalAccounts,
      user_remark: `Reversal of closing entry ${originalJournalName} - Period reopened`,
      accounting_period: period.name,
    });

    // Submit the reversal journal
    await client.submit('Journal Entry', reversalJournal.name);

    return {
      success: true,
      method: 'reversal',
      original_journal: originalJournalName,
      reversal_journal: reversalJournal.name,
      details: {
        action: `Reversal journal ${reversalJournal.name} created for original journal ${originalJournalName}`,
        timestamp,
      },
    };
  } catch (error) {
    console.error('Error creating reversal journal:', error);
    return {
      success: false,
      method: 'reversal',
      original_journal: originalJournalName,
      reversal_journal: null,
      details: {
        action: `Error creating reversal journal: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
      },
    };
  }
}
