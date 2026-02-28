# SQL Verification Queries

## Quick Reference for Testing Sales Invoice Creation

### 1. Find Latest Invoice

```sql
-- Get the most recent Sales Invoice
SELECT name, customer_name, posting_date, grand_total, status, creation
FROM `tabSales Invoice`
ORDER BY creation DESC
LIMIT 5;
```

### 2. Check Invoice Header (Tax & Totals)

```sql
-- Replace ACC-SINV-2026-XXXXX with actual invoice name
SELECT 
    name,
    customer_name,
    posting_date,
    due_date,
    taxes_and_charges,
    total,
    net_total,
    total_taxes_and_charges,
    grand_total,
    status,
    docstatus,
    territory,
    apply_discount_on,
    discount_amount,
    additional_discount_percentage,
    custom_total_komisi_sales
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX';
```

**Expected Values (if tax calculation works):**
- `taxes_and_charges`: "PPN 11% - BAC"
- `total`: 2,000,000
- `net_total`: 2,000,000 (after discount)
- `total_taxes_and_charges`: 220,000
- `grand_total`: 2,220,000
- `status`: "Draft"
- `docstatus`: 0

**Current Values (tax NOT calculated):**
- `taxes_and_charges`: null or empty
- `total`: 2,000,000
- `net_total`: 2,000,000
- `total_taxes_and_charges`: 0
- `grand_total`: 2,000,000
- `status`: "Draft"
- `docstatus`: 0

### 3. Check Tax Rows (Child Table)

```sql
-- Check if taxes child table is populated
SELECT 
    name,
    idx,
    charge_type,
    account_head,
    description,
    rate,
    tax_amount,
    total,
    parent
FROM `tabSales Taxes and Charges`
WHERE parent = 'ACC-SINV-2026-XXXXX'
ORDER BY idx;
```

**Expected Result (if tax calculation works):**
```
+----------------+-----+---------------+--------------------------------+-------------+------+------------+------------+
| name           | idx | charge_type   | account_head                   | description | rate | tax_amount | total      |
+----------------+-----+---------------+--------------------------------+-------------+------+------------+------------+
| abc123         | 1   | On Net Total  | 2111.100 - PPN Keluaran - BAC  | PPN 11%     | 11.0 | 220000.00  | 2220000.00 |
+----------------+-----+---------------+--------------------------------+-------------+------+------------+------------+
```

**Current Result (tax NOT calculated):**
```
Empty set (0.00 sec)
```

### 4. Check Invoice Items (HPP & Commission)

```sql
-- Check item details including custom fields
SELECT 
    name,
    idx,
    item_code,
    qty,
    rate,
    amount,
    warehouse,
    delivery_note,
    sales_order,
    incoming_rate,
    custom_komisi_sales,
    custom_hpp_snapshot,
    custom_financial_cost_percent
FROM `tabSales Invoice Item`
WHERE parent = 'ACC-SINV-2026-XXXXX'
ORDER BY idx;
```

**Expected Values:**
- `incoming_rate`: 148,000 (HPP from DN)
- `custom_komisi_sales`: 208,000 (calculated by Server Script)
- `custom_hpp_snapshot`: 148,000 (should be populated)
- `custom_financial_cost_percent`: 2.0 (should be populated)

**Current Values:**
- `incoming_rate`: 148,000 ✅
- `custom_komisi_sales`: 208,000 ✅
- `custom_hpp_snapshot`: 0 ❌
- `custom_financial_cost_percent`: 0 ❌

### 5. Check Payment Terms

```sql
-- Check if payment terms are applied
SELECT 
    name,
    payment_terms_template,
    posting_date,
    due_date
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX';

-- Check payment schedule
SELECT 
    name,
    idx,
    due_date,
    payment_amount,
    invoice_portion,
    description
FROM `tabPayment Schedule`
WHERE parent = 'ACC-SINV-2026-XXXXX'
ORDER BY idx;
```

**Expected Result:**
- `payment_terms_template`: Should have value (e.g., "Net 30")
- `due_date`: Should be calculated from posting_date + terms
- `payment_schedule`: Should have entries

### 6. Compare Next.js vs ERPNext UI Created Invoices

