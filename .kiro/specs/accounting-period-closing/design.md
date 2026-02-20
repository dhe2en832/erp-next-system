# Design Document: Penutupan Periode Akuntansi

## Overview

Fitur Penutupan Periode Akuntansi adalah sistem yang memungkinkan perusahaan untuk menutup periode akuntansi secara formal, mencegah perubahan data transaksi pada periode yang sudah ditutup, dan memastikan integritas data keuangan. Sistem ini terintegrasi dengan ERPNext backend dan menyediakan antarmuka Next.js untuk manajemen periode akuntansi.

### Tujuan Utama

1. **Integritas Data**: Melindungi data keuangan periode yang sudah ditutup dari perubahan yang tidak sah
2. **Kepatuhan Audit**: Menyediakan audit trail lengkap untuk semua aktivitas penutupan periode
3. **Otomasi**: Mengotomatisasi pembuatan jurnal penutup dan perhitungan saldo akhir
4. **Validasi**: Memastikan semua transaksi lengkap sebelum periode ditutup
5. **Fleksibilitas**: Mendukung pembukaan kembali periode dengan kontrol yang ketat

### Scope

**In Scope:**
- Definisi dan manajemen periode akuntansi (bulanan, kuartalan, tahunan)
- Validasi kelengkapan data sebelum penutupan
- Pembuatan jurnal penutup otomatis untuk akun nominal
- Penutupan periode dengan tiga status: Terbuka, Ditutup, Ditutup_Permanen
- Pembatasan transaksi pada periode tertutup
- Pembukaan kembali periode dengan validasi
- Penutupan permanen untuk periode yang sudah diaudit
- Laporan penutupan periode
- Notifikasi dan pengingat
- Audit trail lengkap
- Integrasi dengan modul lain (sales, purchase, inventory, payroll)
- Konfigurasi pengaturan penutupan

**Out of Scope:**
- Perubahan struktur Chart of Accounts
- Manajemen fiscal year (menggunakan fitur ERPNext yang ada)
- Perhitungan pajak (handled by separate tax module)
- Multi-currency closing (phase 2)


## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  Period Management UI  │  Closing Wizard  │  Reports UI     │
│  Dashboard & Alerts    │  Configuration   │  Audit Log UI   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ REST API
                 │
┌────────────────▼────────────────────────────────────────────┐
│              API Routes (Next.js API)                        │
├─────────────────────────────────────────────────────────────┤
│  /api/accounting-period/                                     │
│    - periods/          (CRUD periode)                        │
│    - validate/         (validasi sebelum penutupan)          │
│    - close/            (proses penutupan)                    │
│    - reopen/           (pembukaan kembali)                   │
│    - permanent-close/  (penutupan permanen)                  │
│    - reports/          (laporan penutupan)                   │
│    - audit-log/        (riwayat aktivitas)                   │
│    - config/           (pengaturan)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ ERPNext API
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    ERPNext Backend                           │
├─────────────────────────────────────────────────────────────┤
│  Custom DocType: Accounting Period                          │
│  Custom DocType: Period Closing Log                         │
│  Custom DocType: Period Closing Config                      │
│  Journal Entry (existing)                                    │
│  GL Entry (existing)                                         │
│  Account (existing)                                          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- Zod (validation)

**Backend:**
- ERPNext REST API
- Custom DocTypes untuk period management
- Server Scripts untuk business logic

**Database:**
- ERPNext (Frappe Framework) - MariaDB

### Integration Points

1. **Journal Entry Module**: Untuk pembuatan jurnal penutup
2. **GL Entry Module**: Untuk query saldo akun
3. **Account Module**: Untuk identifikasi akun nominal vs riil
4. **Sales Module**: Validasi invoice penjualan
5. **Purchase Module**: Validasi invoice pembelian
6. **Inventory Module**: Validasi stock entries
7. **HR Module**: Validasi payroll entries
8. **Bank Reconciliation**: Validasi rekonsiliasi bank


## Components and Interfaces

### 1. Custom DocTypes (ERPNext)

#### Accounting Period DocType

```python
{
  "doctype": "Accounting Period",
  "fields": [
    {"fieldname": "period_name", "fieldtype": "Data", "label": "Period Name", "reqd": 1},
    {"fieldname": "company", "fieldtype": "Link", "options": "Company", "reqd": 1},
    {"fieldname": "start_date", "fieldtype": "Date", "label": "Start Date", "reqd": 1},
    {"fieldname": "end_date", "fieldtype": "Date", "label": "End Date", "reqd": 1},
    {"fieldname": "period_type", "fieldtype": "Select", 
     "options": "Monthly\nQuarterly\nYearly", "default": "Monthly"},
    {"fieldname": "status", "fieldtype": "Select", 
     "options": "Open\nClosed\nPermanently Closed", "default": "Open"},
    {"fieldname": "closed_by", "fieldtype": "Link", "options": "User"},
    {"fieldname": "closed_on", "fieldtype": "Datetime"},
    {"fieldname": "closing_journal_entry", "fieldtype": "Link", "options": "Journal Entry"},
    {"fieldname": "permanently_closed_by", "fieldtype": "Link", "options": "User"},
    {"fieldname": "permanently_closed_on", "fieldtype": "Datetime"},
    {"fieldname": "fiscal_year", "fieldtype": "Link", "options": "Fiscal Year"},
    {"fieldname": "remarks", "fieldtype": "Text Editor"}
  ],
  "permissions": [
    {"role": "Accounts Manager", "read": 1, "write": 1, "create": 1},
    {"role": "Accounts User", "read": 1}
  ]
}
```

#### Period Closing Log DocType

```python
{
  "doctype": "Period Closing Log",
  "fields": [
    {"fieldname": "accounting_period", "fieldtype": "Link", "options": "Accounting Period", "reqd": 1},
    {"fieldname": "action_type", "fieldtype": "Select", 
     "options": "Created\nClosed\nReopened\nPermanently Closed\nTransaction Modified", "reqd": 1},
    {"fieldname": "action_by", "fieldtype": "Link", "options": "User", "reqd": 1},
    {"fieldname": "action_date", "fieldtype": "Datetime", "default": "now", "reqd": 1},
    {"fieldname": "reason", "fieldtype": "Text"},
    {"fieldname": "before_snapshot", "fieldtype": "Long Text"},
    {"fieldname": "after_snapshot", "fieldtype": "Long Text"},
    {"fieldname": "affected_transaction", "fieldtype": "Dynamic Link", "options": "transaction_doctype"},
    {"fieldname": "transaction_doctype", "fieldtype": "Data"},
    {"fieldname": "ip_address", "fieldtype": "Data"},
    {"fieldname": "user_agent", "fieldtype": "Data"}
  ],
  "is_submittable": 0,
  "track_changes": 1
}
```

#### Period Closing Config DocType

```python
{
  "doctype": "Period Closing Config",
  "issingle": 1,
  "fields": [
    {"fieldname": "retained_earnings_account", "fieldtype": "Link", 
     "options": "Account", "label": "Retained Earnings Account", "reqd": 1},
    {"fieldname": "enable_bank_reconciliation_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_draft_transaction_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_unposted_transaction_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_sales_invoice_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_purchase_invoice_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_inventory_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "enable_payroll_check", "fieldtype": "Check", "default": 1},
    {"fieldname": "closing_role", "fieldtype": "Link", "options": "Role", "default": "Accounts Manager"},
    {"fieldname": "reopen_role", "fieldtype": "Link", "options": "Role", "default": "Accounts Manager"},
    {"fieldname": "reminder_days_before_end", "fieldtype": "Int", "default": 3},
    {"fieldname": "escalation_days_after_end", "fieldtype": "Int", "default": 7},
    {"fieldname": "enable_email_notifications", "fieldtype": "Check", "default": 1}
  ]
}
```


### 2. API Endpoints

#### Period Management API

```typescript
// GET /api/accounting-period/periods
interface GetPeriodsRequest {
  company?: string;
  status?: 'Open' | 'Closed' | 'Permanently Closed';
  fiscal_year?: string;
  limit?: number;
  start?: number;
}

interface GetPeriodsResponse {
  success: boolean;
  data: AccountingPeriod[];
  total_count: number;
}

// POST /api/accounting-period/periods
interface CreatePeriodRequest {
  period_name: string;
  company: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  fiscal_year?: string;
  remarks?: string;
}

interface CreatePeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message?: string;
}

// GET /api/accounting-period/periods/[name]
interface GetPeriodDetailResponse {
  success: boolean;
  data: AccountingPeriod & {
    closing_journal?: JournalEntry;
    account_balances?: AccountBalance[];
    validation_results?: ValidationResult[];
  };
}
```

#### Validation API

```typescript
// POST /api/accounting-period/validate
interface ValidatePeriodRequest {
  period_name: string;
  company: string;
}

interface ValidationResult {
  check_name: string;
  passed: boolean;
  message: string;
  details?: any[];
}

interface ValidatePeriodResponse {
  success: boolean;
  all_passed: boolean;
  validations: ValidationResult[];
}
```

#### Closing API

```typescript
// POST /api/accounting-period/close
interface ClosePeriodRequest {
  period_name: string;
  company: string;
  force?: boolean; // Skip validations (admin only)
}

interface ClosePeriodResponse {
  success: boolean;
  data: {
    period: AccountingPeriod;
    closing_journal: JournalEntry;
    account_balances: AccountBalance[];
  };
  message: string;
}

// POST /api/accounting-period/reopen
interface ReopenPeriodRequest {
  period_name: string;
  company: string;
  reason: string; // Required
}

interface ReopenPeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message: string;
}

// POST /api/accounting-period/permanent-close
interface PermanentClosePeriodRequest {
  period_name: string;
  company: string;
  confirmation: string; // Must be "PERMANENT"
}

interface PermanentClosePeriodResponse {
  success: boolean;
  data: AccountingPeriod;
  message: string;
}
```


#### Reports and Audit API

```typescript
// GET /api/accounting-period/reports/closing-summary
interface ClosingSummaryRequest {
  period_name: string;
  company: string;
  format?: 'json' | 'pdf' | 'excel';
}

interface ClosingSummaryResponse {
  success: boolean;
  data: {
    period: AccountingPeriod;
    closing_journal: JournalEntry;
    account_balances: AccountBalance[];
    nominal_accounts: AccountBalance[];
    real_accounts: AccountBalance[];
    net_income: number;
  };
  pdf_url?: string;
  excel_url?: string;
}

// GET /api/accounting-period/audit-log
interface AuditLogRequest {
  period_name?: string;
  action_type?: string;
  action_by?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  start?: number;
}

interface AuditLogResponse {
  success: boolean;
  data: PeriodClosingLog[];
  total_count: number;
}

// GET /api/accounting-period/config
interface GetConfigResponse {
  success: boolean;
  data: PeriodClosingConfig;
}

// PUT /api/accounting-period/config
interface UpdateConfigRequest {
  retained_earnings_account?: string;
  enable_bank_reconciliation_check?: boolean;
  enable_draft_transaction_check?: boolean;
  // ... other config fields
}

interface UpdateConfigResponse {
  success: boolean;
  data: PeriodClosingConfig;
  message: string;
}
```

### 3. Frontend Components

#### Period Management Dashboard

```typescript
// app/accounting-period/page.tsx
interface PeriodDashboardProps {
  company: string;
}

// Components:
// - PeriodList: Display all periods with status badges
// - PeriodFilters: Filter by status, fiscal year, period type
// - CreatePeriodButton: Open modal to create new period
// - PeriodStatusIndicator: Visual indicator for periods needing attention
```

#### Closing Wizard

```typescript
// app/accounting-period/close/[name]/page.tsx
interface ClosingWizardProps {
  periodName: string;
}

// Steps:
// 1. Validation Check
// 2. Review Account Balances
// 3. Preview Closing Journal
// 4. Confirm and Close
```

#### Period Detail View

```typescript
// app/accounting-period/[name]/page.tsx
interface PeriodDetailProps {
  periodName: string;
}

// Sections:
// - Period Information
// - Status and Actions
// - Closing Journal (if closed)
// - Account Balances
// - Audit Trail
// - Related Documents
```


## Data Models

### TypeScript Interfaces

```typescript
// types/accounting-period.ts

interface AccountingPeriod {
  name: string;
  period_name: string;
  company: string;
  start_date: string;
  end_date: string;
  period_type: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Open' | 'Closed' | 'Permanently Closed';
  closed_by?: string;
  closed_on?: string;
  closing_journal_entry?: string;
  permanently_closed_by?: string;
  permanently_closed_on?: string;
  fiscal_year?: string;
  remarks?: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
}

interface PeriodClosingLog {
  name: string;
  accounting_period: string;
  action_type: 'Created' | 'Closed' | 'Reopened' | 'Permanently Closed' | 'Transaction Modified';
  action_by: string;
  action_date: string;
  reason?: string;
  before_snapshot?: string;
  after_snapshot?: string;
  affected_transaction?: string;
  transaction_doctype?: string;
  ip_address?: string;
  user_agent?: string;
}

interface PeriodClosingConfig {
  name: string;
  retained_earnings_account: string;
  enable_bank_reconciliation_check: boolean;
  enable_draft_transaction_check: boolean;
  enable_unposted_transaction_check: boolean;
  enable_sales_invoice_check: boolean;
  enable_purchase_invoice_check: boolean;
  enable_inventory_check: boolean;
  enable_payroll_check: boolean;
  closing_role: string;
  reopen_role: string;
  reminder_days_before_end: number;
  escalation_days_after_end: number;
  enable_email_notifications: boolean;
}

interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  is_group: boolean;
  debit: number;
  credit: number;
  balance: number;
  is_nominal: boolean; // Income or Expense
}

interface ClosingJournalEntry {
  doctype: 'Journal Entry';
  voucher_type: 'Closing Entry';
  posting_date: string;
  company: string;
  accounts: ClosingJournalAccount[];
  user_remark: string;
  is_closing_entry: boolean;
  accounting_period: string;
}

interface ClosingJournalAccount {
  account: string;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  user_remark?: string;
}

interface ValidationResult {
  check_name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: {
    doctype?: string;
    name?: string;
    status?: string;
    [key: string]: any;
  }[];
}
```


