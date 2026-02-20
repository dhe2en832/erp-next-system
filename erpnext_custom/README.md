# ERPNext Custom Modules - Discount and Tax Implementation

This directory contains Python backend modules for implementing discount and tax functionality in ERPNext.

## Overview

These modules provide:
- Discount calculation with percentage and amount support
- Tax calculation with multiple tax rows and charge types
- GL Entry posting for Sales and Purchase Invoices
- Invoice cancellation with reversal GL Entries
- ERPNext hooks for automatic GL Entry posting

## Modules

### 1. discount_calculator.py

Handles discount calculations with validation.

**Functions:**
- `calculate_discount(subtotal, discount_percentage, discount_amount)` - Calculate discount with priority rule (amount > percentage)
- `validate_discount_input(subtotal, discount_percentage, discount_amount)` - Validate discount input

**Features:**
- Supports both percentage (0-100%) and amount-based discounts
- Priority rule: discount_amount takes precedence over discount_percentage
- Comprehensive validation (range checks, subtotal validation)
- Returns discount_amount, discount_percentage, and net_total

**Example:**
```python
from erpnext_custom.discount_calculator import calculate_discount

result = calculate_discount(1000000, discount_percentage=10)
# Returns: {'discount_amount': 100000.0, 'discount_percentage': 10.0, 'net_total': 900000.0}
```

### 2. tax_calculator.py

Handles tax calculations with support for multiple tax rows.

**Functions:**
- `calculate_taxes(net_total, tax_template, tax_type)` - Calculate taxes based on template
- `validate_tax_template(tax_template)` - Validate tax template structure
- `calculate_tax_for_single_row(base_amount, rate, charge_type, add_deduct)` - Calculate single tax row

**Features:**
- Supports multiple tax rows with different charge types:
  - "On Net Total" - Calculate tax on net total after discount
  - "On Previous Row Total" - Calculate tax on running total (tax on tax)
  - "Actual" - Fixed tax amount
- Supports Add/Deduct options (e.g., PPN adds, PPh 23 deducts)
- Running total calculation for sequential tax application
- Comprehensive validation

**Example:**
```python
from erpnext_custom.tax_calculator import calculate_taxes

tax_template = {
    "taxes": [{
        "charge_type": "On Net Total",
        "account_head": "2210 - Hutang PPN",
        "description": "PPN 11%",
        "rate": 11
    }]
}

result = calculate_taxes(900000, tax_template)
# Returns: {'taxes': [...], 'total_taxes': 99000.0, 'grand_total': 999000.0}
```

### 3. gl_entry_sales.py

Handles GL Entry posting for Sales Invoices.

**Functions:**
- `post_sales_invoice_gl_entry(invoice, posting_date)` - Post GL Entry for Sales Invoice
- `validate_sales_invoice_for_gl_posting(invoice)` - Validate invoice before posting

**GL Entry Structure:**
```
Debit:  1210 - Piutang Usaha (grand_total)
Debit:  4300 - Potongan Penjualan (discount_amount) - if discount exists
Credit: 4100 - Pendapatan Penjualan (total before discount)
Credit: 2210 - Hutang PPN (tax_amount) - for each tax row
```

**Features:**
- Balanced entry validation (total debit = total credit)
- Audit trail in remarks
- Support for multiple taxes
- Handles both Add and Deduct taxes

### 4. gl_entry_purchase.py

Handles GL Entry posting for Purchase Invoices.

**Functions:**
- `post_purchase_invoice_gl_entry(invoice, posting_date)` - Post GL Entry for Purchase Invoice
- `validate_purchase_invoice_for_gl_posting(invoice)` - Validate invoice before posting
- `get_stock_valuation_rate(invoice)` - Calculate stock valuation rate after discount

**GL Entry Structure:**
```
Debit:  1310 - Persediaan (net_total after discount)
Debit:  1410 - Pajak Dibayar Dimuka (PPN Input) - for each tax row
Credit: 2110 - Hutang Usaha (grand_total)
```

**Features:**
- Discount reflected in inventory valuation (net_total)
- Balanced entry validation
- Support for PPN Input (can be credited)
- Stock valuation calculation

### 5. invoice_cancellation.py

Handles invoice cancellation with reversal GL Entries.

**Functions:**
- `create_reversal_gl_entry(original_gl_entries, cancellation_date)` - Create reversal entries
- `verify_cancellation_net_effect(original_gl_entries, reversal_gl_entries)` - Verify net effect is zero
- `cancel_invoice_with_gl_reversal(invoice_name, invoice_type, original_gl_entries, cancellation_date)` - Complete cancellation workflow

**Features:**
- Swap debit and credit for reversal
- Net effect verification (original + reversal = 0)
- Audit trail with "Reversal:" prefix in remarks
- Complete cancellation workflow

### 6. hooks.py

ERPNext hooks configuration for automatic GL Entry posting.