```sql
-- Get two invoices for comparison
-- Replace with actual invoice names
SELECT 
    'Next.js' as source,
    name,
    taxes_and_charges,
    total_taxes_and_charges,
    grand_total,
    due_date,
    territory,
    apply_discount_on
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    name,
    taxes_and_charges,
    total_taxes_and_charges,
    grand_total,
    due_date,
    territory,
    apply_discount_on
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source;
```

### 7. Check All Custom Fields

```sql
-- Check all custom fields in one query
SELECT 
    si.name,
    si.custom_total_komisi_sales as header_komisi,
    si.custom_notes_si,
    sii.item_code,
    sii.custom_komisi_sales as item_komisi,
    sii.custom_hpp_snapshot,
    sii.custom_financial_cost_percent,
    sii.incoming_rate
FROM `tabSales Invoice` si
LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
WHERE si.name = 'ACC-SINV-2026-XXXXX';
```

### 8. Check Tax Template Details

```sql
-- Check what's in the tax template
SELECT 
    name,
    title,
    company,
    disabled
FROM `tabSales Taxes and Charges Template`
WHERE name = 'PPN 11% - BAC';

-- Check tax template rows
SELECT 
    name,
    idx,
    charge_type,
    account_head,
    description,
    rate
FROM `tabSales Taxes and Charges`
WHERE parent = 'PPN 11% - BAC'
ORDER BY idx;
```

### 9. Full Invoice Dump (for debugging)

```sql
-- Get complete invoice data
SELECT * FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-XXXXX'\G
```

### 10. Check ERPNext Logs

```bash
# In terminal, check ERPNext logs
cd erpnext-dev
tail -f sites/*/logs/web.log | grep -i "sales invoice\|tax\|calculation"
```

## Quick Test Checklist

After creating invoice from Next.js:

- [ ] Run Query 1 to get invoice name
- [ ] Run Query 2 to check header fields
- [ ] Run Query 3 to check tax rows
- [ ] Run Query 4 to check item fields
- [ ] Run Query 5 to check payment terms
- [ ] Open invoice in ERPNext UI
- [ ] Check if status is "Draft" or "Not Saved"
- [ ] Try to create Credit Note

## Expected vs Actual Comparison Table

| Field | Expected (Working) | Actual (Current) | Status |
|-------|-------------------|------------------|--------|
| `taxes_and_charges` | "PPN 11% - BAC" | null | ❌ |
| `total_taxes_and_charges` | 220,000 | 0 | ❌ |
| `grand_total` | 2,220,000 | 2,000,000 | ❌ |
| `due_date` | 2026-02-28 | 2026-03-29 | ❌ |
| `custom_hpp_snapshot` | 148,000 | 0 | ❌ |
| `custom_financial_cost_percent` | 2.0 | 0 | ❌ |
| `custom_komisi_sales` | 208,000 | 208,000 | ✅ |
| `incoming_rate` | 148,000 | 148,000 | ✅ |
| Tax rows count | 1 | 0 | ❌ |
| UI Status | "Draft" | "Not Saved" | ❌ |

## How to Access MariaDB

```bash
# SSH to server
cd erpnext-dev

# Access MariaDB
bench --site [site_name] mariadb

# Or directly
mysql -u [user] -p [database_name]
```

## Tips

1. **Always get the latest invoice name first** (Query 1)
2. **Check header before items** (Query 2 before Query 4)
3. **Compare with UI-created invoice** (Query 6)
4. **Check logs if unexpected behavior** (Query 10)
5. **Use `\G` for vertical output** (easier to read)

## Example Session

```sql
-- Step 1: Find latest invoice
SELECT name FROM `tabSales Invoice` ORDER BY creation DESC LIMIT 1;
-- Result: ACC-SINV-2026-00026

-- Step 2: Check if taxes calculated
SELECT taxes_and_charges, total_taxes_and_charges, grand_total
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00026';
-- Result: null, 0, 2000000 (NOT WORKING)

-- Step 3: Check tax rows
SELECT COUNT(*) FROM `tabSales Taxes and Charges`
WHERE parent = 'ACC-SINV-2026-00026';
-- Result: 0 (NO TAX ROWS)

-- Conclusion: Tax calculation NOT triggered
```
