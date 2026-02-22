import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';
import type { AccountingPeriod, PeriodClosingConfig, AccountBalance } from '@/types/accounting-period';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_name, company, force = false } = body;

    if (!period_name || !company) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period name and company are required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', period_name);

    if (period.status !== 'Open') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Period is not open' },
        { status: 422 }
      );
    }

    // Run validations unless force=true
    if (!force) {
      const validationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/accounting-period/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_name, company }),
      });

      const validationResult = await validationResponse.json();
      
      if (validationResult.success && !validationResult.all_passed) {
        const failedValidations = validationResult.validations.filter((v: any) => !v.passed && v.severity === 'error');
        
        if (failedValidations.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: `Cannot close period: ${failedValidations.length} validation(s) failed`,
              details: { failed_validations: failedValidations },
            },
            { status: 422 }
          );
        }
      }
    }

    // Get configuration
    const config = await erpnextClient.get<PeriodClosingConfig>('Period Closing Config', 'Period Closing Config');

    // Validate retained earnings account
    if (!config.retained_earnings_account) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CONFIGURATION_ERROR', 
          message: 'Retained earnings account is not configured. Please set it in Period Closing Config.' 
        },
        { status: 422 }
      );
    }

    // Verify retained earnings account is not a stock account
    const retainedEarningsAcc = await erpnextClient.get('Account', config.retained_earnings_account);
    if (retainedEarningsAcc.account_type === 'Stock') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CONFIGURATION_ERROR', 
          message: `Retained earnings account "${config.retained_earnings_account}" is a Stock account. Please configure an Equity account instead.` 
        },
        { status: 422 }
      );
    }

    if (retainedEarningsAcc.root_type !== 'Equity') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CONFIGURATION_ERROR', 
          message: `Retained earnings account "${config.retained_earnings_account}" must be an Equity account (current: ${retainedEarningsAcc.root_type}).` 
        },
        { status: 422 }
      );
    }

    // Create closing journal entry
    const closingJournal = await createClosingJournalEntry(period, config);

    // Calculate and save account balances snapshot
    const accountBalances = await calculateAllAccountBalances(period);

    // Update period status to Closed
    const now = new Date();
    const erpnextDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const updateData: any = {
      status: 'Closed',
      closed_by: 'Administrator',
      closed_on: erpnextDatetime,
    };

    // Only set closing_journal_entry if a real journal was created
    if (closingJournal.name !== 'NO_CLOSING_JOURNAL') {
      updateData.closing_journal_entry = closingJournal.name;
    }
    
    const updatedPeriod = await erpnextClient.update('Accounting Period', period_name, updateData);

    // Create audit log
    await erpnextClient.insert('Period Closing Log', {
      accounting_period: period_name,
      action_type: 'Closed',
      action_by: 'Administrator',
      action_date: erpnextDatetime,
      before_snapshot: JSON.stringify({ status: 'Open' }),
      after_snapshot: JSON.stringify({ 
        status: 'Closed', 
        closed_on: erpnextDatetime, 
        closing_journal_entry: closingJournal.name !== 'NO_CLOSING_JOURNAL' ? closingJournal.name : null,
        message: closingJournal.message || null
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Period closed successfully',
      data: {
        period: updatedPeriod,
        closing_journal: closingJournal,
        account_balances: accountBalances,
      },
    });
  } catch (error: any) {
    console.error('Error closing period:', error);
    return NextResponse.json(
      { success: false, error: 'CLOSE_ERROR', message: error.message || 'Failed to close period' },
      { status: 500 }
    );
  }
}

/**
 * Create closing journal entry for the period with cascading profit accounts support
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * Cascading Logic:
 * 1. Close Income/Expense → Current Period Profit (3230)
 * 2. Transfer Current Period Profit → Current Year Profit (3220)
 * 3. If year-end: Transfer Current Year Profit → Retained Earnings (3200)
 */
