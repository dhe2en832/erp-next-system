# Sales Module Validation for Accounting Period Closing

## Overview

This document describes the Sales module validation implementation for the Accounting Period Closing feature. The validation ensures that all sales invoices within a period are properly processed before the period can be closed.

## Requirement

**Requirement 11.1**: "WHEN periode ditutup, THE Sistem_Penutupan SHALL memvalidasi bahwa semua invoice penjualan dalam periode telah diproses"

Translation: When a period is closed, the system shall validate that all sales invoices in the period have been processed.

## Implementation

### Location

- **API Route**: `erp-next-system/app/api/accounting-period/validate/route.ts`
- **Function**: `validateSalesInvoices()`
- **Test File**: `erp-next-system/tests/accounting-period-sales-validation.test.ts`

### Validation Logic

The `validateSalesInvoices` function performs the following checks:

1. **Query Draft Invoices**: Queries ERPNext for Sales Invoices with:
   - Company matches the period's company
   - Posting date is within the period date range (start_date to end_date)
   - Document status is 0 (Draft/Unprocessed)

2. **Return Validation Result**: Returns a `ValidationResult` object with:
   - `check_name`: "Sales Invoices Processed"
   - `passed`: `true` if no draft invoices found, `false` otherwise
   - `message`: Descriptive message about the validation result
   - `severity`: "error" (blocks period closing if failed)
   - `details`: Array of unprocessed invoice details (name, customer, grand_total, posting_date)

### ERPNext Document Status

In ERPNext, documents have three possible statuses:
- **docstatus = 0**: Draft (not submitted/processed)
- **docstatus = 1**: Submitted (processed/finalized)
- **docstatus = 2**: Cancelled

The validation checks for `docstatus = 0` to identify unprocessed invoices.

### Integration

The validation is integrated into the main validation framework:

```typescript
// In POST /api/accounting-period/validate
if (config.enable_sales_invoice_check) {
  validations.push(await validateSalesInvoices(erpnext, period));
}
```

The check can be enabled/disabled via the Period Closing Config DocType.

## Test Coverage

The test file `accounting-period-sales-validation.test.ts` includes the following test cases:

### 1. Draft Invoice Detection
- **Purpose**: Verify that draft sales invoices are detected
- **Setup**: Create a draft sales invoice within the period
- **Expected**: Validation fails with error severity
- **Validates**: Core requirement 11.1

### 2. Clean Period
- **Purpose**: Verify validation passes when no sales invoices exist
- **Setup**: Create period without any sales invoices
- **Expected**: Validation passes
- **Validates**: Correct behavior for empty periods

### 3. Submitted Invoice
- **Purpose**: Verify submitted invoices don't trigger validation failure
- **Setup**: Create and submit a sales invoice within the period
- **Expected**: Validation passes
- **Validates**: Only draft invoices should fail validation

### 4. Outside Period
- **Purpose**: Verify invoices outside period date range are ignored
- **Setup**: Create a draft invoice with posting date outside the period
- **Expected**: Validation passes
- **Validates**: Date range filtering works correctly

## Running Tests

To run the Sales module validation tests:

```bash
npm run test:accounting-period-sales-validation
```

**Prerequisites**:
- Next.js dev server must be running (`npm run dev`)
- ERPNext backend must be accessible
- Test customer and item must exist in ERPNext
- Valid API credentials in `.env.local`

## Error Handling

The validation function includes comprehensive error handling:

1. **API Errors**: Catches and logs ERPNext API errors
2. **Network Errors**: Handles connection failures gracefully
3. **Fallback Response**: Returns failed validation with error message if exception occurs

Example error response:
```typescript
{
  check_name: 'Sales Invoices Processed',
  passed: false,
  message: 'Error checking sales invoices',
  severity: 'error',
  details: [],
}
```

## Configuration

The Sales invoice validation can be enabled/disabled in the Period Closing Config:

- **Field**: `enable_sales_invoice_check`
- **Type**: Check (boolean)
- **Default**: `true` (enabled)
- **Location**: Period Closing Config DocType (singleton)

## API Response Example

### Success (No Draft Invoices)
```json
{
  "check_name": "Sales Invoices Processed",
  "passed": true,
  "message": "All sales invoices are processed",
  "severity": "error",
  "details": []
}
```

### Failure (Draft Invoices Found)
```json
{
  "check_name": "Sales Invoices Processed",
  "passed": false,
  "message": "Found 2 unprocessed sales invoice(s) in period",
  "severity": "error",
  "details": [
    {
      "name": "SINV-2024-00001",
      "customer": "Customer A",
      "grand_total": 1000.00,
      "posting_date": "2024-02-15"
    },
    {
      "name": "SINV-2024-00002",
      "customer": "Customer B",
      "grand_total": 2500.00,
      "posting_date": "2024-02-20"
    }
  ]
}
```

## Related Validations

The Sales module validation is part of a comprehensive validation framework that includes:

1. No Draft Transactions (general check across all doctypes)
2. All Transactions Posted (GL Entry verification)
3. Bank Reconciliation Complete
4. **Sales Invoices Processed** (this validation)
5. Purchase Invoices Processed
6. Inventory Transactions Posted
7. Payroll Entries Recorded

## Future Enhancements

Potential improvements for future iterations:

1. **Payment Status Check**: Validate that all sales invoices are paid
2. **Return/Credit Note Check**: Verify all returns are processed
3. **Outstanding Amount Warning**: Warn if significant outstanding amounts exist
4. **Customer-wise Summary**: Group unprocessed invoices by customer
5. **Aging Analysis**: Show aging of unprocessed invoices

## Troubleshooting

### Common Issues

1. **Test Fails with "Customer not found"**
   - Solution: Create a test customer in ERPNext or update test to use existing customer

2. **Test Fails with "Item not found"**
   - Solution: Create a test item in ERPNext or update test to use existing item

3. **Validation Always Passes**
   - Check: Ensure `enable_sales_invoice_check` is enabled in Period Closing Config
   - Check: Verify draft invoices are within the period date range
   - Check: Confirm company matches between period and invoices

4. **API Connection Errors**
   - Check: ERPNext backend is running and accessible
   - Check: API credentials are correct in `.env.local`
   - Check: Network connectivity to ERPNext server

## References

- **Requirements Document**: `.kiro/specs/accounting-period-closing/requirements.md`
- **Design Document**: `.kiro/specs/accounting-period-closing/design.md`
- **Tasks Document**: `.kiro/specs/accounting-period-closing/tasks.md`
- **Main Validation Tests**: `tests/accounting-period-validation-unit.test.ts`
- **Simple Validation Tests**: `tests/accounting-period-validation-simple.test.ts`
