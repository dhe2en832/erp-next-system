# Accounting Period Closing - API Documentation

## Overview

API endpoints untuk mengelola penutupan periode akuntansi. Semua endpoint menggunakan autentikasi ERPNext dan mengembalikan response dalam format JSON.

## Base URL

```
/api/accounting-period
```

## Authentication

Semua endpoint memerlukan autentikasi ERPNext. Gunakan session cookie `sid` dari ERPNext.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource state conflict |
| `BUSINESS_LOGIC_ERROR` | 422 | Business rule violation |
| `INTEGRATION_ERROR` | 502 | ERPNext backend error |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Endpoints

### 1. List Periods

Mendapatkan daftar periode akuntansi dengan filtering dan pagination.

**Endpoint:** `GET /api/accounting-period/periods`

**Query Parameters:**
- `company` (optional): Filter by company name
- `status` (optional): Filter by status (`Open`, `Closed`, `Permanently Closed`)
- `fiscal_year` (optional): Filter by fiscal year
- `limit` (optional): Number of records per page (default: 20)
- `start` (optional): Starting index for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "ACC-PERIOD-2024-01",
      "period_name": "Januari 2024",
      "company": "Batasku",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "period_type": "Monthly",
      "status": "Open",
      "fiscal_year": "2024",
      "creation": "2024-01-01 10:00:00",
      "modified": "2024-01-01 10:00:00"
    }
  ],
  "total_count": 12
}
```

---

### 2. Create Period

Membuat periode akuntansi baru.

**Endpoint:** `POST /api/accounting-period/periods`

**Request Body:**
```json
{
  "period_name": "Januari 2024",
  "company": "Batasku",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "period_type": "Monthly",
  "fiscal_year": "2024",
  "remarks": "Optional remarks"
}
```

**Validations:**
- `start_date` must be before `end_date`
- Period must not overlap with existing periods
- All required fields must be provided

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "ACC-PERIOD-2024-01",
    "period_name": "Januari 2024",
    "status": "Open",
    ...
  },
  "message": "Period created successfully"
}
```

---

### 3. Get Period Details

Mendapatkan detail lengkap periode termasuk closing journal dan account balances.

**Endpoint:** `GET /api/accounting-period/periods/[name]`

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "ACC-PERIOD-2024-01",
    "period_name": "Januari 2024",
    "company": "Batasku",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "status": "Closed",
    "closed_by": "user@example.com",
    "closed_on": "2024-02-01 10:00:00",
    "closing_journal_entry": "JV-2024-00001",
    "account_balances": [
      {
        "account": "4000 - Sales",
        "account_name": "Sales",
        "root_type": "Income",
        "balance": 1000000,
        "is_nominal": true
      }
    ]
  }
}
```

---

### 4. Update Period

Memperbarui informasi periode (hanya untuk periode yang belum permanently closed).

**Endpoint:** `PUT /api/accounting-period/periods/[name]`

**Request Body:**
```json
{
  "remarks": "Updated remarks",
  "period_name": "Updated name"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Period updated successfully"
}
```

---

### 5. Validate Period

Menjalankan validasi sebelum penutupan periode.

**Endpoint:** `POST /api/accounting-period/validate`

**Request Body:**
```json
{
  "period_name": "ACC-PERIOD-2024-01",
  "company": "Batasku"
}
```

**Response:**
```json
{
  "success": true,
  "all_passed": false,
  "validations": [
    {
      "check_name": "No Draft Transactions",
      "passed": false,
      "message": "Found 3 draft transaction(s)",
      "severity": "error",
      "details": [
        {
          "doctype": "Journal Entry",
          "name": "JV-2024-00001",
          "posting_date": "2024-01-15"
        }
      ]
    },
    {
      "check_name": "Bank Reconciliation Complete",
      "passed": true,
      "message": "All bank accounts are reconciled",
      "severity": "warning"
    }
  ]
}
```

**Validation Checks:**
1. No Draft Transactions (error)
2. All Transactions Posted (error)
3. Bank Reconciliation Complete (warning)
4. Sales Invoices Processed (error)
5. Purchase Invoices Processed (error)
6. Inventory Transactions Posted (error)
7. Payroll Entries Recorded (error)

---

### 6. Close Period

Menutup periode akuntansi dan membuat closing journal.

**Endpoint:** `POST /api/accounting-period/close`

**Request Body:**
```json
{
  "period_name": "ACC-PERIOD-2024-01",
  "company": "Batasku",
  "force": false
}
```

**Parameters:**
- `force` (optional): Skip validations (admin only, default: false)

**Permissions Required:**
- Role configured in `closing_role` (default: Accounts Manager)
- Or System Manager role

**Process:**
1. Validate period status is "Open"
2. Check user permissions
3. Run pre-closing validations (unless force=true)
4. Create closing journal entry
5. Calculate and save account balances snapshot
6. Update period status to "Closed"
7. Record closed_by and closed_on
8. Create audit log entry
9. Send notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { ... },
    "closing_journal": {
      "name": "JV-2024-00001",
      "posting_date": "2024-01-31",
      "accounts": [ ... ]
    },
    "account_balances": [ ... ]
  },
  "message": "Period closed successfully"
}
```