async function createClosingJournalEntry(
  period: AccountingPeriod,
  config: PeriodClosingConfig
): Promise<any> {
  // Get all nominal accounts (Income and Expense) with non-zero balances
  const nominalAccounts = await getNominalAccountBalances(period);

  // Calculate net income/loss
  let totalIncome = 0;
  let totalExpense = 0;

  for (const account of nominalAccounts) {
    if (account.root_type === 'Income') {
      totalIncome += account.balance;
    } else if (account.root_type === 'Expense') {
      totalExpense += account.balance;
    }
  }

  const netIncome = totalIncome - totalExpense;

  // Build journal entry accounts
  const journalAccounts: any[] = [];

  // Log accounts for debugging
  console.log('=== Closing Journal Debug ===');
  console.log('Nominal accounts found:', nominalAccounts.length);
  nominalAccounts.forEach(acc => {
    console.log(`- ${acc.account}: ${acc.account_name} (${acc.root_type}) = ${acc.balance}`);
  });

  // Close income accounts (debit income to zero out credit balance)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Income' && account.balance !== 0) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: Math.abs(account.balance),
        credit_in_account_currency: 0,
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
      });
    }
  }

  // Close expense accounts (credit expense to zero out debit balance)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Expense' && account.balance !== 0) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: 0,
        credit_in_account_currency: Math.abs(account.balance),
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`,
      });
    }
  }

  console.log('Journal accounts to be created:', journalAccounts.length);
  journalAccounts.forEach(acc => {
    console.log(`- ${acc.account}: D=${acc.debit_in_account_currency}, C=${acc.credit_in_account_currency}`);
  });
  console.log('=== End Debug ===');

  // If no nominal accounts with balance, skip journal creation
  if (journalAccounts.length === 0 && netIncome === 0) {
    console.log('No nominal accounts with balance found. Skipping closing journal creation.');
    return {
      name: 'NO_CLOSING_JOURNAL',
      message: 'No closing journal needed - no income or expense accounts with balance',
    };
  }

  // Determine target account based on cascading configuration
  let targetAccount = config.retained_earnings_account;
  let targetRemark = `Net income for period ${period.period_name}`;

  if (config.enable_cascading_profit_accounts && config.current_period_profit_account) {
    // Use cascading: Income/Expense → Current Period Profit
    targetAccount = config.current_period_profit_account;
    targetRemark = `Transfer net income to Current Period Profit for ${period.period_name}`;
    console.log('Using cascading profit accounts - target:', targetAccount);
  }

  // Add target account entry (balancing entry)
  if (netIncome > 0) {
    // Profit: Credit target account
    journalAccounts.push({
      account: targetAccount,
      debit_in_account_currency: 0,
      credit_in_account_currency: netIncome,
      user_remark: targetRemark,
    });
  } else if (netIncome < 0) {
    // Loss: Debit target account
    journalAccounts.push({
      account: targetAccount,
      debit_in_account_currency: Math.abs(netIncome),
      credit_in_account_currency: 0,
      user_remark: targetRemark,
    });
  }

  // Create journal entry
  const journalEntry = await erpnextClient.insert('Journal Entry', {
    voucher_type: 'Journal Entry',
    posting_date: period.end_date,
    company: period.company,
    accounts: journalAccounts,
    user_remark: `Closing entry for accounting period ${period.period_name}`,
    accounting_period: period.name,
  });

  // Submit the journal entry
  await erpnextClient.submit('Journal Entry', journalEntry.name);

  // If cascading is enabled, create additional journal entries
  if (config.enable_cascading_profit_accounts && netIncome !== 0) {
    await createCascadingJournalEntries(period, config, netIncome, journalEntry.name);
  }

  return journalEntry;
}

/**
 * Get nominal account balances for the period
 * Requirements: 3.1
 * Note: Uses cumulative balance (from beginning to period end) for closing entries
 */
async function getNominalAccountBalances(period: AccountingPeriod): Promise<AccountBalance[]> {
  // Get all GL entries UP TO period end (cumulative, not just period range)
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0],
  ];

  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999,
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

  // Get account details for nominal accounts only
  // CRITICAL: Exclude stock accounts by checking both account_type and is_stock_account fields
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', Array.from(accountMap.keys())],
      ['root_type', 'in', ['Income', 'Expense']],
      ['is_group', '=', 0],
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'account_number'],
    limit_page_length: 999999,
  });

  // Additional filter: Exclude accounts that contain stock-related keywords
  // This is a safety measure to prevent stock accounts from being included
  const stockKeywords = ['stock', 'inventory', 'persediaan', 'barang'];
  const filteredAccounts = accounts.filter((account: any) => {
    const accountNameLower = account.account_name.toLowerCase();
    const accountNumberLower = (account.account_number || '').toLowerCase();
    
    // Check if account name or number contains stock keywords
    const hasStockKeyword = stockKeywords.some(keyword => 
      accountNameLower.includes(keyword) || accountNumberLower.includes(keyword)
    );
    
    // Exclude if it's a stock account type or contains stock keywords
    return account.account_type !== 'Stock' && !hasStockKeyword;
  });

  // Build result
  const result: AccountBalance[] = [];

  for (const account of filteredAccounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;

    const balance =
      account.root_type === 'Income'
        ? totals.credit - totals.debit // Income has credit balance
        : totals.debit - totals.credit; // Expense has debit balance

    if (balance !== 0) {
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type as 'Income' | 'Expense',
        is_group: false,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: true,
      });
    }
  }

  return result;
}

/**
 * Create cascading journal entries to transfer profit through multiple accounts
 * Step 1: Income/Expense → Current Period Profit (3230) [Already done in main closing journal]
 * Step 2: Current Period Profit (3230) → Current Year Profit (3220)
 * Step 3: If year-end: Current Year Profit (3220) → Retained Earnings (3200)
 */
async function createCascadingJournalEntries(
  period: AccountingPeriod,
  config: PeriodClosingConfig,
  netIncome: number,
  mainJournalName: string
): Promise<void> {
  console.log('=== Creating Cascading Journal Entries ===');
  console.log('Net Income:', netIncome);
  console.log('Period Type:', period.period_type);

  // Step 2: Transfer from Current Period Profit to Current Year Profit
  if (config.current_period_profit_account && config.current_year_profit_account) {
    const step2Accounts: any[] = [];

    if (netIncome > 0) {
      // Debit Current Period Profit (to zero it out)
      step2Accounts.push({
        account: config.current_period_profit_account,
        debit_in_account_currency: netIncome,
        credit_in_account_currency: 0,
        user_remark: `Transfer period profit to year accumulation`,
      });
      // Credit Current Year Profit (accumulate)
      step2Accounts.push({
        account: config.current_year_profit_account,
        debit_in_account_currency: 0,
        credit_in_account_currency: netIncome,
        user_remark: `Accumulate profit for fiscal year`,
      });
    } else {
      // Credit Current Period Profit (to zero it out)
      step2Accounts.push({
        account: config.current_period_profit_account,
        debit_in_account_currency: 0,
        credit_in_account_currency: Math.abs(netIncome),
        user_remark: `Transfer period loss to year accumulation`,
      });
      // Debit Current Year Profit (accumulate loss)
      step2Accounts.push({
        account: config.current_year_profit_account,
        debit_in_account_currency: Math.abs(netIncome),
        credit_in_account_currency: 0,
        user_remark: `Accumulate loss for fiscal year`,
      });
    }

    const step2Journal = await erpnextClient.insert('Journal Entry', {
      voucher_type: 'Journal Entry',
      posting_date: period.end_date,
      company: period.company,
      accounts: step2Accounts,
      user_remark: `Cascading transfer: Period Profit → Year Profit (${period.period_name})`,
      accounting_period: period.name,
    });

    await erpnextClient.submit('Journal Entry', step2Journal.name);
    console.log('Step 2 Journal created:', step2Journal.name);
  }

  // Step 3: If year-end period, transfer from Current Year Profit to Retained Earnings
  const isYearEnd = period.period_type === 'Yearly' || isLastPeriodOfYear(period);
  
  if (isYearEnd && config.current_year_profit_account && config.retained_earnings_permanent_account) {
    // Get current balance of Current Year Profit account
    const yearProfitBalance = await getCurrentAccountBalance(
      config.current_year_profit_account,
      period.company,
      period.end_date
    );

    if (yearProfitBalance !== 0) {
      const step3Accounts: any[] = [];

      if (yearProfitBalance > 0) {
        // Debit Current Year Profit (to zero it out)
        step3Accounts.push({
          account: config.current_year_profit_account,
          debit_in_account_currency: yearProfitBalance,
          credit_in_account_currency: 0,
          user_remark: `Transfer year profit to retained earnings`,
        });
        // Credit Retained Earnings (permanent)
        step3Accounts.push({
          account: config.retained_earnings_permanent_account,
          debit_in_account_currency: 0,
          credit_in_account_currency: yearProfitBalance,
          user_remark: `Year-end profit transfer`,
        });
      } else {
        // Credit Current Year Profit (to zero it out)
        step3Accounts.push({
          account: config.current_year_profit_account,
          debit_in_account_currency: 0,
          credit_in_account_currency: Math.abs(yearProfitBalance),
          user_remark: `Transfer year loss to retained earnings`,
        });
        // Debit Retained Earnings (permanent)
        step3Accounts.push({
          account: config.retained_earnings_permanent_account,
          debit_in_account_currency: Math.abs(yearProfitBalance),
          credit_in_account_currency: 0,
          user_remark: `Year-end loss transfer`,
        });
      }

      const step3Journal = await erpnextClient.insert('Journal Entry', {
        voucher_type: 'Journal Entry',
        posting_date: period.end_date,
        company: period.company,
        accounts: step3Accounts,
        user_remark: `Year-end transfer: Year Profit → Retained Earnings (${period.period_name})`,
        accounting_period: period.name,
      });

      await erpnextClient.submit('Journal Entry', step3Journal.name);
      console.log('Step 3 Journal created (Year-end):', step3Journal.name);
    }
  }

  console.log('=== Cascading Journal Entries Complete ===');
}

/**
 * Check if this is the last period of the fiscal year
 */
function isLastPeriodOfYear(period: AccountingPeriod): boolean {
  // For monthly periods, check if it's December or the last month of fiscal year
  if (period.period_type === 'Monthly') {
    const endDate = new Date(period.end_date);
    const month = endDate.getMonth(); // 0-11
    // Assuming fiscal year ends in December (month 11)
    // TODO: Make this configurable based on company's fiscal year settings
    return month === 11;
  }
  
  // For quarterly periods, check if it's Q4
  if (period.period_type === 'Quarterly') {
    const endDate = new Date(period.end_date);
    const month = endDate.getMonth();
    // Q4 ends in December
    return month === 11;
  }

  return false;
}

/**
 * Get current balance of an account as of a specific date
 */
async function getCurrentAccountBalance(
  account: string,
  company: string,
  asOfDate: string
): Promise<number> {
  const filters = [
    ['company', '=', company],
    ['posting_date', '<=', asOfDate],
    ['is_cancelled', '=', 0],
    ['account', '=', account],
  ];

  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['debit', 'credit'],
    limit_page_length: 999999,
  });

  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of glEntries) {
    totalDebit += entry.debit || 0;
    totalCredit += entry.credit || 0;
  }

  // For equity accounts, credit balance is positive
  return totalCredit - totalDebit;
}

/**
 * Calculate all account balances as of period end date
 * Requirements: 4.3
 */
async function calculateAllAccountBalances(period: AccountingPeriod): Promise<AccountBalance[]> {
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0],
  ];

  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit_page_length: 999999,
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
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', Array.from(accountMap.keys())],
      ['company', '=', period.company],
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group'],
    limit_page_length: 999999,
  });

  const result: AccountBalance[] = [];

  for (const account of accounts) {
    const totals = accountMap.get(account.name);
    if (!totals) continue;

    const balance = ['Asset', 'Expense'].includes(account.root_type)
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

    result.push({
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

  return result;
}