**Hooks:**
- `on_sales_invoice_submit` - Post GL Entry when Sales Invoice is submitted
- `on_sales_invoice_cancel` - Create reversal GL Entry when Sales Invoice is cancelled
- `on_purchase_invoice_submit` - Post GL Entry when Purchase Invoice is submitted
- `on_purchase_invoice_cancel` - Create reversal GL Entry when Purchase Invoice is cancelled

**Integration:**
Add to your ERPNext custom app's hooks.py:
```python
doc_events = {
    "Sales Invoice": {
        "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
    },
    "Purchase Invoice": {
        "on_submit": "erpnext_custom.hooks.on_purchase_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_purchase_invoice_cancel"
    }
}
```

## Testing

### Unit Tests

Run unit tests:
```bash
python -m unittest erpnext_custom.tests.test_discount_calculator -v
python -m unittest erpnext_custom.tests.test_tax_calculator -v
```

**Test Coverage:**
- Discount calculation: 22 tests
- Tax calculation: 26 tests
- Total: 48 unit tests

**Test Categories:**
- Valid input scenarios
- Edge cases (0%, 100%, zero amounts)
- Validation errors (negative values, out of range)
- Rounding and precision
- Priority rules
- Multiple tax rows

### Property-Based Tests

Property-based tests (subtasks 6.11-6.13) require Hypothesis library:
```bash
pip install hypothesis
```

**Properties to Test:**
1. GL Entry Balanced (Property 1) - Total debit = total credit for all invoices
2. Grand Total Calculation (Property 2) - grand_total = subtotal - discount + taxes
3. Invoice Cancellation Reversal (Property 11) - original + reversal = 0 for each account

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 5.1, 5.2, 5.4**: Discount validation and calculation
- **Requirement 4.5, 8.1, 9.1, 10.1, 10.2**: Tax calculation
- **Requirement 6.1, 6.2, 6.3, 6.5**: GL Entry posting for Sales Invoice with discount
- **Requirement 8.1, 8.2, 8.3**: GL Entry posting for Sales Invoice with tax
- **Requirement 7.1, 7.2, 7.3, 7.5**: GL Entry posting for Purchase Invoice with discount
- **Requirement 9.1, 9.2, 9.3**: GL Entry posting for Purchase Invoice with tax
- **Requirement 10.2, 10.3**: GL Entry posting for PPh 23
- **Requirement 6.4, 7.4, 8.4, 9.4, 10.5**: Invoice cancellation with reversal
- **Requirement 6.6, 7.6, 8.6, 9.6**: ERPNext hooks for auto-posting
- **Requirement 15.1, 15.2**: Unit tests for discount and tax calculation

## Installation

1. Copy the `erpnext_custom` directory to your ERPNext custom app
2. Add hooks configuration to your app's hooks.py
3. Run tests to verify installation
4. Restart ERPNext services

## Usage Example

### Complete Sales Invoice Flow

```python
from erpnext_custom.discount_calculator import calculate_discount
from erpnext_custom.tax_calculator import calculate_taxes
from erpnext_custom.gl_entry_sales import post_sales_invoice_gl_entry

# 1. Calculate discount
discount_result = calculate_discount(1000000, discount_percentage=10)
# discount_amount: 100000, net_total: 900000

# 2. Calculate taxes
tax_template = {
    "taxes": [{
        "charge_type": "On Net Total",
        "account_head": "2210 - Hutang PPN",
        "description": "PPN 11%",
        "rate": 11
    }]
}
tax_result = calculate_taxes(discount_result["net_total"], tax_template)
# total_taxes: 99000, grand_total: 999000

# 3. Post GL Entry
invoice = {
    "name": "SI-2024-00001",
    "customer": "CUST-001",
    "total": 1000000,
    "discount_amount": discount_result["discount_amount"],
    "discount_percentage": 10,
    "net_total": discount_result["net_total"],
    "taxes": tax_result["taxes"],
    "grand_total": tax_result["grand_total"]
}
gl_result = post_sales_invoice_gl_entry(invoice, "2024-01-15")
# is_balanced: True, total_debit: 1099000, total_credit: 1099000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│                  (API Layer - TypeScript)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ERPNext Backend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  erpnext_custom (Python Modules)                     │   │
│  │  - discount_calculator.py                            │   │
│  │  - tax_calculator.py                                 │   │
│  │  - gl_entry_sales.py                                 │   │
│  │  - gl_entry_purchase.py                              │   │
│  │  - invoice_cancellation.py                           │   │
│  │  - hooks.py                                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ERPNext DocTypes                                    │   │
│  │  - Sales Invoice                                     │   │
│  │  - Purchase Invoice                                  │   │
│  │  - GL Entry                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (MariaDB)                        │
│  - tabSales Invoice                                          │
│  - tabPurchase Invoice                                       │
│  - tabGL Entry                                               │
│  - tabAccount (COA)                                          │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- All calculations round to 2 decimal places
- Discount priority: amount > percentage
- GL Entries must be balanced (tolerance: 0.01)
- Audit trail maintained in GL Entry remarks
- Supports Indonesian tax system (PPN, PPh 23, PPh 22)

## License

Part of ERPNext custom implementation for discount and tax features.

## Version

1.0.0 - Initial implementation
