# Accounting Period API

This directory contains API endpoints for managing accounting period closing functionality.

## Endpoints

### Period Management
- `GET /api/accounting-period/periods` - List all accounting periods
- `POST /api/accounting-period/periods` - Create a new accounting period
- `GET /api/accounting-period/periods/[name]` - Get period details
- `PUT /api/accounting-period/periods/[name]` - Update period information

### Validation
- `POST /api/accounting-period/validate` - Run pre-closing validations

## Validation Framework

The validation endpoint (`/api/accounting-period/validate`) performs comprehensive checks before allowing a period to be closed.

### Request Format

```json
{
  "period_name": "ACC-PERIOD-2024-01",
  "company": "Batasku"
}
```

### Response Format

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
    }
  ]
}
```

### Validation Checks

The following validation checks are performed (based on Period Closing Config settings):

1. **No Draft Transactions** (Severity: error)
   - Checks for draft Journal Entries, Sales Invoices, Purchase Invoices, and Payment Entries
   - Requirement: 2.1

2. **All Transactions Posted** (Severity: error)
   - Verifies all submitted transactions have corresponding GL entries
   - Requirement: 2.2

3. **Bank Reconciliation Complete** (Severity: warning)
   - Checks for unreconciled bank transactions
   - Requirement: 2.3

4. **Sales Invoices Processed** (Severity: error)
   - Verifies no draft sales invoices exist in the period
   - Requirement: 11.1

5. **Purchase Invoices Processed** (Severity: error)
   - Verifies no draft purchase invoices exist in the period
   - Requirement: 11.2

6. **Inventory Transactions Posted** (Severity: error)
   - Checks for unposted stock entries
   - Requirement: 11.3

7. **Payroll Entries Recorded** (Severity: error)
   - Verifies all salary slips are submitted
   - Requirement: 11.4

### Severity Levels

- **error**: Must be resolved before closing (unless force flag is used)
- **warning**: Should be reviewed but doesn't block closing
- **info**: Informational only

### Configuration

Validation checks can be enabled/disabled in the Period Closing Config DocType:
- `enable_draft_transaction_check`
- `enable_unposted_transaction_check`
- `enable_bank_reconciliation_check`
- `enable_sales_invoice_check`
- `enable_purchase_invoice_check`
- `enable_inventory_check`
- `enable_payroll_check`

## Testing

### Unit Tests
Run unit tests for validation checks:
```bash
npm run test:accounting-period-validation
```

### Simple Tests (No Data Creation)
Run simple endpoint structure tests:
```bash
npm run test:accounting-period-validation-simple
```

### Property-Based Tests
Property-based tests are located in:
- `tests/accounting-period-validation.pbt.test.ts`

These tests verify:
- **Property 5**: Validation Framework Completeness
- **Property 6**: Validation Failure Prevents Closing

## Implementation Details

### File Structure
```
app/api/accounting-period/
├── README.md (this file)
├── periods/
│   ├── route.ts (GET, POST)
│   └── [name]/
│       └── route.ts (GET, PUT)
└── validate/
    └── route.ts (POST)
```

### Dependencies
- ERPNext API client (`lib/erpnext.ts`)
- Zod for request validation
- TypeScript types (`types/accounting-period.ts`)

### Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

## Next Steps

The following endpoints are planned for implementation:
- `POST /api/accounting-period/close` - Close a period
- `POST /api/accounting-period/reopen` - Reopen a closed period
- `POST /api/accounting-period/permanent-close` - Permanently close a period
- `GET /api/accounting-period/reports/closing-summary` - Generate closing report
- `GET /api/accounting-period/audit-log` - View audit trail
- `GET /api/accounting-period/config` - Get configuration
- `PUT /api/accounting-period/config` - Update configuration
