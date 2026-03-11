import fetch from 'node-fetch';

const ERPNEXT_URL = 'https://cirebon.batasku.cloud';
const API_KEY = '4618e5708dd3d06';
const API_SECRET = 'c0541b43bb18814';

interface GLEntry {
  account: string;
  debit: number;
  credit: number;
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
}

interface Account {
  name: string;
  account_name: string;
  root_type: string;
  account_type: string;
}

interface AccountBalance {
  account: string;
  account_name: string;
  root_type: string;
  debit: number;
  credit: number;
  balance: number;
}

async function analyzeGLData() {
  const period_name = '202603 - C';
  const company = 'Cirebon';

  try {
    // Get period details
    console.log('\n=== FETCHING PERIOD DETAILS ===');
    const periodRes = await fetch(`${ERPNEXT_URL}/api/resource/Accounting Period/${encodeURIComponent(period_name)}`, {
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    const periodData = (await periodRes.json()) as { data: any };
    if (!periodData.data) {
      console.error('Period not found:', periodData);
      return;
    }
    const period = periodData.data;
    console.log(`Period: ${period.name}`);
    console.log(`Start Date: ${period.start_date}`);
    console.log(`End Date: ${period.end_date}`);

    // Get all GL entries for the period
    console.log('\n=== FETCHING ALL GL ENTRIES ===');
    const glRes = await fetch(
      `${ERPNEXT_URL}/api/resource/GL Entry?filters=[["company","=","${company}"],["posting_date",">=","${period.start_date}"],["posting_date","<=","${period.end_date}"]]&fields=["account","debit","credit","posting_date","voucher_type","voucher_no"]&limit_page_length=500`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const glData = (await glRes.json()) as { data: GLEntry[] };
    const glEntries = glData.data;
    console.log(`Total GL Entries: ${glEntries.length}`);

    // Get all accounts
    console.log('\n=== FETCHING ACCOUNT DETAILS ===');
    const accountRes = await fetch(
      `${ERPNEXT_URL}/api/resource/Account?filters=[["company","=","${company}"]]&fields=["name","account_name","root_type","account_type"]&limit_page_length=500`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const accountData = (await accountRes.json()) as { data: Account[] };
    const accounts = accountData.data;
    const accountMap = new Map(accounts.map((acc: Account) => [acc.name, acc]));

    // Aggregate by account
    const accountBalances: Record<string, AccountBalance> = {};
    glEntries.forEach((entry: GLEntry) => {
      const accountInfo = accountMap.get(entry.account);
      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = {
          account: entry.account,
          account_name: accountInfo?.account_name || entry.account,
          root_type: accountInfo?.root_type || 'Unknown',
          debit: 0,
          credit: 0,
          balance: 0,
        };
      }
      accountBalances[entry.account].debit += entry.debit || 0;
      accountBalances[entry.account].credit += entry.credit || 0;
      accountBalances[entry.account].balance += (entry.debit || 0) - (entry.credit || 0);
    });

    // Separate by root type
    const allAccounts = Object.values(accountBalances);
    const incomeAccounts = allAccounts.filter((a: AccountBalance) => a.root_type === 'Income');
    const expenseAccounts = allAccounts.filter((a: AccountBalance) => a.root_type === 'Expense');

    console.log('\n=== INCOME ACCOUNTS (4xxx) ===');
    console.log('Account | Account Name | Debit | Credit | Balance');
    console.log('------|------|------|------|------');
    let totalIncome = 0;
    incomeAccounts.forEach((acc: AccountBalance) => {
      console.log(`${acc.account} | ${acc.account_name} | ${acc.debit} | ${acc.credit} | ${acc.balance}`);
      totalIncome += Math.abs(acc.balance);
    });
    console.log(`\nTotal Income: ${totalIncome}`);

    console.log('\n=== EXPENSE ACCOUNTS (5xxx) ===');
    console.log('Account | Account Name | Debit | Credit | Balance');
    console.log('------|------|------|------|------');
    let totalExpense = 0;
    expenseAccounts.forEach((acc: AccountBalance) => {
      console.log(`${acc.account} | ${acc.account_name} | ${acc.debit} | ${acc.credit} | ${acc.balance}`);
      totalExpense += Math.abs(acc.balance);
    });
    console.log(`\nTotal Expense: ${totalExpense}`);

    console.log('\n=== NET INCOME CALCULATION ===');
    const netIncome = totalIncome - totalExpense;
    console.log(`Total Income: ${totalIncome}`);
    console.log(`Total Expense: ${totalExpense}`);
    console.log(`Net Income: ${netIncome}`);

    // Check Sales Invoice
    console.log('\n=== SALES INVOICE CHECK ===');
    const siRes = await fetch(
      `${ERPNEXT_URL}/api/resource/Sales Invoice?filters=[["company","=","${company}"],["docstatus","=",1],["posting_date",">=","${period.start_date}"],["posting_date","<=","${period.end_date}"]]&fields=["name","total","grand_total","posting_date"]&limit_page_length=500`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const siData = (await siRes.json()) as { data: any[] };
    const salesInvoices = siData.data;
    console.log(`Total Sales Invoices: ${salesInvoices.length}`);
    let totalSalesAmount = 0;
    salesInvoices.forEach((si: any) => {
      console.log(`${si.name} | Total: ${si.total} | Grand Total: ${si.grand_total}`);
      totalSalesAmount += si.grand_total || 0;
    });
    console.log(`Total Sales Amount: ${totalSalesAmount}`);

    // Check detailed GL entries for 4110.000 (Penjualan)
    console.log('\n=== DETAILED GL ENTRIES FOR 4110.000 (PENJUALAN) ===');
    const detailRes = await fetch(
      `${ERPNEXT_URL}/api/resource/GL Entry?filters=[["company","=","${company}"],["posting_date",">=","${period.start_date}"],["posting_date","<=","${period.end_date}"],["account","like","4110.000%"]]&fields=["account","debit","credit","voucher_type","voucher_no","posting_date","remarks"]&limit_page_length=500`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const detailData = (await detailRes.json()) as { data: any[] };
    console.log(`Total GL Entries for 4110.000: ${detailData.data.length}`);
    detailData.data.forEach((entry: any) => {
      console.log(`${entry.posting_date} | ${entry.voucher_type} ${entry.voucher_no} | Dr: ${entry.debit} | Cr: ${entry.credit} | ${entry.remarks || ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeGLData();
