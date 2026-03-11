# Comparison Queries: Next.js vs ERPNext UI Created Invoices

## Purpose

Compare ALL fields between:
- Invoice created from Next.js (shows "Not Saved")
- Invoice created from ERPNext UI (shows "Draft" correctly)

## Step 1: Create Test Invoices

### From Next.js
1. Create Sales Invoice from Delivery Note DN-2026-00025
2. Note the invoice name (e.g., ACC-SINV-2026-00024)

### From ERPNext UI
1. Create Sales Invoice from same Delivery Note DN-2026-00025
2. Note the invoice name (e.g., ACC-SINV-2026-00025)

## Step 2: Header Level Comparison

```sql
-- Compare ALL header fields
-- Replace invoice names with actual values
SELECT 
    'Next.js' as source,
    name,
    docstatus,
    status,
    custom_hpp_snapshot as header_hpp,
    custom_financial_cost_percent as header_fin_cost,
    custom_total_komisi_sales,
    taxes_and_charges,
    total_taxes_and_charges,
    grand_total,
    territory,
    customer_group,
    is_internal_customer,
    is_discounted,
    apply_discount_on,
    discount_amount,
    additional_discount_percentage,
    payment_terms_template,
    due_date,
    posting_date,
    debit_to,
    against_income_account,
    unrealized_profit_loss_account,
    update_stock,
    set_warehouse,
    selling_price_list,
    price_list_currency,
    plc_conversion_rate,
    currency,
    conversion_rate,
    owner,
    modified_by,
    creation,
    modified
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    name,
    docstatus,
    status,
    custom_hpp_snapshot,
    custom_financial_cost_percent,
    custom_total_komisi_sales,
    taxes_and_charges,
    total_taxes_and_charges,
    grand_total,
    territory,
    customer_group,
    is_internal_customer,
    is_discounted,
    apply_discount_on,
    discount_amount,
    additional_discount_percentage,
    payment_terms_template,
    due_date,
    posting_date,
    debit_to,
    against_income_account,
    unrealized_profit_loss_account,
    update_stock,
    set_warehouse,
    selling_price_list,
    price_list_currency,
    plc_conversion_rate,
    currency,
    conversion_rate,
    owner,
    modified_by,
    creation,
    modified
FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source;
```

## Step 3: Item Level Comparison

```sql
-- Compare item fields
SELECT 
    'Next.js' as source,
    parent,
    idx,
    item_code,
    qty,
    rate,
    amount,
    warehouse,
    delivery_note,
    dn_detail,
    sales_order,
    so_detail,
    incoming_rate,
    custom_komisi_sales,
    custom_hpp_snapshot,
    custom_financial_cost_percent,
    base_rate,
    base_amount,
    stock_uom,
    uom,
    conversion_factor,
    price_list_rate,
    base_price_list_rate,
    margin_type,
    margin_rate_or_amount,
    rate_with_margin,
    discount_percentage,
    discount_amount,
    base_rate_with_margin,
    net_rate,
    net_amount,
    base_net_rate,
    base_net_amount
FROM `tabSales Invoice Item`
WHERE parent = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    parent,
    idx,
    item_code,
    qty,
    rate,
    amount,
    warehouse,
    delivery_note,
    dn_detail,
    sales_order,
    so_detail,
    incoming_rate,
    custom_komisi_sales,
    custom_hpp_snapshot,
    custom_financial_cost_percent,
    base_rate,
    base_amount,
    stock_uom,
    uom,
    conversion_factor,
    price_list_rate,
    base_price_list_rate,
    margin_type,
    margin_rate_or_amount,
    rate_with_margin,
    discount_percentage,
    discount_amount,
    base_rate_with_margin,
    net_rate,
    net_amount,
    base_net_rate,
    base_net_amount
FROM `tabSales Invoice Item`
WHERE parent = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source, idx;
```

## Step 4: Check Tax Rows

```sql
-- Compare tax rows
SELECT 
    'Next.js' as source,
    parent,
    idx,
    charge_type,
    account_head,
    description,
    rate,
    tax_amount,
    total,
    base_tax_amount,
    base_total
FROM `tabSales Taxes and Charges`
WHERE parent = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    parent,
    idx,
    charge_type,
    account_head,
    description,
    rate,
    tax_amount,
    total,
    base_tax_amount,
    base_total
FROM `tabSales Taxes and Charges`
WHERE parent = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source, idx;
```