### Database Schema Relationships

```
Accounting Period (1) ──┬──> (N) Period Closing Log
                        │
                        └──> (1) Journal Entry (closing_journal_entry)
                        │
                        └──> (1) Fiscal Year
                        │
                        └──> (1) Company

Period Closing Config (singleton) ──> (1) Account (retained_earnings_account)

Journal Entry ──> (N) Journal Entry Account ──> (1) Account

GL Entry ──> (1) Account
         └──> (1) Voucher (Journal Entry, Sales Invoice, etc.)
```

### State Transitions

```
┌──────────┐
│   Open   │ ◄─────────────┐
└────┬─────┘                │
     │                      │
     │ close()              │ reopen()
     │                      │
     ▼                      │
┌──────────┐                │
│  Closed  │ ───────────────┘
└────┬─────┘
     │
     │ permanent_close()
     │
     ▼
┌────────────────────┐
│ Permanently Closed │
└────────────────────┘
```

**Valid Transitions:**
- Open → Closed: Melalui proses penutupan dengan validasi
- Closed → Open: Pembukaan kembali (hanya jika periode berikutnya belum ditutup)
- Closed → Permanently Closed: Penutupan permanen (tidak dapat dibatalkan)

**Invalid Transitions:**
- Permanently Closed → Any: Tidak ada transisi keluar dari status ini
- Open → Permanently Closed: Harus melalui Closed terlebih dahulu


## Detailed Algorithms and Business Logic

### 1. Period Creation Algorithm

```typescript
async function createAccountingPeriod(data: CreatePeriodRequest): Promise<AccountingPeriod> {
  // Step 1: Validate date range
  if (new Date(data.start_date) >= new Date(data.end_date)) {
    throw new Error('Start date must be before end date');
  }

  // Step 2: Check for overlapping periods
  const overlappingPeriods = await checkOverlappingPeriods(
    data.company,
    data.start_date,
    data.end_date
  );
  
  if (overlappingPeriods.length > 0) {
    throw new Error(`Period overlaps with existing period: ${overlappingPeriods[0].period_name}`);
  }

  // Step 3: Create period in ERPNext
  const period = await erpnextClient.insert('Accounting Period', {
    period_name: data.period_name,
    company: data.company,
    start_date: data.start_date,
    end_date: data.end_date,
    period_type: data.period_type,
    status: 'Open',
    fiscal_year: data.fiscal_year,
    remarks: data.remarks
  });

  // Step 4: Log creation
  await createAuditLog({
    accounting_period: period.name,
    action_type: 'Created',
    action_by: getCurrentUser(),
    action_date: new Date().toISOString(),
    after_snapshot: JSON.stringify(period)
  });

  return period;
}

// Helper function
async function checkOverlappingPeriods(
  company: string,
  startDate: string,
  endDate: string
): Promise<AccountingPeriod[]> {
  const filters = [
    ['company', '=', company],
    ['start_date', '<=', endDate],
    ['end_date', '>=', startDate]
  ];
  
  return await erpnextClient.getList('Accounting Period', {
    filters,
    fields: ['name', 'period_name', 'start_date', 'end_date']
  });
}
```

### 2. Pre-Closing Validation Algorithm

```typescript
async function validatePeriodBeforeClosing(
  periodName: string,
  company: string
): Promise<ValidationResult[]> {
  const config = await getPeriodClosingConfig();
  const period = await getAccountingPeriod(periodName);
  const results: ValidationResult[] = [];

  // Validation 1: Check for draft transactions
  if (config.enable_draft_transaction_check) {
    results.push(await validateNoDraftTransactions(period));
  }

  // Validation 2: Check for unposted transactions
  if (config.enable_unposted_transaction_check) {
    results.push(await validateAllTransactionsPosted(period));
  }

  // Validation 3: Check bank reconciliation
  if (config.enable_bank_reconciliation_check) {
    results.push(await validateBankReconciliation(period));
  }

  // Validation 4: Check sales invoices
  if (config.enable_sales_invoice_check) {
    results.push(await validateSalesInvoices(period));
  }

  // Validation 5: Check purchase invoices
  if (config.enable_purchase_invoice_check) {
    results.push(await validatePurchaseInvoices(period));
  }

  // Validation 6: Check inventory transactions
  if (config.enable_inventory_check) {
    results.push(await validateInventoryTransactions(period));
  }

  // Validation 7: Check payroll entries
  if (config.enable_payroll_check) {
    results.push(await validatePayrollEntries(period));
  }

  return results;
}

// Individual validation functions
async function validateNoDraftTransactions(period: AccountingPeriod): Promise<ValidationResult> {
  const doctypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const draftDocs = [];

  for (const doctype of doctypes) {
    const filters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 0] // Draft
    ];

    const docs = await erpnextClient.getList(doctype, {
      filters,
      fields: ['name', 'posting_date'],
      limit: 100
    });

    draftDocs.push(...docs.map(d => ({ ...d, doctype })));
  }

  return {
    check_name: 'No Draft Transactions',
    passed: draftDocs.length === 0,
    message: draftDocs.length === 0
      ? 'All transactions are submitted'
      : `Found ${draftDocs.length} draft transaction(s)`,
    severity: 'error',
    details: draftDocs
  };
}

async function validateAllTransactionsPosted(period: AccountingPeriod): Promise<ValidationResult> {
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '>=', period.start_date],
    ['posting_date', '<=', period.end_date],
    ['is_opening', '=', 'No']
  ];

  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['voucher_type', 'voucher_no'],
    limit: 1
  });

  // Check if all vouchers have GL entries
  const voucherTypes = ['Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Payment Entry'];
  const unpostedVouchers = [];

  for (const voucherType of voucherTypes) {
    const voucherFilters = [
      ['company', '=', period.company],
      ['posting_date', '>=', period.start_date],
      ['posting_date', '<=', period.end_date],
      ['docstatus', '=', 1] // Submitted
    ];

    const vouchers = await erpnextClient.getList(voucherType, {
      filters: voucherFilters,
      fields: ['name']
    });

    for (const voucher of vouchers) {
      const glFilters = [
        ['voucher_type', '=', voucherType],
        ['voucher_no', '=', voucher.name]
      ];

      const glCount = await erpnextClient.getCount('GL Entry', { filters: glFilters });
      
      if (glCount === 0) {
        unpostedVouchers.push({ doctype: voucherType, name: voucher.name });
      }
    }
  }

  return {
    check_name: 'All Transactions Posted',
    passed: unpostedVouchers.length === 0,
    message: unpostedVouchers.length === 0
      ? 'All transactions have GL entries'
      : `Found ${unpostedVouchers.length} unposted transaction(s)`,
    severity: 'error',
    details: unpostedVouchers
  };
}

async function validateBankReconciliation(period: AccountingPeriod): Promise<ValidationResult> {
  // Get all bank accounts
  const bankAccounts = await erpnextClient.getList('Account', {
    filters: [
      ['company', '=', period.company],
      ['account_type', '=', 'Bank']
    ],
    fields: ['name', 'account_name']
  });

  const unreconciledAccounts = [];

  for (const account of bankAccounts) {
    // Check for unreconciled bank transactions
    const filters = [
      ['account', '=', account.name],
      ['posting_date', '<=', period.end_date],
      ['clearance_date', 'is', 'not set']
    ];

    const unreconciledCount = await erpnextClient.getCount('GL Entry', { filters });

    if (unreconciledCount > 0) {
      unreconciledAccounts.push({
        account: account.name,
        account_name: account.account_name,
        unreconciled_count: unreconciledCount
      });
    }
  }

  return {
    check_name: 'Bank Reconciliation Complete',
    passed: unreconciledAccounts.length === 0,
    message: unreconciledAccounts.length === 0
      ? 'All bank accounts are reconciled'
      : `Found ${unreconciledAccounts.length} bank account(s) with unreconciled transactions`,
    severity: 'warning',
    details: unreconciledAccounts
  };
}
```


### 3. Closing Journal Entry Creation Algorithm

```typescript
async function createClosingJournalEntry(
  period: AccountingPeriod
): Promise<JournalEntry> {
  const config = await getPeriodClosingConfig();
  
  // Step 1: Get all nominal accounts (Income and Expense) with non-zero balances
  const nominalAccounts = await getNominalAccountBalances(period);
  
  // Step 2: Calculate net income/loss
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
  
  // Step 3: Build journal entry accounts
  const journalAccounts: ClosingJournalAccount[] = [];
  
  // Close income accounts (debit income, credit retained earnings)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Income' && account.balance !== 0) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: Math.abs(account.balance),
        credit_in_account_currency: 0,
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`
      });
    }
  }
  
  // Close expense accounts (credit expense, debit retained earnings)
  for (const account of nominalAccounts) {
    if (account.root_type === 'Expense' && account.balance !== 0) {
      journalAccounts.push({
        account: account.account,
        debit_in_account_currency: 0,
        credit_in_account_currency: Math.abs(account.balance),
        user_remark: `Closing ${account.account_name} for period ${period.period_name}`
      });
    }
  }
  
  // Add retained earnings entry (balancing entry)
  if (netIncome > 0) {
    // Profit: Credit retained earnings
    journalAccounts.push({
      account: config.retained_earnings_account,
      debit_in_account_currency: 0,
      credit_in_account_currency: netIncome,
      user_remark: `Net income for period ${period.period_name}`
    });
  } else if (netIncome < 0) {
    // Loss: Debit retained earnings
    journalAccounts.push({
      account: config.retained_earnings_account,
      debit_in_account_currency: Math.abs(netIncome),
      credit_in_account_currency: 0,
      user_remark: `Net loss for period ${period.period_name}`
    });
  }
  
  // Step 4: Create and submit journal entry
  const journalEntry = await erpnextClient.insert('Journal Entry', {
    voucher_type: 'Closing Entry',
    posting_date: period.end_date,
    company: period.company,
    accounts: journalAccounts,
    user_remark: `Closing entry for accounting period ${period.period_name}`,
    is_closing_entry: 1,
    accounting_period: period.name
  });
  
  // Step 5: Submit the journal entry
  await erpnextClient.submit('Journal Entry', journalEntry.name);
  
  return journalEntry;
}

// Helper function to get nominal account balances
async function getNominalAccountBalances(
  period: AccountingPeriod
): Promise<AccountBalance[]> {
  // Get all GL entries for the period
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '>=', period.start_date],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0]
  ];
  
  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit: 999999
  });
  
  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();
  
  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + entry.debit,
      credit: existing.credit + entry.credit
    });
  }
  
  // Get account details
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', Array.from(accountMap.keys())],
      ['root_type', 'in', ['Income', 'Expense']],
      ['is_group', '=', 0]
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type']
  });
  
  // Build result
  const result: AccountBalance[] = [];
  
  for (const account of accounts) {
    const totals = accountMap.get(account.name)!;
    const balance = account.root_type === 'Income'
      ? totals.credit - totals.debit  // Income has credit balance
      : totals.debit - totals.credit; // Expense has debit balance
    
    if (balance !== 0) {
      result.push({
        account: account.name,
        account_name: account.account_name,
        account_type: account.account_type,
        root_type: account.root_type,
        is_group: false,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance,
        is_nominal: true
      });
    }
  }
  
  return result;
}
```


### 4. Period Closing Algorithm

```typescript
async function closePeriod(
  periodName: string,
  company: string,
  force: boolean = false
): Promise<ClosePeriodResponse> {
  // Step 1: Get period
  const period = await getAccountingPeriod(periodName);
  
  if (period.status !== 'Open') {
    throw new Error(`Period is already ${period.status}`);
  }
  
  // Step 2: Check permissions
  const config = await getPeriodClosingConfig();
  const currentUser = getCurrentUser();
  
  if (!hasRole(currentUser, config.closing_role)) {
    throw new Error('Insufficient permissions to close period');
  }
  
  // Step 3: Run validations (unless forced)
  if (!force) {
    const validations = await validatePeriodBeforeClosing(periodName, company);
    const failedValidations = validations.filter(v => !v.passed && v.severity === 'error');
    
    if (failedValidations.length > 0) {
      throw new Error(
        `Cannot close period: ${failedValidations.length} validation(s) failed. ` +
        `Use force=true to override (admin only).`
      );
    }
  }
  
  // Step 4: Create closing journal entry
  const closingJournal = await createClosingJournalEntry(period);
  
  // Step 5: Calculate and save account balances snapshot
  const accountBalances = await calculateAllAccountBalances(period);
  
  // Step 6: Create opening balances for next period
  await createOpeningBalancesForNextPeriod(period, accountBalances);
  
  // Step 7: Update period status
  const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
    status: 'Closed',
    closed_by: currentUser,
    closed_on: new Date().toISOString(),
    closing_journal_entry: closingJournal.name
  });
  
  // Step 8: Create audit log
  await createAuditLog({
    accounting_period: period.name,
    action_type: 'Closed',
    action_by: currentUser,
    action_date: new Date().toISOString(),
    before_snapshot: JSON.stringify({ status: 'Open' }),
    after_snapshot: JSON.stringify(updatedPeriod)
  });
  
  // Step 9: Send notifications
  await sendClosingNotifications(updatedPeriod);
  
  return {
    success: true,
    data: {
      period: updatedPeriod,
      closing_journal: closingJournal,
      account_balances: accountBalances
    },
    message: `Period ${period.period_name} closed successfully`
  };
}