---

### 7. Reopen Period

Membuka kembali periode yang sudah ditutup.

**Endpoint:** `POST /api/accounting-period/reopen`

**Request Body:**
```json
{
  "period_name": "ACC-PERIOD-2024-01",
  "company": "Batasku",
  "reason": "Koreksi transaksi yang terlewat"
}
```

**Permissions Required:**
- Role configured in `reopen_role` (default: Accounts Manager)
- Or System Manager role

**Validations:**
- Period status must be "Closed" (not "Permanently Closed")
- Next period must not be closed
- Reason is required

**Process:**
1. Validate period status
2. Check user permissions
3. Validate next period is not closed
4. Cancel and delete closing journal entry
5. Update period status to "Open"
6. Clear closed_by and closed_on
7. Create audit log entry
8. Send notifications

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Period reopened successfully"
}
```

---

### 8. Permanent Close Period

Menutup periode secara permanen (tidak dapat dibuka kembali).

**Endpoint:** `POST /api/accounting-period/permanent-close`

**Request Body:**
```json
{
  "period_name": "ACC-PERIOD-2024-01",
  "company": "Batasku",
  "confirmation": "PERMANENT"
}
```

**Permissions Required:**
- System Manager role only

**Validations:**
- Period status must be "Closed"
- Confirmation string must be exactly "PERMANENT"

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Period permanently closed. This action cannot be undone."
}
```

---

### 9. Check Transaction Restriction

Memeriksa apakah transaksi dapat dibuat/diubah pada tanggal tertentu.

**Endpoint:** `POST /api/accounting-period/check-restriction`

**Request Body:**
```json
{
  "company": "Batasku",
  "posting_date": "2024-01-15",
  "doctype": "Journal Entry"
}
```

**Response:**
```json
{
  "success": true,
  "restricted": true,
  "period": {
    "name": "ACC-PERIOD-2024-01",
    "status": "Closed"
  },
  "message": "Cannot modify transaction: Period is closed",
  "can_override": false
}
```

---

### 10. Get Account Balances

Mendapatkan saldo akun untuk periode tertentu.

**Endpoint:** `GET /api/accounting-period/balances/[name]`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "account": "4000 - Sales",
      "account_name": "Sales",
      "account_type": "Income",
      "root_type": "Income",
      "is_group": false,
      "debit": 0,
      "credit": 1000000,
      "balance": 1000000,
      "is_nominal": true
    }
  ]
}
```

---

### 11. Preview Closing Journal

Mendapatkan preview jurnal penutup sebelum periode ditutup.

**Endpoint:** `GET /api/accounting-period/preview-closing/[name]`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { ... },
    "journal_accounts": [
      {
        "account": "4000 - Sales",
        "account_name": "Sales",
        "debit_in_account_currency": 1000000,
        "credit_in_account_currency": 0,
        "user_remark": "Closing Sales for period Januari 2024"
      },
      {
        "account": "3600 - Retained Earnings",
        "account_name": "Retained Earnings",
        "debit_in_account_currency": 0,
        "credit_in_account_currency": 500000,
        "user_remark": "Net income for period Januari 2024"
      }
    ],
    "total_income": 1000000,
    "total_expense": 500000,
    "net_income": 500000,
    "retained_earnings_account": "3600 - Retained Earnings"
  }
}
```

---

### 12. Get Closing Summary Report

Mendapatkan laporan ringkasan penutupan periode.

**Endpoint:** `GET /api/accounting-period/reports/closing-summary/[name]`

