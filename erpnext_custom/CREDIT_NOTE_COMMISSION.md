# Credit Note Commission Adjustment

This module handles automatic commission adjustments when Credit Notes (Sales Invoice returns) are submitted or cancelled.

## Overview

When a Credit Note is created from a Sales Invoice, it represents a return of goods that were previously sold. The commission that was earned on the original sale needs to be adjusted to reflect the return.

This module provides ERPNext server scripts that automatically:
1. **On Credit Note Submit**: Reduce the commission on the original Sales Invoice
2. **On Credit Note Cancel**: Restore the commission on the original Sales Invoice

## Requirements

Satisfies requirements:
- **Requirement 7.3**: Commission adjustment when Credit Note is submitted
- **Requirement 7.4**: Commission reversal when Credit Note is cancelled

## Architecture

```
Credit Note Submit
    ↓
Check is_return=1
    ↓
Get original Sales Invoice (return_against)
    ↓
Calculate commission adjustment
    ↓
Update custom_total_komisi_sales on original invoice
    ↓
Log audit trail
```

## Files

### 1. credit_note_commission.py

Main module containing:
- `on_credit_note_submit(doc, method)` - Hook for Credit Note submit
- `on_credit_note_cancel(doc, method)` - Hook for Credit Note cancel
- `calculate_commission_adjustment(credit_note)` - Calculate total commission from items
- `validate_commission_adjustment(original_invoice, credit_note)` - Validate adjustment

### 2. hooks.py

Updated to integrate commission adjustment:
- Modified `on_sales_invoice_submit` to call `on_credit_note_submit` for Credit Notes
- Modified `on_sales_invoice_cancel` to call `on_credit_note_cancel` for Credit Notes

### 3. tests/test_credit_note_commission.py

Unit tests covering:
- Commission calculation from Credit Note items
- Validation of commission adjustments
- Submit hook behavior
- Cancel hook behavior
- Integration workflow tests

## Installation

### Step 1: Copy Files to ERPNext

Copy the `erpnext_custom` directory to your ERPNext installation:

```bash
# From your ERPNext bench directory
cp -r /path/to/erp-next-system/erpnext_custom ./apps/erpnext/erpnext/
```

### Step 2: Configure Hooks

Add the following to your ERPNext custom app's `hooks.py` file:

```python
doc_events = {
    "Sales Invoice": {
        "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
    }
}
```

Or if you already have Sales Invoice hooks, update them to call the erpnext_custom hooks.

### Step 3: Restart ERPNext

```bash
bench restart
```

### Step 4: Verify Installation

Check ERPNext logs to ensure hooks are loaded:

```bash
bench --site [your-site] console
```

Then in the console:
```python
import frappe
from erpnext_custom.credit_note_commission import on_credit_note_submit
print("Commission adjustment module loaded successfully")
```

## Usage

The commission adjustment happens automatically when:

### Creating and Submitting a Credit Note

1. User creates Credit Note from paid Sales Invoice via Next.js frontend
2. Frontend API copies `custom_komisi_sales` from original invoice items (negative values)
3. Frontend API calculates `custom_total_komisi_sales` for Credit Note
4. User submits Credit Note
5. **ERPNext triggers `on_submit` hook**
6. Hook checks `is_return=1` (Credit Note)
7. Hook gets original Sales Invoice from `return_against`
8. Hook reduces `custom_total_komisi_sales` on original invoice
9. Audit trail comment added to both documents

### Cancelling a Credit Note

1. User cancels submitted Credit Note
2. **ERPNext triggers `on_cancel` hook**
3. Hook checks `is_return=1` (Credit Note)
4. Hook gets original Sales Invoice from `return_against`
5. Hook adds back the commission to original invoice
6. Audit trail comment added to both documents

## Commission Calculation Logic

### On Submit

