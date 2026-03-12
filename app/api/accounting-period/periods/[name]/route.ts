import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import type { AccountingPeriod } from '@/types/accounting-period';

// GET /api/accounting-period/periods/[name]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const params = await context.params;
    
    // Decode the period name (handle double encoding)
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }

    // Fetch period details from ERPNext
    const period = await client.get<AccountingPeriod>('Accounting Period', periodName);

    // Fetch account balances for this period
    interface GLEntryDetail {
      account: string;
      debit: number;
      credit: number;
    }
    const glEntries = await client.getList<GLEntryDetail>('GL Entry', {
      filters: [
        ['company', '=', period.company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
      ],
      fields: ['account', 'debit', 'credit'],
      limit: 10000,
    });

    // Get account details
    interface AccountDetail {
      name: string;
      account_name: string;
      root_type: string;
      account_type: string;
    }
    const accounts = await client.getList<AccountDetail>('Account', {
      filters: [['company', '=', period.company]],
      fields: ['name', 'account_name', 'root_type', 'account_type'],
      limit: 10000,
    });

    const accountMap = new Map<string, AccountDetail>(accounts.map((acc) => [acc.name, acc]));

    // Aggregate balances by account
    interface AccountBalanceRecord {
      account: string;
      account_name: string;
      root_type: string;
      account_type: string;
      debit: number;
      credit: number;
      balance: number;
    }
    const accountBalances: Record<string, AccountBalanceRecord> = {};
    
    glEntries.forEach((entry) => {
      const accountInfo = accountMap.get(entry.account);
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = {
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: accountInfo?.root_type || 'Unknown',
          account_type: accountInfo?.account_type || 'Unknown',
          debit: 0,
          credit: 0,
          balance: 0,
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      accountBalances[entry.account].balance += (entry.debit || 0) - (entry.credit || 0);
    });

    const account_balances = Object.values(accountBalances);

    // Fetch closing journal if exists
    let closing_journal = null;
    if (period.closing_journal_entry) {
      try {
        closing_journal = await client.get('Journal Entry', period.closing_journal_entry);
      } catch (err) {
        console.warn('Failed to fetch closing journal:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...period,
        account_balances,
        closing_journal,
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/accounting-period/periods/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// PUT /api/accounting-period/periods/[name]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const params = await context.params;
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }
    
    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = ['remarks', 'fiscal_year'];
    const updateData: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Check if period is permanently closed
    const period = await client.get<AccountingPeriod>('Accounting Period', periodName);
    
    if (period.status === 'Permanently Closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot update a permanently closed period',
        },
        { status: 422 }
      );
    }

    // Update period in ERPNext
    const updatedPeriod = await client.update<AccountingPeriod>(
      'Accounting Period',
      periodName,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
      message: 'Period updated successfully',
    });
  } catch (error: unknown) {
    logSiteError(error, 'PUT /api/accounting-period/periods/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// DELETE /api/accounting-period/periods/[name]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const params = await context.params;
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }

    // Check if period is closed
    const period = await client.get<AccountingPeriod>('Accounting Period', periodName);
    
    if (period.status === 'Closed' || period.status === 'Permanently Closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot delete a closed period. Please reopen it first.',
        },
        { status: 422 }
      );
    }

    // Delete period from ERPNext
    await client.delete('Accounting Period', periodName);

    return NextResponse.json({
      success: true,
      message: 'Period deleted successfully',
    });
  } catch (error: unknown) {
    logSiteError(error, 'DELETE /api/accounting-period/periods/[name]', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