// Helper function to calculate all account balances
async function calculateAllAccountBalances(
  period: AccountingPeriod
): Promise<AccountBalance[]> {
  const filters = [
    ['company', '=', period.company],
    ['posting_date', '<=', period.end_date],
    ['is_cancelled', '=', 0]
  ];
  
  const glEntries = await erpnextClient.getList('GL Entry', {
    filters,
    fields: ['account', 'debit', 'credit'],
    limit: 999999
  });
  
  // Aggregate by account
  const accountMap = new Map<string, { debit: number; credit: number }>();
  
  for (const entry of glEntries) {
    const existing = accountMap.get(entry.account) || { debit: 0, credit: 0 };
    accountMap.set(entry.account, {
      debit: existing.debit + entry.debit,
      credit: existing.credit + entry.credit
    });
  }
  
  // Get account details
  const accounts = await erpnextClient.getList('Account', {
    filters: [
      ['name', 'in', Array.from(accountMap.keys())],
      ['company', '=', period.company]
    ],
    fields: ['name', 'account_name', 'account_type', 'root_type', 'is_group']
  });
  
  const result: AccountBalance[] = [];
  
  for (const account of accounts) {
    const totals = accountMap.get(account.name)!;
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
      is_nominal: ['Income', 'Expense'].includes(account.root_type)
    });
  }
  
  return result;
}

// Helper function to create opening balances for next period
async function createOpeningBalancesForNextPeriod(
  period: AccountingPeriod,
  accountBalances: AccountBalance[]
): Promise<void> {
  // Only real accounts (Asset, Liability, Equity) carry forward
  const realAccounts = accountBalances.filter(
    ab => ['Asset', 'Liability', 'Equity'].includes(ab.root_type) && ab.balance !== 0
  );
  
  // Find or create next period
  const nextPeriodStart = new Date(period.end_date);
  nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
  
  const nextPeriodFilters = [
    ['company', '=', period.company],
    ['start_date', '=', nextPeriodStart.toISOString().split('T')[0]]
  ];
  
  const nextPeriods = await erpnextClient.getList('Accounting Period', {
    filters: nextPeriodFilters,
    limit: 1
  });
  
  if (nextPeriods.length === 0) {
    // Next period doesn't exist yet, skip opening balance creation
    return;
  }
  
  const nextPeriod = nextPeriods[0];
  
  // Create opening journal entry for next period
  const openingAccounts: ClosingJournalAccount[] = [];
  
  for (const account of realAccounts) {
    if (account.balance > 0) {
      // Positive balance
      if (['Asset', 'Expense'].includes(account.root_type)) {
        openingAccounts.push({
          account: account.account,
          debit_in_account_currency: account.balance,
          credit_in_account_currency: 0,
          user_remark: `Opening balance for ${nextPeriod.period_name}`
        });
      } else {
        openingAccounts.push({
          account: account.account,
          debit_in_account_currency: 0,
          credit_in_account_currency: account.balance,
          user_remark: `Opening balance for ${nextPeriod.period_name}`
        });
      }
    } else if (account.balance < 0) {
      // Negative balance
      if (['Asset', 'Expense'].includes(account.root_type)) {
        openingAccounts.push({
          account: account.account,
          debit_in_account_currency: 0,
          credit_in_account_currency: Math.abs(account.balance),
          user_remark: `Opening balance for ${nextPeriod.period_name}`
        });
      } else {
        openingAccounts.push({
          account: account.account,
          debit_in_account_currency: Math.abs(account.balance),
          credit_in_account_currency: 0,
          user_remark: `Opening balance for ${nextPeriod.period_name}`
        });
      }
    }
  }
  
  // Note: Opening entries are typically created manually or through a separate process
  // This is a placeholder for the logic
}
```


### 5. Period Reopening Algorithm

```typescript
async function reopenPeriod(
  periodName: string,
  company: string,
  reason: string
): Promise<ReopenPeriodResponse> {
  // Step 1: Get period
  const period = await getAccountingPeriod(periodName);
  
  if (period.status !== 'Closed') {
    throw new Error(`Cannot reopen period with status: ${period.status}`);
  }
  
  // Step 2: Check permissions
  const config = await getPeriodClosingConfig();
  const currentUser = getCurrentUser();
  
  if (!hasRole(currentUser, config.reopen_role)) {
    throw new Error('Insufficient permissions to reopen period');
  }
  
  // Step 3: Validate that next period is not closed
  const nextPeriodStart = new Date(period.end_date);
  nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
  
  const nextPeriodFilters = [
    ['company', '=', period.company],
    ['start_date', '>=', nextPeriodStart.toISOString().split('T')[0]],
    ['status', 'in', ['Closed', 'Permanently Closed']]
  ];
  
  const closedNextPeriods = await erpnextClient.getList('Accounting Period', {
    filters: nextPeriodFilters,
    limit: 1
  });
  
  if (closedNextPeriods.length > 0) {
    throw new Error(
      `Cannot reopen period: subsequent period ${closedNextPeriods[0].period_name} is already closed`
    );
  }
  
  // Step 4: Cancel and delete closing journal entry
  if (period.closing_journal_entry) {
    await erpnextClient.cancel('Journal Entry', period.closing_journal_entry);
    await erpnextClient.delete('Journal Entry', period.closing_journal_entry);
  }
  
  // Step 5: Update period status
  const beforeSnapshot = JSON.stringify(period);
  
  const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
    status: 'Open',
    closed_by: null,
    closed_on: null,
    closing_journal_entry: null
  });
  
  // Step 6: Create audit log
  await createAuditLog({
    accounting_period: period.name,
    action_type: 'Reopened',
    action_by: currentUser,
    action_date: new Date().toISOString(),
    reason: reason,
    before_snapshot: beforeSnapshot,
    after_snapshot: JSON.stringify(updatedPeriod)
  });
  
  // Step 7: Send notifications
  await sendReopenNotifications(updatedPeriod, reason);
  
  return {
    success: true,
    data: updatedPeriod,
    message: `Period ${period.period_name} reopened successfully`
  };
}
```

### 6. Permanent Closing Algorithm

```typescript
async function permanentlyClosePeriod(
  periodName: string,
  company: string,
  confirmation: string
): Promise<PermanentClosePeriodResponse> {
  // Step 1: Validate confirmation
  if (confirmation !== 'PERMANENT') {
    throw new Error('Invalid confirmation. Type "PERMANENT" to confirm.');
  }
  
  // Step 2: Get period
  const period = await getAccountingPeriod(periodName);
  
  if (period.status !== 'Closed') {
    throw new Error('Period must be closed before permanent closing');
  }
  
  if (period.status === 'Permanently Closed') {
    throw new Error('Period is already permanently closed');
  }
  
  // Step 3: Check permissions (admin only)
  const currentUser = getCurrentUser();
  
  if (!hasRole(currentUser, 'System Manager')) {
    throw new Error('Only System Manager can permanently close periods');
  }
  
  // Step 4: Update period status
  const beforeSnapshot = JSON.stringify(period);
  
  const updatedPeriod = await erpnextClient.update('Accounting Period', period.name, {
    status: 'Permanently Closed',
    permanently_closed_by: currentUser,
    permanently_closed_on: new Date().toISOString()
  });
  
  // Step 5: Create audit log
  await createAuditLog({
    accounting_period: period.name,
    action_type: 'Permanently Closed',
    action_by: currentUser,
    action_date: new Date().toISOString(),
    before_snapshot: beforeSnapshot,
    after_snapshot: JSON.stringify(updatedPeriod)
  });
  
  // Step 6: Send notifications
  await sendPermanentClosingNotifications(updatedPeriod);
  
  return {
    success: true,
    data: updatedPeriod,
    message: `Period ${period.period_name} permanently closed. This action cannot be undone.`
  };
}
```

### 7. Transaction Restriction Algorithm

```typescript
// This would be implemented as ERPNext server script or validation
async function validateTransactionAgainstClosedPeriod(
  doctype: string,
  doc: any,
  method: 'before_insert' | 'before_save' | 'before_submit'
): Promise<void> {
  // Skip if no posting_date
  if (!doc.posting_date) {
    return;
  }
  
  // Get all closed periods for the company
  const filters = [
    ['company', '=', doc.company],
    ['status', 'in', ['Closed', 'Permanently Closed']],
    ['start_date', '<=', doc.posting_date],
    ['end_date', '>=', doc.posting_date]
  ];
  
  const closedPeriods = await erpnextClient.getList('Accounting Period', {
    filters,
    limit: 1
  });
  
  if (closedPeriods.length === 0) {
    // No closed period found, allow transaction
    return;
  }
  
  const period = closedPeriods[0];
  
  // Check if permanently closed
  if (period.status === 'Permanently Closed') {
    throw new Error(
      `Cannot modify transaction: Period ${period.period_name} is permanently closed. ` +
      `No modifications are allowed.`
    );
  }
  
  // Check if user has override permission
  const currentUser = getCurrentUser();
  const config = await getPeriodClosingConfig();
  
  if (hasRole(currentUser, 'System Manager') || hasRole(currentUser, config.reopen_role)) {
    // Log the override
    await createAuditLog({
      accounting_period: period.name,
      action_type: 'Transaction Modified',
      action_by: currentUser,
      action_date: new Date().toISOString(),
      affected_transaction: doc.name,
      transaction_doctype: doctype,
      reason: `Modified ${doctype} ${doc.name} in closed period`
    });
    
    // Allow transaction with warning
    console.warn(
      `Warning: Modifying transaction in closed period ${period.period_name}. ` +
      `This action is logged.`
    );
    return;
  }
  
  // Deny transaction
  throw new Error(
    `Cannot modify transaction: Period ${period.period_name} is closed. ` +
    `Contact administrator to reopen the period.`
  );
}
```


### 8. Notification Algorithm

```typescript
async function checkAndSendPeriodReminders(): Promise<void> {
  const config = await getPeriodClosingConfig();
  
  if (!config.enable_email_notifications) {
    return;
  }
  
  const today = new Date();
  
  // Get all open periods
  const openPeriods = await erpnextClient.getList('Accounting Period', {
    filters: [['status', '=', 'Open']],
    fields: ['name', 'period_name', 'company', 'end_date']
  });
  
  for (const period of openPeriods) {
    const endDate = new Date(period.end_date);
    const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysAfterEnd = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Send reminder before end date
    if (daysUntilEnd === config.reminder_days_before_end) {
      await sendReminderEmail({
        period,
        type: 'reminder',
        message: `Period ${period.period_name} will end in ${daysUntilEnd} days. Please prepare for closing.`
      });
    }
    
    // Send overdue notification
    if (daysAfterEnd > 0 && daysAfterEnd <= config.escalation_days_after_end) {
      await sendReminderEmail({
        period,
        type: 'overdue',
        message: `Period ${period.period_name} ended ${daysAfterEnd} days ago and is still open.`
      });
    }
    
    // Send escalation
    if (daysAfterEnd === config.escalation_days_after_end) {
      await sendEscalationEmail({
        period,
        message: `URGENT: Period ${period.period_name} ended ${daysAfterEnd} days ago and requires immediate attention.`
      });
    }
  }
}

async function sendReminderEmail(params: {
  period: AccountingPeriod;
  type: 'reminder' | 'overdue';
  message: string;
}): Promise<void> {
  const recipients = await getUsersWithRole('Accounts Manager');
  
  await erpnextClient.sendEmail({
    recipients: recipients.map(u => u.email),
    subject: `[${params.type.toUpperCase()}] Accounting Period: ${params.period.period_name}`,
    message: params.message,
    reference_doctype: 'Accounting Period',
    reference_name: params.period.name
  });
}

