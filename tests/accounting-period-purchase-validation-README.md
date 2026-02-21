# Purchase Module Validation for Accounting Period Closing

## Overview

This document describes the Purchase module validation implementation for the Accounting Period Closing feature. The validation ensures that all purchase invoices within a period are properly processed before the period can be closed.

## Requirement

**Requirement 11.2**: "WHEN periode ditutup, THE Sistem_Penutupan SHALL memvalidasi bahwa semua invoice pembelian dalam periode telah diproses"

Translation: When a period is closed, the system shall validate that all purchase invoices in the period have been processed.

## Implementation

### Location

- **API Route**: `erp-next-system/app/api/accounting-period/validate/route.ts`
- **Function**: `validatePurchaseInvoices()`
- **Test File**: `erp-next-system/tests/accounting-period-purchase-validation.test.ts`

### Validation Logic

The `validatePurchaseInvoices` function performs the following checks:

1. **Query Draft Invoices**: Queries ERPNext for Purchase Invoices with:
   - Company matches the period's company
   - Posting date is within the period date range (start_date to end_date)
   - Document status is 0 (Draft/Unprocessed)

2. **Return Validation Result**: Returns a `ValidationResult` object with:
   - `check_name`: "Purchase Invoices Processed"
   - `passed`: `true` if no draft invoices found, `false` otherwise
   - `message`: Descriptive message about the validation result
   - `severity`: "error" (blocks period closing if failed)
   - `details`: Array of unprocessed invoice details (name, supplier, grand_total, posting_date)

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
if (config.enable_purchase_invoice_check) {
  validations.push(await validatePurchaseInvoices(erpnext, period));
}
```

The check can be enabled/disabled via the Period Closing Config DocType.

## Test Coverage

The test file `accounting-period-purchase-validation.test.ts` includes the following test cases:

### 1. Draft Invoice Detection
- **Purpose**: Verify that draft purchase invoices are detected
- **Setup**: Create a draft purchase invoice within the period
- **Expected**: Validation fails with error severity
- **Validates**: Core requirement 11.2

### 2. Clean Period
- **Purpose**: Verify validation passes when no purchase invoices exist
- **Setup**: Create period without any purchase invoices
- **Expected**: Validation passes
- **Validates**: Correct behavior for empty periods

### 3. Submitted Invoice
- **Purpose**: Verify submitted invoices don't trigger validation failure
- **Setup**: Create and submit a purchase invoice within the period
- **Expected**: Validation passes
- **Validates**: Only draft invoices should fail validation

### 4. Outside Period
- **Purpose**: Verify invoices outside period date range are ignored
- **Setup**: Create a draft invoice with posting date outside the period
- **Expected**: Validation passes
- **Validates**: Date range filtering works correctly

## Running Tests

To run the Purchase module validation tests:

```bash
npm run test:accounting-period-purchase-validation
```

**Prerequisites**:
- Next.js dev server must be running (`npm run dev`)
- ERPNext backend must be accessible
- Test supplier and item must exist in ERPNext
- Valid API credentials in `.env.local`

## Error Handling

The validation function includes comprehensive error handling:

1. **API Errors**: Catches and logs ERPNext API errors
2. **Network Errors**: Handles connection failures gracefully
3. **Fallback Response**: Returns failed validation with error message if exception occurs

Example error response:
```typescript
{
  check_name: 'Purchase Invoices Processed',
  passed: false,
  message: 'Error checking purchase invoices',
  severity: 'error',
  details: [],
}
```

## Configuration

The Purchase invoice validation can be enabled/disabled in the Period Closing Config:

- **Field**: `enable_purchase_invoice_check`
- **Type**: Check (boolean)
- **Default**: `true` (enabled)
- **Location**: Period Closing Config DocType (singleton)

## API Response Example

### Success (No Draft Invoices)
```json
{
  "check_name": "Purchase Invoices Processed",
  "passed": true,
  "message": "All purchase invoices are processed",
  "severity": "error",
  "details": []
}
```

### Failure (Draft Invoices Found)
```json
{
  "check_name": "Purchase Invoices Processed",
  "passed": false,
  "message": "Found 2 unprocessed purchase invoice(s) in period",
  "severity": "error",
  "details": [
    {
      "name": "PINV-2024-00001",
      "supplier": "Supplier A",
      "grand_total": 5000.00,
      "posting_date": "2024-02-15"
    },
    {
      "name": "PINV-2024-00002",
      "supplier": "Supplier B",
      "grand_total": 7500.00,
      "posting_date": "2024-02-20"
    }
  ]
}
```

## Related Validations

The Purchase module validation is part of a comprehensive validation framework that includes:

1. No Draft Transactions (general check across all doctypes)
2. All Transactions Posted (GL Entry verification)
3. Bank Reconciliation Complete
4. Sales Invoices Processed
5. **Purchase Invoices Processed** (this validation)
6. Inventory Transactions Posted
7. Payroll Entries Recorded

## Future Enhancements

Potential improvements for future iterations:

1. **Payment Status Check**: Validate that all purchase invoices are paid
2. **Return/Debit Note Check**: Verify all returns are processed
3. **Outstanding Amount Warning**: Warn if significant outstanding amounts exist
4. **Supplier-wise Summary**: Group unprocessed invoices by supplier
5. **Aging Analysis**: Show aging of unprocessed invoices
6. **Purchase Order Linkage**: Verify all purchase invoices are linked to purchase orders

## Troubleshooting

### Common Issues

1. **Test Fails with "Supplier not found"**
   - Solution: Create a test supplier in ERPNext or update test to use existing supplier

2. **Test Fails with "Item not found"**
   - Solution: Create a test item in ERPNext or update test to use existing item

3. **Validation Always Passes**
   - Check: Ensure `enable_purchase_invoice_check` is enabled in Period Closing Config
   - Check: Verify draft invoices are within the period date range
   - Check: Confirm company matches between period and invoices

4. **API Connection Errors**
   - Check: ERPNext backend is running and accessible
   - Check: API credentials are correct in `.env.local`
   - Check: Network connectivity to ERPNext server

## Comparison with Sales Module

The Purchase module validation follows the same pattern as the Sales module validation:

| Aspect | Sales Module | Purchase Module |
|--------|--------------|-----------------|
| DocType | Sales Invoice | Purchase Invoice |
| Requirement | 11.1 | 11.2 |
| Check Name | "Sales Invoices Processed" | "Purchase Invoices Processed" |
| Key Field | customer | supplier |
| Test Prefix | TEST-SALES-VAL | TEST-PURCHASE-VAL |

Both validations:
- Query for draft invoices (docstatus = 0)
- Filter by company and posting date range
- Return error severity
- Include invoice details in response
- Support enable/disable via config

## References

- **Requirements Document**: `.kiro/specs/accounting-period-closing/requirements.md`
- **Design Document**: `.kiro/specs/accounting-period-closing/design.md`
- **Tasks Document**: `.kiro/specs/accounting-period-closing/tasks.md`
- **Sales Module Validation**: `tests/accounting-period-sales-validation.test.ts`
- **Main Validation Tests**: `tests/accounting-period-validation-unit.test.ts`
- **Simple Validation Tests**: `tests/accounting-period-validation-simple.test.ts`