## Step 5: Check Sales Team

```sql
-- Compare sales team
SELECT 
    'Next.js' as source,
    parent,
    idx,
    sales_person,
    allocated_percentage,
    allocated_amount,
    commission_rate,
    incentives
FROM `tabSales Team`
WHERE parent = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    parent,
    idx,
    sales_person,
    allocated_percentage,
    allocated_amount,
    commission_rate,
    incentives
FROM `tabSales Team`
WHERE parent = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source, idx;
```

## Step 6: Check Payment Schedule

```sql
-- Compare payment schedule
SELECT 
    'Next.js' as source,
    parent,
    idx,
    due_date,
    payment_amount,
    invoice_portion,
    description,
    mode_of_payment,
    base_payment_amount
FROM `tabPayment Schedule`
WHERE parent = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    parent,
    idx,
    due_date,
    payment_amount,
    invoice_portion,
    description,
    mode_of_payment,
    base_payment_amount
FROM `tabPayment Schedule`
WHERE parent = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source, idx;
```

## Step 7: Simplified Comparison (Key Fields Only)

```sql
-- Quick comparison of critical fields
SELECT 
    'Next.js' as source,
    si.name,
    si.status,
    si.docstatus,
    si.custom_hpp_snapshot as header_hpp,
    si.territory,
    si.customer_group,
    si.debit_to,
    si.against_income_account,
    sii.custom_hpp_snapshot as item_hpp,
    sii.custom_financial_cost_percent as item_fin_cost,
    sii.custom_komisi_sales as item_komisi
FROM `tabSales Invoice` si
LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
WHERE si.name = 'ACC-SINV-2026-00024'  -- Next.js created

UNION ALL

SELECT 
    'ERPNext UI' as source,
    si.name,
    si.status,
    si.docstatus,
    si.custom_hpp_snapshot,
    si.territory,
    si.customer_group,
    si.debit_to,
    si.against_income_account,
    sii.custom_hpp_snapshot,
    sii.custom_financial_cost_percent,
    sii.custom_komisi_sales
FROM `tabSales Invoice` si
LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
WHERE si.name = 'ACC-SINV-2026-00025'  -- ERPNext UI created
ORDER BY source;
```

## Step 8: Check for NULL vs Empty String

```sql
-- Check if NULL vs empty string matters
SELECT 
    name,
    territory IS NULL as territory_null,
    territory = '' as territory_empty,
    customer_group IS NULL as customer_group_null,
    customer_group = '' as customer_group_empty,
    debit_to IS NULL as debit_to_null,
    debit_to = '' as debit_to_empty,
    against_income_account IS NULL as against_income_null,
    against_income_account = '' as against_income_empty
FROM `tabSales Invoice`
WHERE name IN ('ACC-SINV-2026-00024', 'ACC-SINV-2026-00025');
```

## Step 9: Full Dump for Manual Comparison

```sql
-- Get complete data for manual diff
SELECT * FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00024'\G

SELECT * FROM `tabSales Invoice`
WHERE name = 'ACC-SINV-2026-00025'\G
```

## Expected Findings

Based on investigation, we expect to find differences in:

1. **Header Level `custom_hpp_snapshot`**
   - Next.js: 0 or NULL
   - ERPNext UI: Some value (maybe sum of item HPP?)

2. **Territory**
   - Next.js: NULL or empty
   - ERPNext UI: Has value

3. **Customer Group**
   - Next.js: NULL or empty
   - ERPNext UI: Has value

4. **Debit To Account**
   - Next.js: NULL or empty
   - ERPNext UI: Has value (e.g., "1110.100 - Piutang Usaha - BAC")

5. **Against Income Account**
   - Next.js: NULL or empty
   - ERPNext UI: Has value (e.g., "4110.100 - Penjualan - BAC")

## How to Use

1. Create both invoices (Next.js and ERPNext UI)
2. Note the invoice names
3. Replace invoice names in queries above
4. Run queries in sequence
5. Document ALL differences found
6. Identify which fields cause "Not Saved" status

## Next Steps After Comparison

Once we identify ALL missing fields:
1. Update API route to populate those fields
2. Test invoice creation
3. Verify "Draft" status (not "Not Saved")
4. Verify Credit Note creation works
