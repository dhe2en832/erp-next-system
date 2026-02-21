import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';
import type { AccountingPeriod, GetPeriodDetailResponse, AccountBalance } from '@/types/accounting-period';

// GET /api/accounting-period/periods/[name]
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const periodName = decodeURIComponent(params.name);

    // Fetch period details from ERPNext
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);

    // Fetch closing journal if exists
    let closingJournal = null;
    if (period.closing_journal_entry) {
      try {
        closingJournal = await erpnextClient.get('Journal Entry', period.closing_journal_entry);
      } catch (error) {
        console.warn(`Could not fetch closing journal: ${error}`);
      }
    }

    // Fetch account balances if period is closed
    let accountBalances: AccountBalance[] = [];
    if (period.status === 'Closed' || period.status === 'Permanently Closed') {
      try {
        // Get all GL entries up to the period end date
        const glFilters = [
          ['company', '=', period.company],
          ['posting_date', '<=', period.end_date],
          ['is_cancelled', '=', 0],
        ];

        const glEntries = await erpnextClient.getList<any>('GL Entry', {
          filters: glFilters,
          fields: ['account', 'debit', 'credit'],
          limit: 999999,
        });

        // Aggregate by account
        const accountMap = new Map<string, { debit: number; credit: number }>();
        
        for (const entry of glEntries) {
          const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
          accountMap.set(entry.account, {
            debit: existing.debit + (entry.debit || 0),
            credit: existing.credit + (entry.credit || 0),
          });
        }

        // Get account details
        if (accountMap.size > 0) {
          const accounts = await erpnextClient.getList<any>('Account', {
            filters: [
              ['name', 'in', Array.from(accountMap.keys())],
              ['company', '=', period.company],
            ],
            fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
          });

          // Build account balances
          for (const account of accounts) {
            const totals = accountMap.get(account.name);
            if (!totals) continue;

            const balance = ['Asset', 'Expense'].includes(account.root_type)
              ? totals.debit - totals.credit
              : totals.credit - totals.debit;

            accountBalances.push({
              account: account.name,
              account_name: account.account_name,
              account_type: account.account_type,
              root_type: account.root_type,
              is_group: account.is_group,
              debit: totals.debit,
              credit: totals.credit,
              balance: balance,
              is_nominal: ['Income', 'Expense'].includes(account.root_type),
            });
          }
        }
      } catch (error) {
        console.warn(`Could not fetch account balances: ${error}`);
      }
    }

    const response: GetPeriodDetailResponse = {
      success: true,
      data: {
        ...period,
        closing_journal: closingJournal,
        account_balances: accountBalances,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching period detail:', error);
    
    if (error.message.includes('DoesNotExistError') || error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: `Accounting Period '${params.name}' not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch period detail',
      },
      { status: 500 }
    );
  }
}

// PUT /api/accounting-period/periods/[name]
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const periodName = decodeURIComponent(params.name);
    const body = await request.json();

    // Fetch current period
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);

    // Validate that period is not permanently closed
    if (period.status === 'Permanently Closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot update permanently closed period',
          details: {
            current_status: period.status,
          },
        },
        { status: 422 }
      );
    }

    // Only allow updating certain fields
    const allowedFields = ['remarks', 'fiscal_year'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'No valid fields to update',
          details: {
            allowed_fields: allowedFields,
          },
        },
        { status: 400 }
      );
    }

    // Update period
    const updatedPeriod = await erpnextClient.update<AccountingPeriod>(
      'Accounting Period',
      periodName,
      updateData
    );

    // Create audit log
    await erpnextClient.insert('Period Closing Log', {
      accounting_period: periodName,
      action_type: 'Transaction Modified',
      action_by: 'Administrator', // TODO: Get from session
      action_date: new Date().toISOString(),
      reason: 'Period information updated',
      before_snapshot: JSON.stringify(period),
      after_snapshot: JSON.stringify(updatedPeriod),
    });

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
      message: 'Period updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating period:', error);
    
    if (error.message.includes('DoesNotExistError') || error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: `Accounting Period '${params.name}' not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'UPDATE_ERROR',
        message: error.message || 'Failed to update period',
      },
      { status: 500 }
    );
  }
}