**Query Parameters:**
- `format` (optional): Response format (`json`, `pdf`, `excel`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "period": { ... },
    "closing_journal": { ... },
    "account_balances": [ ... ],
    "nominal_accounts": [ ... ],
    "real_accounts": [ ... ],
    "net_income": 500000
  }
}
```

**Response (PDF/Excel):**
Returns file download with appropriate Content-Type header.

---

### 13. Get Audit Log

Mendapatkan audit trail untuk periode atau aktivitas tertentu.

**Endpoint:** `GET /api/accounting-period/audit-log`

**Query Parameters:**
- `period_name` (optional): Filter by period
- `action_type` (optional): Filter by action type
- `action_by` (optional): Filter by user
- `from_date` (optional): Filter by date range (start)
- `to_date` (optional): Filter by date range (end)
- `limit` (optional): Number of records (default: 20)
- `start` (optional): Starting index (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "LOG-00001",
      "accounting_period": "ACC-PERIOD-2024-01",
      "action_type": "Closed",
      "action_by": "user@example.com",
      "action_date": "2024-02-01 10:00:00",
      "reason": null,
      "before_snapshot": "{\"status\":\"Open\"}",
      "after_snapshot": "{\"status\":\"Closed\"}",
      "ip_address": "192.168.1.1"
    }
  ],
  "total_count": 50
}
```

**Action Types:**
- `Created`
- `Closed`
- `Reopened`
- `Permanently Closed`
- `Transaction Modified`

---

### 14. Get Configuration

Mendapatkan konfigurasi penutupan periode.

**Endpoint:** `GET /api/accounting-period/config`

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Period Closing Config",
    "retained_earnings_account": "3600 - Retained Earnings",
    "enable_bank_reconciliation_check": true,
    "enable_draft_transaction_check": true,
    "enable_unposted_transaction_check": true,
    "enable_sales_invoice_check": true,
    "enable_purchase_invoice_check": true,
    "enable_inventory_check": true,
    "enable_payroll_check": true,
    "closing_role": "Accounts Manager",
    "reopen_role": "Accounts Manager",
    "reminder_days_before_end": 3,
    "escalation_days_after_end": 7,
    "enable_email_notifications": true
  }
}
```

---

### 15. Update Configuration

Memperbarui konfigurasi penutupan periode.

**Endpoint:** `PUT /api/accounting-period/config`

**Request Body:**
```json
{
  "retained_earnings_account": "3600 - Retained Earnings",
  "enable_bank_reconciliation_check": true,
  "closing_role": "Accounts Manager",
  "reminder_days_before_end": 5
}
```

**Permissions Required:**
- System Manager or Accounts Manager role

**Validations:**
- `retained_earnings_account` must be an Equity account
- Numeric values must be positive integers

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Configuration updated successfully"
}
```

---

## Rate Limiting

API endpoints menggunakan rate limiting untuk mencegah abuse:
- 100 requests per minute per user untuk read operations
- 20 requests per minute per user untuk write operations

## Webhooks

Sistem dapat mengirim webhook notifications untuk events berikut:
- Period closed
- Period reopened
- Period permanently closed
- Validation failed

Configure webhooks di ERPNext Webhook settings.

## Examples

### Example 1: Complete Closing Workflow

```javascript
// 1. Validate period
const validateResponse = await fetch('/api/accounting-period/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period_name: 'ACC-PERIOD-2024-01',
    company: 'Batasku'
  })
});

const validation = await validateResponse.json();

if (!validation.all_passed) {
  console.log('Validation failed:', validation.validations);
  return;
}

// 2. Preview closing journal
const previewResponse = await fetch(
  '/api/accounting-period/preview-closing/ACC-PERIOD-2024-01'
);
const preview = await previewResponse.json();
console.log('Net income:', preview.data.net_income);

// 3. Close period
const closeResponse = await fetch('/api/accounting-period/close', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period_name: 'ACC-PERIOD-2024-01',
    company: 'Batasku'
  })
});

const result = await closeResponse.json();
console.log('Period closed:', result.message);
```

### Example 2: Reopen Period with Reason

```javascript
const response = await fetch('/api/accounting-period/reopen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period_name: 'ACC-PERIOD-2024-01',
    company: 'Batasku',
    reason: 'Koreksi transaksi yang terlewat pada tanggal 15 Januari'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Period reopened successfully');
}
```

## Support

Untuk pertanyaan atau issues, silakan hubungi tim development atau buat issue di repository.