```python
original_commission = 100000  # Original invoice commission
credit_note_commission = -30000  # Credit Note commission (negative)

# Adjustment: subtract absolute value
adjusted_commission = original_commission - abs(credit_note_commission)
# Result: 100000 - 30000 = 70000
```

### On Cancel

```python
current_commission = 70000  # Already adjusted
credit_note_commission = -30000  # Credit Note commission (negative)

# Reversal: add back absolute value
reversed_commission = current_commission + abs(credit_note_commission)
# Result: 70000 + 30000 = 100000
```

## Example Workflow

### Initial State
- Sales Invoice SI-2024-00001
  - Item A: qty=10, rate=10000, commission=5000
  - Item B: qty=5, rate=20000, commission=8000
  - **custom_total_komisi_sales = 13000**

### Create Credit Note
- Credit Note CN-2024-00001 (return 5 units of Item A)
  - Item A: qty=-5, rate=10000, commission=-2500
  - **custom_total_komisi_sales = -2500**
  - **return_against = SI-2024-00001**

### Submit Credit Note
- Hook executes: `on_credit_note_submit`
- Calculation: 13000 - abs(-2500) = 10500
- Sales Invoice SI-2024-00001 updated:
  - **custom_total_komisi_sales = 10500**
- Comment added: "Commission adjusted by Credit Note CN-2024-00001: 13000 - 2500 = 10500"

### Cancel Credit Note
- Hook executes: `on_credit_note_cancel`
- Calculation: 10500 + abs(-2500) = 13000
- Sales Invoice SI-2024-00001 updated:
  - **custom_total_komisi_sales = 13000** (restored)
- Comment added: "Commission reversal by Credit Note CN-2024-00001 cancellation: 10500 + 2500 = 13000"

## Error Handling

### Non-blocking Errors

The hooks are designed to NOT block Credit Note submission/cancellation if commission adjustment fails. Instead:

1. Error is logged to ERPNext error log
2. Warning message shown to user
3. Credit Note operation completes successfully
4. Admin can manually fix commission values

This prevents commission calculation issues from blocking critical business operations.

### Error Scenarios

1. **Original Invoice Not Found**
   - Logs error
   - Shows warning to user
   - Credit Note operation continues

2. **Missing return_against Field**
   - Logs error
   - Skips commission adjustment
   - Credit Note operation continues

3. **Database Error**
   - Logs error with full traceback
   - Shows warning to user
   - Credit Note operation continues

## Validation

The module includes validation to ensure data integrity:

### validate_commission_adjustment()

Checks:
1. **Negative Result**: New commission should not be negative
2. **Credit Note Sign**: Credit Note commission should be negative or zero
3. **Calculation Accuracy**: Verifies the math is correct

Returns validation result with:
- `valid`: Boolean
- `message`: Error message if invalid
- `original_commission`: Original value
- `adjustment`: Adjustment amount
- `new_commission`: Calculated new value

## Testing

### Unit Tests

Run unit tests (requires frappe module):

```bash
cd /path/to/erpnext/bench
bench --site [your-site] run-tests --app erpnext --module erpnext_custom.tests.test_credit_note_commission
```

Or using Python unittest:

```bash
python -m unittest erpnext_custom.tests.test_credit_note_commission -v
```

### Test Coverage

- ✅ Commission calculation from single item
- ✅ Commission calculation from multiple items
- ✅ Zero commission handling
- ✅ Missing items handling
- ✅ Rounding to 2 decimals
- ✅ Valid adjustment validation
- ✅ Negative result validation
- ✅ Positive Credit Note commission validation
- ✅ Submit hook for regular invoice (skip)
- ✅ Submit hook for Credit Note (adjust)
- ✅ Submit hook with missing return_against
- ✅ Submit hook with original not found
- ✅ Cancel hook for regular invoice (skip)
- ✅ Cancel hook for Credit Note (reverse)
- ✅ Cancel hook with missing return_against
- ✅ Cancel hook exception handling
- ✅ Full workflow: submit then cancel