async function sendEscalationEmail(params: {
  period: AccountingPeriod;
  message: string;
}): Promise<void> {
  const recipients = await getUsersWithRole('System Manager');
  
  await erpnextClient.sendEmail({
    recipients: recipients.map(u => u.email),
    subject: `[ESCALATION] Accounting Period: ${params.period.period_name}`,
    message: params.message,
    reference_doctype: 'Accounting Period',
    reference_name: params.period.name,
    priority: 'high'
  });
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Date Range Validation

*For any* period creation request, if the start date is greater than or equal to the end date, the system should reject the request with an appropriate error message.

**Validates: Requirements 1.2**

### Property 2: Period Overlap Detection

*For any* two accounting periods in the same company, their date ranges should not overlap (i.e., for periods P1 and P2, either P1.end_date < P2.start_date OR P2.end_date < P1.start_date).

**Validates: Requirements 1.3**

### Property 3: Period Creation Round-Trip

*For any* valid period creation request, creating a period and then retrieving it should return a period object containing all specified attributes (period_name, company, start_date, end_date, period_type, status).

**Validates: Requirements 1.4**

### Property 4: Initial Status Invariant

*For any* newly created accounting period, the status should always be "Open" immediately after creation.

**Validates: Requirements 1.5**

### Property 5: Validation Framework Completeness

*For any* accounting period, running pre-closing validation should return a validation result for each enabled validation check in the configuration, and each result should contain check_name, passed status, message, and details.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5**

### Property 6: Validation Failure Prevents Closing

*For any* accounting period with at least one failed validation of severity "error", attempting to close the period without force flag should be rejected with an error listing all failed validations.

**Validates: Requirements 2.4, 2.5**

### Property 7: Nominal Account Identification

*For any* accounting period, the closing process should identify all and only those accounts with root_type "Income" or "Expense" and non-zero balance as nominal accounts.

**Validates: Requirements 3.1**

### Property 8: Closing Journal Zeros Nominal Accounts

*For any* accounting period with nominal accounts, the closing journal entry should create entries such that the sum of all debits equals the sum of all credits, and each nominal account's balance becomes zero after posting the closing journal.

**Validates: Requirements 3.2, 3.3**

### Property 9: Net Income Calculation

*For any* accounting period, the net income recorded in the closing journal should equal the sum of all income account balances minus the sum of all expense account balances for that period.

**Validates: Requirements 3.4**

### Property 10: Closing Journal Marker

*For any* closing journal entry created by the system, it should have the is_closing_entry flag set to true (or 1) and voucher_type set to "Closing Entry".

**Validates: Requirements 3.5**

### Property 11: Closing Journal Auto-Submit

*For any* closing journal entry created during period closing, the journal should be automatically submitted (docstatus = 1) without requiring manual submission.

**Validates: Requirements 3.6**

### Property 12: Status Transition on Closing

*For any* accounting period with status "Open", successfully closing the period should change the status to "Closed".

**Validates: Requirements 4.1**

### Property 13: Closing Metadata Recording

*For any* accounting period that is closed, the period object should have closed_by set to the user who performed the closing and closed_on set to a valid timestamp.

**Validates: Requirements 4.2**

### Property 14: Balance Snapshot Completeness

*For any* accounting period that is closed, the system should store balance snapshots for all accounts that have non-zero balances as of the period end date.

**Validates: Requirements 4.3**

### Property 15: Opening Balance Carry-Forward

*For any* closed accounting period followed by another period, the opening balances of the next period should equal the closing balances of real accounts (Asset, Liability, Equity) from the previous period, while nominal accounts (Income, Expense) should start with zero balance.

**Validates: Requirements 4.4**

### Property 16: Comprehensive Audit Logging

*For any* state-changing action (create, close, reopen, permanent close, transaction modification in closed period, configuration change), an audit log entry should be created containing action_type, action_by, action_date, and before/after snapshots where applicable.

**Validates: Requirements 4.5, 5.5, 6.5, 7.6, 10.1, 10.2, 12.7**

### Property 17: Transaction Restriction in Closed Periods

*For any* user without administrator privileges, attempting to create, modify, or delete a financial transaction with posting_date within a closed period should be rejected with an error message indicating the period is closed.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 18: Administrator Override with Logging

*For any* user with administrator privileges, modifying a transaction in a closed period should be allowed, and an audit log entry should be created recording the modification with the affected transaction details.

**Validates: Requirements 5.4, 5.5**

### Property 19: Reopen Validation - Next Period Check

*For any* closed accounting period, attempting to reopen it when a subsequent period (with start_date after this period's end_date) is already closed should be rejected with an error.

**Validates: Requirements 6.2**

### Property 20: Status Transition on Reopening

*For any* accounting period with status "Closed" that passes reopen validation, successfully reopening the period should change the status to "Open".

**Validates: Requirements 6.3**

### Property 21: Closing Journal Cleanup on Reopen

*For any* accounting period that is reopened, if a closing journal entry exists, it should be cancelled and deleted as part of the reopen process.

**Validates: Requirements 6.4**

### Property 22: Reopen Notification

*For any* accounting period that is reopened, a notification should be sent to all users with the "Accounts Manager" role informing them of the reopening.

**Validates: Requirements 6.6**

### Property 23: Status Transition to Permanent

*For any* accounting period with status "Closed", successfully performing permanent close should change the status to "Permanently Closed".

**Validates: Requirements 7.3**

### Property 24: Permanent Close Immutability

*For any* accounting period with status "Permanently Closed", all attempts to modify transactions within that period should be rejected regardless of user role or permissions.

**Validates: Requirements 7.4**

### Property 25: Permanent Close Prevents Reopen

*For any* accounting period with status "Permanently Closed", attempting to reopen the period should be rejected with an error indicating permanent closure cannot be reversed.

**Validates: Requirements 7.5**

### Property 26: Period Detail Completeness

*For any* closed accounting period, retrieving the period details should include the period information, closing journal reference, closed_by, closed_on, and account balances snapshot.

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 27: Export Metadata Inclusion

*For any* report export (PDF or Excel), the exported file should contain metadata including the export timestamp and the username of the user who performed the export.

**Validates: Requirements 8.6**

### Property 28: Notification Timing

*For any* open accounting period, the system should send a reminder notification N days before the end date (where N is configured in reminder_days_before_end), and an escalation notification M days after the end date (where M is configured in escalation_days_after_end), if the period remains open.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

### Property 29: Configuration Validation

*For any* configuration change request, if the change would violate basic accounting rules (e.g., setting retained_earnings_account to a non-equity account), the system should reject the change with an appropriate error message.

**Validates: Requirements 12.6**


## Error Handling

### Error Categories

#### 1. Validation Errors (400 Bad Request)

**Scenario**: Invalid input data or business rule violations

**Examples:**
- Start date >= end date
- Overlapping periods
- Missing required fields
- Invalid period status for operation

**Response Format:**
```typescript
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Start date must be before end date",
  "details": {
    "field": "start_date",
    "value": "2024-12-31",
    "constraint": "must_be_before_end_date"
  }
}
```

#### 2. Authorization Errors (403 Forbidden)

**Scenario**: User lacks required permissions

**Examples:**
- Non-admin trying to reopen period
- User without closing role trying to close period
- Attempting to modify permanently closed period

**Response Format:**
```typescript
{
  "success": false,
  "error": "AUTHORIZATION_ERROR",
  "message": "Insufficient permissions to close period",
  "details": {
    "required_role": "Accounts Manager",
    "user_roles": ["Accounts User"]
  }
}
```

#### 3. Business Logic Errors (422 Unprocessable Entity)

**Scenario**: Request is valid but cannot be processed due to business rules

**Examples:**
- Closing period with failed validations
- Reopening period when next period is closed
- Creating period that overlaps existing period

**Response Format:**
```typescript
{
  "success": false,
  "error": "BUSINESS_LOGIC_ERROR",
  "message": "Cannot close period: 3 validation(s) failed",
  "details": {
    "failed_validations": [
      {
        "check_name": "No Draft Transactions",
        "message": "Found 5 draft transaction(s)",
        "severity": "error"
      }
    ]
  }
}
```

#### 4. Not Found Errors (404 Not Found)

**Scenario**: Requested resource does not exist

**Examples:**
- Period name not found
- Company not found
- Account not found

**Response Format:**
```typescript
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Accounting Period not found",
  "details": {
    "resource": "Accounting Period",
    "identifier": "ACC-PERIOD-2024-01"
  }
}
```

#### 5. Conflict Errors (409 Conflict)

**Scenario**: Resource state conflict

**Examples:**
- Attempting to close already closed period
- Attempting to reopen already open period
- Concurrent modification conflicts

**Response Format:**
```typescript
{
  "success": false,
  "error": "CONFLICT",
  "message": "Period is already Closed",
  "details": {
    "current_status": "Closed",
    "requested_action": "close"
  }
}
```

#### 6. Integration Errors (502 Bad Gateway)

**Scenario**: ERPNext backend errors

**Examples:**
- ERPNext API timeout
- ERPNext returns error
- Database connection failure

**Response Format:**
```typescript
{
  "success": false,
  "error": "INTEGRATION_ERROR",
  "message": "Failed to communicate with ERPNext",
  "details": {
    "backend": "ERPNext",
    "operation": "create_journal_entry",
    "backend_error": "Connection timeout"
  }
}
```

### Error Handling Strategy

#### Frontend Error Handling

```typescript
// Error handler utility
async function handleApiError(error: any): Promise<void> {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        showValidationError(data.message, data.details);
        break;
      case 403:
        showAuthorizationError(data.message);
        break;
      case 422:
        showBusinessLogicError(data.message, data.details);
        break;
      case 404:
        showNotFoundError(data.message);
        break;
      case 409:
        showConflictError(data.message);
        break;
      case 502:
        showIntegrationError(data.message);
        break;
      default:
        showGenericError('An unexpected error occurred');
    }
  } else {
    showNetworkError('Network error. Please check your connection.');
  }
}
```

#### Backend Error Handling

```typescript
// API route error wrapper
export async function withErrorHandling(
  handler: () => Promise<any>
): Promise<NextResponse> {
  try {
    const result = await handler();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Log to monitoring service (Sentry)
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
    
    // Determine error type and status code
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        },
        { status: 400 }
      );
    }
    
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: error.message,
          details: error.details
        },
        { status: 403 }
      );
    }
    
    if (error instanceof BusinessLogicError) {
      return NextResponse.json(
        {
          success: false,
          error: 'BUSINESS_LOGIC_ERROR',
          message: error.message,
          details: error.details
        },
        { status: 422 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
```

### Retry Strategy

For transient errors (network issues, temporary ERPNext unavailability):

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on transient errors
      if (isTransientError(error) && attempt < maxRetries) {
        await sleep(delayMs * attempt); // Exponential backoff
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

function isTransientError(error: any): boolean {
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.response?.status === 502 ||
    error.response?.status === 503 ||
    error.response?.status === 504
  );
}
```

### Transaction Rollback

For operations that involve multiple steps:

```typescript
async function closePeriodWithRollback(
  periodName: string,
  company: string
): Promise<ClosePeriodResponse> {
  const transaction = await beginTransaction();
  
  try {
    // Step 1: Validate
    await validatePeriod(periodName, company);
    
    // Step 2: Create closing journal
    const journal = await createClosingJournal(period);
    
    // Step 3: Update period status
    const updatedPeriod = await updatePeriodStatus(period, 'Closed');
    
    // Step 4: Create audit log
    await createAuditLog({...});
    
    // Commit transaction
    await transaction.commit();
    
    return { success: true, data: updatedPeriod };
  } catch (error) {
    // Rollback all changes
    await transaction.rollback();
    throw error;
  }
}
```


## Testing Strategy

### Overview

Fitur accounting period closing akan diuji menggunakan pendekatan dual testing yang menggabungkan unit tests untuk kasus spesifik dan property-based tests untuk validasi universal. Pendekatan ini memastikan coverage yang komprehensif dan confidence yang tinggi terhadap correctness sistem.

### Testing Approach

**Unit Tests**: Untuk contoh spesifik, edge cases, dan kondisi error
**Property-Based Tests**: Untuk properti universal yang harus berlaku untuk semua input

Kedua jenis testing ini saling melengkapi:
- Unit tests menangkap bug konkret dan memvalidasi behavior spesifik
- Property tests memverifikasi correctness general dengan randomized input generation

### Property-Based Testing Framework

**Framework**: fast-check (untuk TypeScript/JavaScript)

**Installation**:
```bash
npm install --save-dev fast-check vitest @vitest/ui
```

**Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

### Property Test Configuration

Setiap property test harus:
- Menjalankan minimum 100 iterasi (karena randomization)
- Memiliki tag yang mereferensikan design property
- Menggunakan format: `Feature: accounting-period-closing, Property {number}: {property_text}`

**Example Property Test**:
```typescript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Feature: accounting-period-closing, Property 1: Date Range Validation', () => {
  it('should reject periods where start_date >= end_date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date(), // Generate random start date
        fc.date(), // Generate random end date
        async (date1, date2) => {
          const startDate = date1 > date2 ? date1 : date2;
          const endDate = date1 > date2 ? date2 : date1;
          
          // When start >= end, should reject
          if (startDate >= endDate) {
            const result = await createPeriod({
              period_name: 'Test Period',
              company: 'Test Company',
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              period_type: 'Monthly'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('VALIDATION_ERROR');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Organization

```
tests/
├── unit/
│   ├── period-creation.test.ts
│   ├── period-validation.test.ts
│   ├── closing-journal.test.ts
│   ├── period-closing.test.ts
│   ├── period-reopening.test.ts
│   ├── transaction-restrictions.test.ts
│   ├── notifications.test.ts
│   └── audit-logging.test.ts
├── property/
│   ├── period-properties.test.ts
│   ├── validation-properties.test.ts
│   ├── closing-properties.test.ts
│   ├── state-transition-properties.test.ts
│   └── audit-properties.test.ts
├── integration/
│   ├── erpnext-integration.test.ts
│   └── end-to-end-closing.test.ts
└── fixtures/
    ├── periods.ts
    ├── accounts.ts
    └── transactions.ts
```

### Unit Test Examples

#### Example 1: Period Creation

```typescript
describe('Period Creation', () => {
  it('should create period with valid data', async () => {
    const result = await createPeriod({
      period_name: 'January 2024',
      company: 'Test Company',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      period_type: 'Monthly'
    });
    
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('Open');
    expect(result.data.period_name).toBe('January 2024');
  });
  
  it('should reject period with start date after end date', async () => {
    const result = await createPeriod({
      period_name: 'Invalid Period',
      company: 'Test Company',
      start_date: '2024-01-31',
      end_date: '2024-01-01',
      period_type: 'Monthly'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('VALIDATION_ERROR');
  });
  
  it('should reject overlapping periods', async () => {
    // Create first period
    await createPeriod({
      period_name: 'January 2024',
      company: 'Test Company',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      period_type: 'Monthly'
    });
    
    // Try to create overlapping period
    const result = await createPeriod({
      period_name: 'Mid January 2024',
      company: 'Test Company',
      start_date: '2024-01-15',
      end_date: '2024-02-15',
      period_type: 'Monthly'
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('overlaps');
  });
});
```

#### Example 2: Closing Journal Creation

```typescript
describe('Closing Journal Creation', () => {
  it('should create closing journal with correct entries', async () => {
    // Setup: Create period with transactions
    const period = await setupPeriodWithTransactions({
      income: [
        { account: 'Sales', amount: 100000 },
        { account: 'Service Income', amount: 50000 }
      ],
      expense: [
        { account: 'Salaries', amount: 60000 },
        { account: 'Rent', amount: 20000 }
      ]
    });
    
    // Execute: Create closing journal
    const journal = await createClosingJournalEntry(period);
    
    // Verify: Check journal structure
    expect(journal.voucher_type).toBe('Closing Entry');
    expect(journal.is_closing_entry).toBe(1);
    
    // Verify: Income accounts are debited
    const salesEntry = journal.accounts.find(a => a.account === 'Sales');
    expect(salesEntry.debit_in_account_currency).toBe(100000);
    expect(salesEntry.credit_in_account_currency).toBe(0);
    
    // Verify: Expense accounts are credited
    const salariesEntry = journal.accounts.find(a => a.account === 'Salaries');
    expect(salariesEntry.debit_in_account_currency).toBe(0);
    expect(salariesEntry.credit_in_account_currency).toBe(60000);
    
    // Verify: Net income to retained earnings
    const netIncome = 150000 - 80000; // 70000
    const retainedEntry = journal.accounts.find(
      a => a.account === 'Retained Earnings'
    );
    expect(retainedEntry.credit_in_account_currency).toBe(netIncome);
  });
  
  it('should handle net loss correctly', async () => {
    const period = await setupPeriodWithTransactions({
      income: [{ account: 'Sales', amount: 50000 }],
      expense: [{ account: 'Salaries', amount: 80000 }]
    });
    
    const journal = await createClosingJournalEntry(period);
    
    const netLoss = 80000 - 50000; // 30000
    const retainedEntry = journal.accounts.find(
      a => a.account === 'Retained Earnings'
    );
    expect(retainedEntry.debit_in_account_currency).toBe(netLoss);
  });
});
```


### Property-Based Test Examples

#### Property 1: Date Range Validation

```typescript
// Feature: accounting-period-closing, Property 1: Date Range Validation
describe('Property 1: Date Range Validation', () => {
  it('should reject any period where start_date >= end_date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          period_name: fc.string({ minLength: 1, maxLength: 50 }),
          company: fc.constantFrom('Test Company', 'Another Company'),
          start_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          end_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          period_type: fc.constantFrom('Monthly', 'Quarterly', 'Yearly')
        }),
        async (data) => {
          const startDate = data.start_date.toISOString().split('T')[0];
          const endDate = data.end_date.toISOString().split('T')[0];
          
          const result = await createPeriod({
            ...data,
            start_date: startDate,
            end_date: endDate
          });
          
          if (startDate >= endDate) {
            expect(result.success).toBe(false);
            expect(result.error).toBe('VALIDATION_ERROR');
          } else {
            // Valid date range should succeed (assuming no other errors)
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property 2: Period Overlap Detection

```typescript
// Feature: accounting-period-closing, Property 2: Period Overlap Detection
describe('Property 2: Period Overlap Detection', () => {
  it('should detect overlapping periods for any two periods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            start: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            end: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          }),
          fc.record({
            start: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            end: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          })
        ),
        async ([period1, period2]) => {
          // Ensure valid date ranges
          if (period1.start >= period1.end || period2.start >= period2.end) {
            return; // Skip invalid ranges
          }
          
          // Create first period
          await createPeriod({
            period_name: 'Period 1',
            company: 'Test Company',
            start_date: period1.start.toISOString().split('T')[0],
            end_date: period1.end.toISOString().split('T')[0],
            period_type: 'Monthly'
          });
          
          // Try to create second period
          const result = await createPeriod({
            period_name: 'Period 2',
            company: 'Test Company',
            start_date: period2.start.toISOString().split('T')[0],
            end_date: period2.end.toISOString().split('T')[0],
            period_type: 'Monthly'
          });
          
          // Check if periods overlap
          const overlaps = !(period1.end < period2.start || period2.end < period1.start);
          
          if (overlaps) {
            expect(result.success).toBe(false);
            expect(result.message).toContain('overlap');
          } else {
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property 8: Closing Journal Zeros Nominal Accounts

```typescript
// Feature: accounting-period-closing, Property 8: Closing Journal Zeros Nominal Accounts
describe('Property 8: Closing Journal Zeros Nominal Accounts', () => {
  it('should zero out all nominal accounts after closing journal', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          incomeAccounts: fc.array(
            fc.record({
              account: fc.string({ minLength: 1 }),
              balance: fc.float({ min: 0, max: 1000000 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          expenseAccounts: fc.array(
            fc.record({
              account: fc.string({ minLength: 1 }),
              balance: fc.float({ min: 0, max: 1000000 })
            }),
            { minLength: 1, maxLength: 10 }
          )
        }),
        async (data) => {
          // Setup period with random nominal accounts
          const period = await setupPeriodWithNominalAccounts(data);
          
          // Create closing journal
          const journal = await createClosingJournalEntry(period);
          
          // Verify journal is balanced
          const totalDebit = journal.accounts.reduce(
            (sum, acc) => sum + acc.debit_in_account_currency, 0
          );
          const totalCredit = journal.accounts.reduce(
            (sum, acc) => sum + acc.credit_in_account_currency, 0
          );
          
          expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
          
          // Verify all nominal accounts have entries that zero them out
          for (const income of data.incomeAccounts) {
            const entry = journal.accounts.find(a => a.account === income.account);
            expect(entry).toBeDefined();
            expect(entry.debit_in_account_currency).toBeCloseTo(income.balance, 2);
          }
          
          for (const expense of data.expenseAccounts) {
            const entry = journal.accounts.find(a => a.account === expense.account);
            expect(entry).toBeDefined();
            expect(entry.credit_in_account_currency).toBeCloseTo(expense.balance, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property 12: Status Transition on Closing

```typescript
// Feature: accounting-period-closing, Property 12: Status Transition on Closing
describe('Property 12: Status Transition on Closing', () => {
  it('should transition from Open to Closed for any valid period', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          period_name: fc.string({ minLength: 1, maxLength: 50 }),
          company: fc.constantFrom('Test Company'),
          start_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
          end_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
        }),
        async (data) => {
          // Ensure valid date range
          if (data.start_date >= data.end_date) {
            return; // Skip invalid ranges
          }
          
          // Create period
          const createResult = await createPeriod({
            ...data,
            start_date: data.start_date.toISOString().split('T')[0],
            end_date: data.end_date.toISOString().split('T')[0],
            period_type: 'Monthly'
          });
          
          expect(createResult.data.status).toBe('Open');
          
          // Setup valid transactions for closing
          await setupValidTransactionsForPeriod(createResult.data);
          
          // Close period
          const closeResult = await closePeriod(
            createResult.data.name,
            data.company
          );
          
          expect(closeResult.success).toBe(true);
          expect(closeResult.data.period.status).toBe('Closed');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property 17: Transaction Restriction in Closed Periods

```typescript
// Feature: accounting-period-closing, Property 17: Transaction Restriction in Closed Periods
describe('Property 17: Transaction Restriction in Closed Periods', () => {
  it('should reject any transaction in closed period for regular users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionType: fc.constantFrom(
            'Journal Entry',
            'Sales Invoice',
            'Purchase Invoice',
            'Payment Entry'
          ),
          posting_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
          amount: fc.float({ min: 1, max: 1000000 })
        }),
        async (data) => {
          // Create and close a period
          const period = await createAndClosePeriod({
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          });
          
          // Try to create transaction in closed period
          const transactionDate = new Date('2024-01-15'); // Within closed period
          
          const result = await createTransaction({
            doctype: data.transactionType,
            posting_date: transactionDate.toISOString().split('T')[0],
            amount: data.amount,
            company: 'Test Company'
          }, { user_role: 'Accounts User' }); // Regular user
          
          expect(result.success).toBe(false);
          expect(result.error).toBe('AUTHORIZATION_ERROR');
          expect(result.message).toContain('closed');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Period Closing', () => {
  it('should complete full closing workflow', async () => {
    // 1. Create period
    const period = await createPeriod({
      period_name: 'Q1 2024',
      company: 'Test Company',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      period_type: 'Quarterly'
    });
    
    // 2. Create transactions
    await createSalesInvoice({ posting_date: '2024-01-15', amount: 100000 });
    await createPurchaseInvoice({ posting_date: '2024-02-10', amount: 60000 });
    await createJournalEntry({ posting_date: '2024-03-20', amount: 20000 });
    
    // 3. Validate before closing
    const validation = await validatePeriodBeforeClosing(period.data.name, 'Test Company');
    expect(validation.all_passed).toBe(true);
    
    // 4. Close period
    const closeResult = await closePeriod(period.data.name, 'Test Company');
    expect(closeResult.success).toBe(true);
    expect(closeResult.data.period.status).toBe('Closed');
    expect(closeResult.data.closing_journal).toBeDefined();
    
    // 5. Verify restrictions
    const restrictionResult = await createSalesInvoice({
      posting_date: '2024-01-20',
      amount: 50000
    });
    expect(restrictionResult.success).toBe(false);
    
    // 6. Verify audit log
    const auditLog = await getAuditLog({ period_name: period.data.name });
    expect(auditLog.data.length).toBeGreaterThan(0);
    expect(auditLog.data.some(log => log.action_type === 'Closed')).toBe(true);
  });
});
```

### Test Coverage Goals

- **Line Coverage**: > 80%
- **Branch Coverage**: > 75%
- **Function Coverage**: > 85%
- **Property Test Iterations**: 100 per property

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run test:coverage
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should close period with 10000 transactions in < 30 seconds', async () => {
    const period = await setupPeriodWithTransactions(10000);
    
    const startTime = Date.now();
    await closePeriod(period.name, 'Test Company');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
  
  it('should validate period with 5000 transactions in < 10 seconds', async () => {
    const period = await setupPeriodWithTransactions(5000);
    
    const startTime = Date.now();
    await validatePeriodBeforeClosing(period.name, 'Test Company');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

---

## Implementation Notes

### Phase 1: Core Infrastructure (Week 1-2)
1. Create ERPNext custom DocTypes
2. Implement basic API endpoints
3. Setup database schema
4. Implement authentication and authorization

### Phase 2: Period Management (Week 3-4)
1. Period CRUD operations
2. Overlap detection
3. Status management
4. Basic UI components

### Phase 3: Validation & Closing (Week 5-6)
1. Pre-closing validation framework
2. Closing journal creation algorithm
3. Balance calculation and snapshot
4. Transaction restrictions

### Phase 4: Advanced Features (Week 7-8)
1. Period reopening
2. Permanent closing
3. Audit logging
4. Notifications

### Phase 5: Integration & Testing (Week 9-10)
1. Module integration (sales, purchase, inventory, HR)
2. Comprehensive testing
3. Performance optimization
4. Documentation

### Phase 6: Deployment (Week 11-12)
1. Production deployment
2. User training
3. Monitoring setup
4. Bug fixes and refinements

---

## Security Considerations

1. **Role-Based Access Control**: Enforce strict role checks for all operations
2. **Audit Trail**: Log all state-changing operations with user and timestamp
3. **Input Validation**: Validate all inputs using Zod schemas
4. **SQL Injection Prevention**: Use parameterized queries
5. **XSS Prevention**: Sanitize all user inputs in UI
6. **CSRF Protection**: Implement CSRF tokens for state-changing operations
7. **Rate Limiting**: Prevent abuse of API endpoints
8. **Encryption**: Encrypt sensitive data in transit and at rest

---

## Performance Optimization

1. **Database Indexing**: Index frequently queried fields (company, posting_date, status)
2. **Caching**: Cache configuration and frequently accessed data
3. **Pagination**: Implement pagination for large result sets
4. **Lazy Loading**: Load data on-demand in UI
5. **Background Jobs**: Run heavy operations (closing, validation) in background
6. **Query Optimization**: Optimize GL Entry queries with proper filters
7. **Connection Pooling**: Use connection pooling for database connections

---

## Monitoring and Observability

1. **Error Tracking**: Sentry for error monitoring
2. **Performance Monitoring**: Track API response times
3. **Audit Log Analysis**: Regular review of audit logs
4. **User Activity Tracking**: Monitor user actions and patterns
5. **System Health Checks**: Regular health checks for ERPNext integration
6. **Alerting**: Set up alerts for critical errors and performance degradation

---

**Document Version**: 1.0  
**Last Updated**: 2024-02-20  
**Author**: Development Team  
**Status**: Ready for Implementation


---

## Installation & Setup Scripts

### Overview

Untuk mempermudah instalasi dan menghindari error manual, kami menyediakan dua metode instalasi:
1. **Method 1 (Recommended)**: Membuat DocTypes langsung di Frappe app `batasku_custom` menggunakan JSON fixtures
2. **Method 2 (Alternative)**: Membuat DocTypes via ERPNext REST API

### Prerequisites

- ERPNext instance yang sudah running di `erpnext-dev/`
- Frappe bench installed dan configured
- `batasku_custom` app sudah terinstall
- Python 3.8+ (untuk Frappe)
- Node.js 18+ (untuk Next.js frontend)

---

## Method 1: Frappe App Installation (Recommended)

Metode ini membuat DocTypes langsung di `batasku_custom` app sebagai bagian dari custom app Anda.

### Step 1: Buat DocType JSON Files

Buat folder untuk DocTypes di `batasku_custom`:

```bash
cd erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom
mkdir -p doctype/accounting_period
mkdir -p doctype/period_closing_log
mkdir -p doctype/period_closing_config
```

### Step 2: Accounting Period DocType

Buat file `erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/accounting_period/accounting_period.json`:

```json
{
 "actions": [],
 "allow_rename": 1,
 "autoname": "format:ACC-PERIOD-{YYYY}-{####}",
 "creation": "2024-02-20 10:00:00.000000",
 "doctype": "DocType",
 "engine": "InnoDB",
 "field_order": [
  "period_name",
  "company",
  "section_break_1",
  "start_date",
  "end_date",
  "column_break_1",
  "period_type",
  "fiscal_year",
  "section_break_2",
  "status",
  "column_break_2",
  "closed_by",
  "closed_on",
  "section_break_3",
  "closing_journal_entry",
  "column_break_3",
  "permanently_closed_by",
  "permanently_closed_on",
  "section_break_4",
  "remarks"
 ],
 "fields": [
  {
   "fieldname": "period_name",
   "fieldtype": "Data",
   "in_list_view": 1,
   "label": "Period Name",
   "reqd": 1
  },
  {
   "fieldname": "company",
   "fieldtype": "Link",
   "in_list_view": 1,
   "label": "Company",
   "options": "Company",
   "reqd": 1
  },
  {
   "fieldname": "section_break_1",
   "fieldtype": "Section Break",
   "label": "Period Details"
  },
  {
   "fieldname": "start_date",
   "fieldtype": "Date",
   "in_list_view": 1,
   "label": "Start Date",
   "reqd": 1
  },
  {
   "fieldname": "end_date",
   "fieldtype": "Date",
   "in_list_view": 1,
   "label": "End Date",
   "reqd": 1
  },
  {
   "fieldname": "column_break_1",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "period_type",
   "fieldtype": "Select",
   "label": "Period Type",
   "options": "Monthly\nQuarterly\nYearly",
   "default": "Monthly",
   "reqd": 1
  },
  {
   "fieldname": "fiscal_year",
   "fieldtype": "Link",
   "label": "Fiscal Year",
   "options": "Fiscal Year"
  },
  {
   "fieldname": "section_break_2",
   "fieldtype": "Section Break",
   "label": "Status"
  },
  {
   "fieldname": "status",
   "fieldtype": "Select",
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Status",
   "options": "Open\nClosed\nPermanently Closed",
   "default": "Open",
   "reqd": 1
  },
  {
   "fieldname": "column_break_2",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "closed_by",
   "fieldtype": "Link",
   "label": "Closed By",
   "options": "User",
   "read_only": 1
  },
  {
   "fieldname": "closed_on",
   "fieldtype": "Datetime",
   "label": "Closed On",
   "read_only": 1
  },
  {
   "fieldname": "section_break_3",
   "fieldtype": "Section Break",
   "label": "Closing Details"
  },
  {
   "fieldname": "closing_journal_entry",
   "fieldtype": "Link",
   "label": "Closing Journal Entry",
   "options": "Journal Entry",
   "read_only": 1
  },
  {
   "fieldname": "column_break_3",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "permanently_closed_by",
   "fieldtype": "Link",
   "label": "Permanently Closed By",
   "options": "User",
   "read_only": 1
  },
  {
   "fieldname": "permanently_closed_on",
   "fieldtype": "Datetime",
   "label": "Permanently Closed On",
   "read_only": 1
  },
  {
   "fieldname": "section_break_4",
   "fieldtype": "Section Break",
   "label": "Remarks"
  },
  {
   "fieldname": "remarks",
   "fieldtype": "Text Editor",
   "label": "Remarks"
  }
 ],
 "index_web_pages_for_search": 1,
 "links": [],
 "modified": "2024-02-20 10:00:00.000000",
 "modified_by": "Administrator",
 "module": "Batasku Custom",
 "name": "Accounting Period",
 "naming_rule": "Expression",
 "owner": "Administrator",
 "permissions": [
  {
   "create": 1,
   "delete": 1,
   "email": 1,
   "export": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "Accounts Manager",
   "share": 1,
   "write": 1
  },
  {
   "email": 1,
   "export": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "Accounts User",
   "share": 1
  }
 ],
 "sort_field": "modified",
 "sort_order": "DESC",
 "states": [],
 "track_changes": 1
}
```

### Step 3: Period Closing Log DocType

Buat file `erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_log/period_closing_log.json`:

```json
{
 "actions": [],
 "autoname": "format:PCL-{YYYY}-{#####}",
 "creation": "2024-02-20 10:00:00.000000",
 "doctype": "DocType",
 "engine": "InnoDB",
 "field_order": [
  "accounting_period",
  "action_type",
  "section_break_1",
  "action_by",
  "action_date",
  "column_break_1",
  "ip_address",
  "user_agent",
  "section_break_2",
  "transaction_doctype",
  "affected_transaction",
  "section_break_3",
  "reason",
  "column_break_2",
  "before_snapshot",
  "after_snapshot"
 ],
 "fields": [
  {
   "fieldname": "accounting_period",
   "fieldtype": "Link",
   "in_list_view": 1,
   "label": "Accounting Period",
   "options": "Accounting Period",
   "reqd": 1
  },
  {
   "fieldname": "action_type",
   "fieldtype": "Select",
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Action Type",
   "options": "Created\nClosed\nReopened\nPermanently Closed\nTransaction Modified",
   "reqd": 1
  },
  {
   "fieldname": "section_break_1",
   "fieldtype": "Section Break",
   "label": "Action Details"
  },
  {
   "fieldname": "action_by",
   "fieldtype": "Link",
   "in_list_view": 1,
   "label": "Action By",
   "options": "User",
   "reqd": 1
  },
  {
   "fieldname": "action_date",
   "fieldtype": "Datetime",
   "in_list_view": 1,
   "label": "Action Date",
   "default": "now",
   "reqd": 1
  },
  {
   "fieldname": "column_break_1",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "ip_address",
   "fieldtype": "Data",
   "label": "IP Address"
  },
  {
   "fieldname": "user_agent",
   "fieldtype": "Data",
   "label": "User Agent"
  },
  {
   "fieldname": "section_break_2",
   "fieldtype": "Section Break",
   "label": "Transaction Details"
  },
  {
   "fieldname": "transaction_doctype",
   "fieldtype": "Data",
   "label": "Transaction DocType"
  },
  {
   "fieldname": "affected_transaction",
   "fieldtype": "Dynamic Link",
   "label": "Affected Transaction",
   "options": "transaction_doctype"
  },
  {
   "fieldname": "section_break_3",
   "fieldtype": "Section Break",
   "label": "Reason & Snapshots"
  },
  {
   "fieldname": "reason",
   "fieldtype": "Text",
   "label": "Reason"
  },
  {
   "fieldname": "column_break_2",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "before_snapshot",
   "fieldtype": "Long Text",
   "label": "Before Snapshot"
  },
  {
   "fieldname": "after_snapshot",
   "fieldtype": "Long Text",
   "label": "After Snapshot"
  }
 ],
 "index_web_pages_for_search": 1,
 "links": [],
 "modified": "2024-02-20 10:00:00.000000",
 "modified_by": "Administrator",
 "module": "Batasku Custom",
 "name": "Period Closing Log",
 "naming_rule": "Expression",
 "owner": "Administrator",
 "permissions": [
  {
   "email": 1,
   "export": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "Accounts Manager",
   "share": 1
  },
  {
   "email": 1,
   "export": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "System Manager",
   "share": 1
  }
 ],
 "sort_field": "modified",
 "sort_order": "DESC",
 "states": [],
 "track_changes": 1
}
```

### Step 4: Period Closing Config DocType

Buat file `erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_config/period_closing_config.json`:

```json
{
 "actions": [],
 "creation": "2024-02-20 10:00:00.000000",
 "doctype": "DocType",
 "engine": "InnoDB",
 "field_order": [
  "section_break_1",
  "retained_earnings_account",
  "section_break_2",
  "enable_draft_transaction_check",
  "enable_unposted_transaction_check",
  "enable_bank_reconciliation_check",
  "column_break_1",
  "enable_sales_invoice_check",
  "enable_purchase_invoice_check",
  "enable_inventory_check",
  "enable_payroll_check",
  "section_break_3",
  "closing_role",
  "reopen_role",
  "section_break_4",
  "enable_email_notifications",
  "reminder_days_before_end",
  "escalation_days_after_end"
 ],
 "fields": [
  {
   "fieldname": "section_break_1",
   "fieldtype": "Section Break",
   "label": "Account Settings"
  },
  {
   "fieldname": "retained_earnings_account",
   "fieldtype": "Link",
   "label": "Retained Earnings Account",
   "options": "Account",
   "reqd": 1
  },
  {
   "fieldname": "section_break_2",
   "fieldtype": "Section Break",
   "label": "Validation Settings"
  },
  {
   "fieldname": "enable_draft_transaction_check",
   "fieldtype": "Check",
   "label": "Enable Draft Transaction Check",
   "default": 1
  },
  {
   "fieldname": "enable_unposted_transaction_check",
   "fieldtype": "Check",
   "label": "Enable Unposted Transaction Check",
   "default": 1
  },
  {
   "fieldname": "enable_bank_reconciliation_check",
   "fieldtype": "Check",
   "label": "Enable Bank Reconciliation Check",
   "default": 1
  },
  {
   "fieldname": "column_break_1",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "enable_sales_invoice_check",
   "fieldtype": "Check",
   "label": "Enable Sales Invoice Check",
   "default": 1
  },
  {
   "fieldname": "enable_purchase_invoice_check",
   "fieldtype": "Check",
   "label": "Enable Purchase Invoice Check",
   "default": 1
  },
  {
   "fieldname": "enable_inventory_check",
   "fieldtype": "Check",
   "label": "Enable Inventory Check",
   "default": 1
  },
  {
   "fieldname": "enable_payroll_check",
   "fieldtype": "Check",
   "label": "Enable Payroll Check",
   "default": 1
  },
  {
   "fieldname": "section_break_3",
   "fieldtype": "Section Break",
   "label": "Permission Settings"
  },
  {
   "fieldname": "closing_role",
   "fieldtype": "Link",
   "label": "Closing Role",
   "options": "Role",
   "default": "Accounts Manager"
  },
  {
   "fieldname": "reopen_role",
   "fieldtype": "Link",
   "label": "Reopen Role",
   "options": "Role",
   "default": "Accounts Manager"
  },
  {
   "fieldname": "section_break_4",
   "fieldtype": "Section Break",
   "label": "Notification Settings"
  },
  {
   "fieldname": "enable_email_notifications",
   "fieldtype": "Check",
   "label": "Enable Email Notifications",
   "default": 1
  },
  {
   "fieldname": "reminder_days_before_end",
   "fieldtype": "Int",
   "label": "Reminder Days Before End",
   "default": 3
  },
  {
   "fieldname": "escalation_days_after_end",
   "fieldtype": "Int",
   "label": "Escalation Days After End",
   "default": 7
  }
 ],
 "index_web_pages_for_search": 1,
 "issingle": 1,
 "links": [],
 "modified": "2024-02-20 10:00:00.000000",
 "modified_by": "Administrator",
 "module": "Batasku Custom",
 "name": "Period Closing Config",
 "owner": "Administrator",
 "permissions": [
  {
   "create": 1,
   "email": 1,
   "print": 1,
   "read": 1,
   "role": "Accounts Manager",
   "share": 1,
   "write": 1
  },
  {
   "create": 1,
   "email": 1,
   "print": 1,
   "read": 1,
   "role": "System Manager",
   "share": 1,
   "write": 1
  }
 ],
 "sort_field": "modified",
 "sort_order": "DESC",
 "states": []
}
```

### Step 5: Buat Python Controller Files

Untuk setiap DocType, buat file Python controller:

**accounting_period.py:**
```python
# erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/accounting_period/accounting_period.py

import frappe
from frappe.model.document import Document
from frappe import _

class AccountingPeriod(Document):
    def validate(self):
        self.validate_dates()
        self.validate_overlap()
    
    def validate_dates(self):
        """Validate that start_date is before end_date"""
        if self.start_date >= self.end_date:
            frappe.throw(_("Start Date must be before End Date"))
    
    def validate_overlap(self):
        """Check for overlapping periods"""
        overlapping = frappe.db.sql("""
            SELECT name, period_name
            FROM `tabAccounting Period`
            WHERE company = %s
            AND name != %s
            AND (
                (start_date <= %s AND end_date >= %s)
                OR (start_date <= %s AND end_date >= %s)
                OR (start_date >= %s AND end_date <= %s)
            )
        """, (self.company, self.name or '', self.start_date, self.start_date,
              self.end_date, self.end_date, self.start_date, self.end_date))
        
        if overlapping:
            frappe.throw(_("Period overlaps with existing period: {0}").format(overlapping[0][1]))
    
    def before_insert(self):
        """Set default status to Open"""
        if not self.status:
            self.status = "Open"
```

**period_closing_log.py:**
```python
# erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_log/period_closing_log.py

import frappe
from frappe.model.document import Document

class PeriodClosingLog(Document):
    def before_insert(self):
        """Auto-populate action_by and action_date"""
        if not self.action_by:
            self.action_by = frappe.session.user
        if not self.action_date:
            self.action_date = frappe.utils.now()
```

**period_closing_config.py:**
```python
# erpnext-dev/apps/batasku_custom/batasku_custom/batasku_custom/doctype/period_closing_config/period_closing_config.py

import frappe
from frappe.model.document import Document
from frappe import _

class PeriodClosingConfig(Document):
    def validate(self):
        self.validate_retained_earnings_account()
    
    def validate_retained_earnings_account(self):
        """Validate that retained earnings account is an Equity account"""
        if self.retained_earnings_account:
            account = frappe.get_doc("Account", self.retained_earnings_account)
            if account.root_type != "Equity":
                frappe.throw(_("Retained Earnings Account must be an Equity account"))
```

### Step 6: Update hooks.py

Tambahkan fixtures di `batasku_custom/hooks.py`:

```python
fixtures = [
    {"dt": "Custom Field", "filters": [["module", "=", "Batasku Custom"]]},
    {"dt": "Property Setter", "filters": [["module", "=", "Batasku Custom"]]},
    {"dt": "Client Script", "filters": [["module", "=", "Batasku Custom"]]},
    {"dt": "Server Script", "filters": [["module", "=", "Batasku Custom"]]},
    # Add DocTypes
    {"dt": "DocType", "filters": [["module", "=", "Batasku Custom"]]}
]
```

### Step 7: Install DocTypes

Jalankan perintah berikut di terminal:

```bash
cd erpnext-dev

# Migrate database untuk create DocTypes
bench --site batasku.local migrate

# Atau clear cache dan rebuild
bench --site batasku.local clear-cache
bench --site batasku.local build

# Restart bench
bench restart
```

### Step 8: Verify Installation

```bash
# Check if DocTypes created
bench --site batasku.local console

# Di console Python:
>>> import frappe
>>> frappe.get_doc("DocType", "Accounting Period")
>>> frappe.get_doc("DocType", "Period Closing Log")
>>> frappe.get_doc("DocType", "Period Closing Config")
```

---

## Method 2: REST API Installation (Alternative)

Jika Method 1 tidak berhasil, gunakan script Python/TypeScript yang sudah disediakan di section sebelumnya untuk create DocTypes via REST API.

**Catatan:** Method ini kurang recommended karena:
- DocTypes tidak terintegrasi dengan `batasku_custom` app
- Tidak ter-version control
- Sulit untuk maintenance dan upgrade

---

## Next.js API Integration

Setelah DocTypes terinstall, buat API routes di Next.js untuk mengakses DocTypes:

### Struktur API Routes

```
erp-next-system/app/api/accounting-period/
├── periods/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [name]/
│       ├── route.ts                # GET (detail), PUT (update)
│       ├── submit/route.ts         # POST (submit)
│       └── cancel/route.ts         # POST (cancel)
├── validate/route.ts               # POST (pre-closing validation)
├── close/route.ts                  # POST (close period)
├── reopen/route.ts                 # POST (reopen period)
├── permanent-close/route.ts        # POST (permanent close)
├── reports/
│   └── closing-summary/route.ts   # GET (closing summary report)
├── audit-log/route.ts              # GET (audit logs)
└── config/route.ts                 # GET, PUT (configuration)
```

### Example API Route

```typescript
// erp-next-system/app/api/accounting-period/periods/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClient } from '@/lib/erpnext';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company = searchParams.get('company');
    const status = searchParams.get('status');
    
    const client = getERPNextClient();
    const filters = [];
    
    if (company) filters.push(['company', '=', company]);
    if (status) filters.push(['status', '=', status]);
    
    const periods = await client.getList('Accounting Period', {
      filters,
      fields: ['name', 'period_name', 'company', 'start_date', 'end_date', 'status'],
      limit_page_length: 100
    });
    
    return NextResponse.json({
      success: true,
      data: periods
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getERPNextClient();
    
    const period = await client.insert('Accounting Period', body);
    
    return NextResponse.json({
      success: true,
      data: period
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
```

---

## Troubleshooting

### Error: "DocType not found"
```bash
# Clear cache dan rebuild
bench --site batasku.local clear-cache
bench --site batasku.local migrate
bench restart
```

### Error: "Permission denied"
```bash
# Set permissions via bench console
bench --site batasku.local console

>>> import frappe
>>> frappe.get_doc("DocType", "Accounting Period").save()
```

### Error: "Module not found"
- Pastikan `Batasku Custom` module sudah terdaftar di `modules.txt`
- Restart bench setelah menambahkan module baru

---

Simpan script berikut sebagai `setup_accounting_period.py`:

```python
#!/usr/bin/env python3
"""
Script untuk setup Custom DocTypes untuk Accounting Period Closing
Jalankan: python3 setup_accounting_period.py
"""

import requests
import json
import sys
from typing import Dict, List, Any

class ERPNextSetup:
    def __init__(self, base_url: str, api_key: str, api_secret: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.api_secret = api_secret
        self.headers = {
            'Authorization': f'token {api_key}:{api_secret}',
            'Content-Type': 'application/json'
        }
    
    def create_doctype(self, doctype_def: Dict[str, Any]) -> bool:
        """Create a custom DocType"""
        try:
            url = f'{self.base_url}/api/resource/DocType'
            response = requests.post(url, headers=self.headers, json=doctype_def)
            
            if response.status_code in [200, 201]:
                print(f"✓ Created DocType: {doctype_def['name']}")
                return True
            elif response.status_code == 409:
                print(f"⚠ DocType already exists: {doctype_def['name']}")
                return True
            else:
                print(f"✗ Failed to create DocType: {doctype_def['name']}")
                print(f"  Status: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error creating DocType {doctype_def['name']}: {str(e)}")
            return False
    
    def get_accounting_period_doctype(self) -> Dict[str, Any]:
        """Define Accounting Period DocType"""
        return {
            "doctype": "DocType",
            "name": "Accounting Period",
            "module": "Accounts",
            "custom": 1,
            "is_submittable": 0,
            "track_changes": 1,
            "autoname": "format:ACC-PERIOD-{YYYY}-{####}",
            "fields": [
                {
                    "fieldname": "period_name",
                    "fieldtype": "Data",
                    "label": "Period Name",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "company",
                    "fieldtype": "Link",
                    "options": "Company",
                    "label": "Company",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "section_break_1",
                    "fieldtype": "Section Break",
                    "label": "Period Details"
                },
                {
                    "fieldname": "start_date",
                    "fieldtype": "Date",
                    "label": "Start Date",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "end_date",
                    "fieldtype": "Date",
                    "label": "End Date",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "column_break_1",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "period_type",
                    "fieldtype": "Select",
                    "options": "Monthly\nQuarterly\nYearly",
                    "label": "Period Type",
                    "default": "Monthly",
                    "reqd": 1
                },
                {
                    "fieldname": "fiscal_year",
                    "fieldtype": "Link",
                    "options": "Fiscal Year",
                    "label": "Fiscal Year"
                },
                {
                    "fieldname": "section_break_2",
                    "fieldtype": "Section Break",
                    "label": "Status"
                },
                {
                    "fieldname": "status",
                    "fieldtype": "Select",
                    "options": "Open\nClosed\nPermanently Closed",
                    "label": "Status",
                    "default": "Open",
                    "reqd": 1,
                    "in_list_view": 1,
                    "in_standard_filter": 1
                },
                {
                    "fieldname": "column_break_2",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "closed_by",
                    "fieldtype": "Link",
                    "options": "User",
                    "label": "Closed By",
                    "read_only": 1
                },
                {
                    "fieldname": "closed_on",
                    "fieldtype": "Datetime",
                    "label": "Closed On",
                    "read_only": 1
                },
                {
                    "fieldname": "section_break_3",
                    "fieldtype": "Section Break",
                    "label": "Closing Details"
                },
                {
                    "fieldname": "closing_journal_entry",
                    "fieldtype": "Link",
                    "options": "Journal Entry",
                    "label": "Closing Journal Entry",
                    "read_only": 1
                },
                {
                    "fieldname": "column_break_3",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "permanently_closed_by",
                    "fieldtype": "Link",
                    "options": "User",
                    "label": "Permanently Closed By",
                    "read_only": 1
                },
                {
                    "fieldname": "permanently_closed_on",
                    "fieldtype": "Datetime",
                    "label": "Permanently Closed On",
                    "read_only": 1
                },
                {
                    "fieldname": "section_break_4",
                    "fieldtype": "Section Break",
                    "label": "Remarks"
                },
                {
                    "fieldname": "remarks",
                    "fieldtype": "Text Editor",
                    "label": "Remarks"
                }
            ],
            "permissions": [
                {
                    "role": "Accounts Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1
                },
                {
                    "role": "Accounts User",
                    "read": 1
                }
            ]
        }
    
    def get_period_closing_log_doctype(self) -> Dict[str, Any]:
        """Define Period Closing Log DocType"""
        return {
            "doctype": "DocType",
            "name": "Period Closing Log",
            "module": "Accounts",
            "custom": 1,
            "is_submittable": 0,
            "track_changes": 1,
            "autoname": "format:PCL-{YYYY}-{#####}",
            "fields": [
                {
                    "fieldname": "accounting_period",
                    "fieldtype": "Link",
                    "options": "Accounting Period",
                    "label": "Accounting Period",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "action_type",
                    "fieldtype": "Select",
                    "options": "Created\nClosed\nReopened\nPermanently Closed\nTransaction Modified",
                    "label": "Action Type",
                    "reqd": 1,
                    "in_list_view": 1,
                    "in_standard_filter": 1
                },
                {
                    "fieldname": "section_break_1",
                    "fieldtype": "Section Break",
                    "label": "Action Details"
                },
                {
                    "fieldname": "action_by",
                    "fieldtype": "Link",
                    "options": "User",
                    "label": "Action By",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "action_date",
                    "fieldtype": "Datetime",
                    "label": "Action Date",
                    "default": "now",
                    "reqd": 1,
                    "in_list_view": 1
                },
                {
                    "fieldname": "column_break_1",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "ip_address",
                    "fieldtype": "Data",
                    "label": "IP Address"
                },
                {
                    "fieldname": "user_agent",
                    "fieldtype": "Data",
                    "label": "User Agent"
                },
                {
                    "fieldname": "section_break_2",
                    "fieldtype": "Section Break",
                    "label": "Transaction Details"
                },
                {
                    "fieldname": "transaction_doctype",
                    "fieldtype": "Data",
                    "label": "Transaction DocType"
                },
                {
                    "fieldname": "affected_transaction",
                    "fieldtype": "Dynamic Link",
                    "options": "transaction_doctype",
                    "label": "Affected Transaction"
                },
                {
                    "fieldname": "section_break_3",
                    "fieldtype": "Section Break",
                    "label": "Reason & Snapshots"
                },
                {
                    "fieldname": "reason",
                    "fieldtype": "Text",
                    "label": "Reason"
                },
                {
                    "fieldname": "column_break_2",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "before_snapshot",
                    "fieldtype": "Long Text",
                    "label": "Before Snapshot"
                },
                {
                    "fieldname": "after_snapshot",
                    "fieldtype": "Long Text",
                    "label": "After Snapshot"
                }
            ],
            "permissions": [
                {
                    "role": "Accounts Manager",
                    "read": 1
                },
                {
                    "role": "System Manager",
                    "read": 1
                }
            ]
        }
    
    def get_period_closing_config_doctype(self) -> Dict[str, Any]:
        """Define Period Closing Config DocType"""
        return {
            "doctype": "DocType",
            "name": "Period Closing Config",
            "module": "Accounts",
            "custom": 1,
            "issingle": 1,
            "fields": [
                {
                    "fieldname": "section_break_1",
                    "fieldtype": "Section Break",
                    "label": "Account Settings"
                },
                {
                    "fieldname": "retained_earnings_account",
                    "fieldtype": "Link",
                    "options": "Account",
                    "label": "Retained Earnings Account",
                    "reqd": 1
                },
                {
                    "fieldname": "section_break_2",
                    "fieldtype": "Section Break",
                    "label": "Validation Settings"
                },
                {
                    "fieldname": "enable_draft_transaction_check",
                    "fieldtype": "Check",
                    "label": "Enable Draft Transaction Check",
                    "default": 1
                },
                {
                    "fieldname": "enable_unposted_transaction_check",
                    "fieldtype": "Check",
                    "label": "Enable Unposted Transaction Check",
                    "default": 1
                },
                {
                    "fieldname": "enable_bank_reconciliation_check",
                    "fieldtype": "Check",
                    "label": "Enable Bank Reconciliation Check",
                    "default": 1
                },
                {
                    "fieldname": "column_break_1",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "enable_sales_invoice_check",
                    "fieldtype": "Check",
                    "label": "Enable Sales Invoice Check",
                    "default": 1
                },
                {
                    "fieldname": "enable_purchase_invoice_check",
                    "fieldtype": "Check",
                    "label": "Enable Purchase Invoice Check",
                    "default": 1
                },
                {
                    "fieldname": "enable_inventory_check",
                    "fieldtype": "Check",
                    "label": "Enable Inventory Check",
                    "default": 1
                },
                {
                    "fieldname": "enable_payroll_check",
                    "fieldtype": "Check",
                    "label": "Enable Payroll Check",
                    "default": 1
                },
                {
                    "fieldname": "section_break_3",
                    "fieldtype": "Section Break",
                    "label": "Permission Settings"
                },
                {
                    "fieldname": "closing_role",
                    "fieldtype": "Link",
                    "options": "Role",
                    "label": "Closing Role",
                    "default": "Accounts Manager"
                },
                {
                    "fieldname": "reopen_role",
                    "fieldtype": "Link",
                    "options": "Role",
                    "label": "Reopen Role",
                    "default": "Accounts Manager"
                },
                {
                    "fieldname": "section_break_4",
                    "fieldtype": "Section Break",
                    "label": "Notification Settings"
                },
                {
                    "fieldname": "enable_email_notifications",
                    "fieldtype": "Check",
                    "label": "Enable Email Notifications",
                    "default": 1
                },
                {
                    "fieldname": "reminder_days_before_end",
                    "fieldtype": "Int",
                    "label": "Reminder Days Before End",
                    "default": 3
                },
                {
                    "fieldname": "escalation_days_after_end",
                    "fieldtype": "Int",
                    "label": "Escalation Days After End",
                    "default": 7
                }
            ],
            "permissions": [
                {
                    "role": "Accounts Manager",
                    "read": 1,
                    "write": 1
                },
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1
                }
            ]
        }
    
    def setup_all(self) -> bool:
        """Setup all DocTypes"""
        print("\n=== Starting Accounting Period Closing Setup ===\n")
        
        doctypes = [
            ("Accounting Period", self.get_accounting_period_doctype()),
            ("Period Closing Log", self.get_period_closing_log_doctype()),
            ("Period Closing Config", self.get_period_closing_config_doctype())
        ]
        
        success = True
        for name, doctype_def in doctypes:
            if not self.create_doctype(doctype_def):
                success = False
        
        if success:
            print("\n✓ All DocTypes created successfully!")
            print("\nNext steps:")
            print("1. Go to ERPNext > Accounts > Period Closing Config")
            print("2. Set the Retained Earnings Account")
            print("3. Configure validation and notification settings")
            print("4. Start using Accounting Period management")
        else:
            print("\n✗ Some DocTypes failed to create. Please check the errors above.")
        
        return success

def main():
    print("=== ERPNext Accounting Period Closing Setup ===\n")
    
    # Get configuration from user
    base_url = input("Enter ERPNext URL (e.g., https://your-site.erpnext.com): ").strip()
    api_key = input("Enter API Key: ").strip()
    api_secret = input("Enter API Secret: ").strip()
    
    if not all([base_url, api_key, api_secret]):
        print("\n✗ Error: All fields are required!")
        sys.exit(1)
    
    # Run setup
    setup = ERPNextSetup(base_url, api_key, api_secret)
    success = setup.setup_all()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
```

### Installation Script (Node.js/TypeScript)

Alternatif menggunakan Node.js, simpan sebagai `setup_accounting_period.ts`:

```typescript
#!/usr/bin/env ts-node
/**
 * Script untuk setup Custom DocTypes untuk Accounting Period Closing
 * Jalankan: npx ts-node setup_accounting_period.ts
 */

import axios, { AxiosInstance } from 'axios';
import * as readline from 'readline';

interface DocTypeField {
  fieldname: string;
  fieldtype: string;
  label?: string;
  options?: string;
  reqd?: number;
  default?: string | number;
  read_only?: number;
  in_list_view?: number;
  in_standard_filter?: number;
}

interface DocTypePermission {
  role: string;
  read?: number;
  write?: number;
  create?: number;
  delete?: number;
}

interface DocTypeDef {
  doctype: string;
  name: string;
  module: string;
  custom: number;
  is_submittable?: number;
  issingle?: number;
  track_changes?: number;
  autoname?: string;
  fields: DocTypeField[];
  permissions: DocTypePermission[];
}

class ERPNextSetup {
  private client: AxiosInstance;

  constructor(baseUrl: string, apiKey: string, apiSecret: string) {
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createDocType(docTypeDef: DocTypeDef): Promise<boolean> {
    try {
      const response = await this.client.post('/api/resource/DocType', docTypeDef);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✓ Created DocType: ${docTypeDef.name}`);
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`⚠ DocType already exists: ${docTypeDef.name}`);
        return true;
      }
      console.error(`✗ Failed to create DocType: ${docTypeDef.name}`);
      console.error(`  Error: ${error.message}`);
      return false;
    }
  }

  async setupAll(): Promise<boolean> {
    console.log('\n=== Starting Accounting Period Closing Setup ===\n');
    
    const docTypes = [
      this.getAccountingPeriodDocType(),
      this.getPeriodClosingLogDocType(),
      this.getPeriodClosingConfigDocType()
    ];
    
    let success = true;
    for (const docType of docTypes) {
      if (!await this.createDocType(docType)) {
        success = false;
      }
    }
    
    if (success) {
      console.log('\n✓ All DocTypes created successfully!');
      console.log('\nNext steps:');
      console.log('1. Go to ERPNext > Accounts > Period Closing Config');
      console.log('2. Set the Retained Earnings Account');
      console.log('3. Configure validation and notification settings');
      console.log('4. Start using Accounting Period management');
    } else {
      console.log('\n✗ Some DocTypes failed to create. Please check the errors above.');
    }
    
    return success;
  }

  private getAccountingPeriodDocType(): DocTypeDef {
    // Same structure as Python version
    return {
      doctype: "DocType",
      name: "Accounting Period",
      module: "Accounts",
      custom: 1,
      is_submittable: 0,
      track_changes: 1,
      autoname: "format:ACC-PERIOD-{YYYY}-{####}",
      fields: [
        // ... (same fields as Python version)
      ],
      permissions: [
        { role: "Accounts Manager", read: 1, write: 1, create: 1, delete: 1 },
        { role: "Accounts User", read: 1 }
      ]
    };
  }

  private getPeriodClosingLogDocType(): DocTypeDef {
    // Same structure as Python version
    return {
      doctype: "DocType",
      name: "Period Closing Log",
      module: "Accounts",
      custom: 1,
      // ... (same as Python version)
    };
  }

  private getPeriodClosingConfigDocType(): DocTypeDef {
    // Same structure as Python version
    return {
      doctype: "DocType",
      name: "Period Closing Config",
      module: "Accounts",
      custom: 1,
      issingle: 1,
      // ... (same as Python version)
    };
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('=== ERPNext Accounting Period Closing Setup ===\n');
  
  const baseUrl = await prompt('Enter ERPNext URL (e.g., https://your-site.erpnext.com): ');
  const apiKey = await prompt('Enter API Key: ');
  const apiSecret = await prompt('Enter API Secret: ');
  
  if (!baseUrl || !apiKey || !apiSecret) {
    console.error('\n✗ Error: All fields are required!');
    process.exit(1);
  }
  
  const setup = new ERPNextSetup(baseUrl, apiKey, apiSecret);
  const success = await setup.setupAll();
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
```

### Usage Instructions

#### Menggunakan Python Script:

```bash
# 1. Install dependencies
pip install requests

# 2. Jalankan script
python3 setup_accounting_period.py

# 3. Masukkan credentials ketika diminta:
#    - ERPNext URL: https://your-site.erpnext.com
#    - API Key: (dari ERPNext User Settings)
#    - API Secret: (dari ERPNext User Settings)
```

#### Menggunakan Node.js Script:

```bash
# 1. Install dependencies
npm install axios @types/node ts-node typescript

# 2. Jalankan script
npx ts-node setup_accounting_period.ts

# 3. Masukkan credentials ketika diminta
```

### Mendapatkan API Key & Secret

1. Login ke ERPNext
2. Go to: User Menu (top right) → My Settings
3. Scroll ke bagian "API Access"
4. Click "Generate Keys"
5. Copy API Key dan API Secret

### Verification Script

Script untuk memverifikasi instalasi berhasil:

```python
#!/usr/bin/env python3
"""Verify Accounting Period Closing installation"""

import requests
import sys

def verify_installation(base_url: str, api_key: str, api_secret: str):
    headers = {
        'Authorization': f'token {api_key}:{api_secret}',
        'Content-Type': 'application/json'
    }
    
    doctypes_to_check = [
        'Accounting Period',
        'Period Closing Log',
        'Period Closing Config'
    ]
    
    print("\n=== Verifying Installation ===\n")
    
    all_ok = True
    for doctype in doctypes_to_check:
        try:
            url = f'{base_url}/api/resource/DocType/{doctype}'
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                print(f"✓ {doctype}: OK")
            else:
                print(f"✗ {doctype}: NOT FOUND")
                all_ok = False
        except Exception as e:
            print(f"✗ {doctype}: ERROR - {str(e)}")
            all_ok = False
    
    if all_ok:
        print("\n✓ All DocTypes installed successfully!")
    else:
        print("\n✗ Some DocTypes are missing. Please run setup script again.")
    
    return all_ok

if __name__ == "__main__":
    base_url = input("Enter ERPNext URL: ").strip()
    api_key = input("Enter API Key: ").strip()
    api_secret = input("Enter API Secret: ").strip()
    
    success = verify_installation(base_url, api_key, api_secret)
    sys.exit(0 if success else 1)
```

### Troubleshooting

#### Error: "Authentication Failed"
- Pastikan API Key dan API Secret benar
- Pastikan user memiliki permission "System Manager"

#### Error: "DocType already exists"
- Ini normal jika script dijalankan lebih dari sekali
- DocType yang sudah ada akan di-skip

#### Error: "Connection Timeout"
- Periksa koneksi internet
- Pastikan ERPNext URL benar dan accessible
- Periksa firewall settings

#### Error: "Permission Denied"
- User harus memiliki role "System Manager"
- Atau minimal "Accounts Manager" dengan custom permissions

### Manual Rollback

Jika perlu menghapus DocTypes yang sudah dibuat:

```python
#!/usr/bin/env python3
"""Rollback Accounting Period Closing installation"""

import requests

def rollback(base_url: str, api_key: str, api_secret: str):
    headers = {
        'Authorization': f'token {api_key}:{api_secret}',
        'Content-Type': 'application/json'
    }
    
    doctypes = [
        'Period Closing Config',  # Delete in reverse order
        'Period Closing Log',
        'Accounting Period'
    ]
    
    for doctype in doctypes:
        try:
            url = f'{base_url}/api/resource/DocType/{doctype}'
            response = requests.delete(url, headers=headers)
            
            if response.status_code == 200:
                print(f"✓ Deleted: {doctype}")
            else:
                print(f"⚠ Could not delete: {doctype}")
        except Exception as e:
            print(f"✗ Error deleting {doctype}: {str(e)}")

if __name__ == "__main__":
    base_url = input("Enter ERPNext URL: ").strip()
    api_key = input("Enter API Key: ").strip()
    api_secret = input("Enter API Secret: ").strip()
    
    confirm = input("\n⚠ WARNING: This will delete all Accounting Period DocTypes. Continue? (yes/no): ")
    
    if confirm.lower() == 'yes':
        rollback(base_url, api_key, api_secret)
    else:
        print("Rollback cancelled.")
```

---