### Manual Testing

1. **Create and Submit Credit Note**
   ```
   1. Create Sales Invoice with commission
   2. Mark as Paid
   3. Create Credit Note from invoice
   4. Submit Credit Note
   5. Check original invoice: commission should be reduced
   6. Check comments on both documents
   ```

2. **Cancel Credit Note**
   ```
   1. Cancel the Credit Note from step 1
   2. Check original invoice: commission should be restored
   3. Check comments on both documents
   ```

3. **Multiple Credit Notes**
   ```
   1. Create Sales Invoice with commission = 100000
   2. Create Credit Note 1 with commission = -30000
   3. Submit CN1: original commission = 70000
   4. Create Credit Note 2 with commission = -20000
   5. Submit CN2: original commission = 50000
   6. Cancel CN1: original commission = 80000
   7. Cancel CN2: original commission = 100000 (fully restored)
   ```

## Integration with Commission System

The commission adjustment integrates with the existing Commission System:

1. **Commission Dashboard** shows adjusted commission values
2. **Paid Invoices Report** includes Credit Note adjustments column
3. **Commission Calculation** uses `custom_total_komisi_sales` which reflects adjustments
4. **Payment Processing** uses adjusted commission for payment calculations

## Audit Trail

Every commission adjustment creates audit trail:

### On Original Sales Invoice
- Comment: "Commission adjusted by Credit Note [name]: [old] - [adjustment] = [new]"
- Comment: "Commission reversal by Credit Note [name] cancellation: [old] + [adjustment] = [new]"

### On Credit Note
- Comment: "Commission adjustment applied to [original]: Reduced by [amount]"
- Comment: "Commission reversal applied to [original]: Added back [amount]"

### In ERPNext Logs
- Info log: Commission adjustment details
- Error log: Any failures with full traceback

## Troubleshooting

### Commission Not Adjusting

1. Check ERPNext error logs:
   ```bash
   bench --site [your-site] logs
   ```

2. Verify hooks are configured:
   ```python
   # In ERPNext console
   import frappe
   print(frappe.get_hooks("doc_events"))
   ```

3. Check if `custom_total_komisi_sales` field exists on Sales Invoice

4. Verify Credit Note has `is_return=1` and `return_against` set

### Commission Calculation Wrong

1. Check Credit Note items have `custom_komisi_sales` values
2. Verify values are negative in Credit Note
3. Check calculation in ERPNext logs
4. Use `validate_commission_adjustment()` to debug

### Hook Not Triggering

1. Restart ERPNext: `bench restart`
2. Clear cache: `bench --site [your-site] clear-cache`
3. Rebuild: `bench build`
4. Check Python import errors in logs

## Performance Considerations

- **Minimal Database Queries**: Only 2 queries per adjustment (get + save)
- **No Recursion**: Hooks check `is_return` to avoid infinite loops
- **Efficient Calculation**: Simple arithmetic, no complex queries
- **Async Safe**: Uses `ignore_permissions=True` for system updates

## Security

- **Permission Bypass**: Uses `ignore_permissions=True` for system updates
  - This is safe because the hook runs in system context
  - User permissions are checked before Credit Note submission
  
- **Validation**: Prevents negative commission results
  
- **Audit Trail**: All changes are logged and commented

## Future Enhancements

Potential improvements:
1. Add validation to prevent commission going negative
2. Add bulk commission recalculation utility
3. Add commission adjustment report
4. Add email notifications for large adjustments
5. Add commission adjustment approval workflow

## Support

For issues or questions:
1. Check ERPNext error logs
2. Review audit trail comments
3. Run unit tests to verify module integrity
4. Check this documentation for troubleshooting steps

## Version History

- **1.0.0** (2024): Initial implementation
  - Submit hook for commission adjustment
  - Cancel hook for commission reversal
  - Unit tests
  - Documentation

## License

Part of ERPNext custom implementation for Credit Note Management feature.
