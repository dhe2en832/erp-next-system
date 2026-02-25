# Bugfix Requirements Document

## Introduction

This document addresses two distinct bugs in the ERP system:

1. **Journal Entry Totals Showing Zero**: The Kas Masuk (Cash In) and Kas Keluar (Cash Out) list pages display journal entries with total_debit and total_credit values incorrectly showing 0, despite the API route fetching account details and calculating totals from the accounts child table.

2. **Item Field Not Refilling in Edit Mode**: The `custom_financial_cost_percent` field in the Item form does not populate with existing values when editing an item, even though the field is included in the API response and formData state.

These bugs affect data visibility and user experience in financial and inventory management workflows.

## Bug Analysis

### Bug 1: Journal Entry Totals Showing Zero

#### Current Behavior (Defect)

1.1 WHEN the Kas Masuk list page fetches journal entries THEN the system displays total_debit as 0 for all entries

1.2 WHEN the Kas Keluar list page fetches journal entries THEN the system displays total_credit as 0 for all entries

1.3 WHEN the API route `/api/finance/journal/route.ts` fetches journal entry details and calculates totals from the accounts child table THEN the calculated totals (total_debit and total_credit) are not properly returned in the API response

#### Expected Behavior (Correct)

2.1 WHEN the Kas Masuk list page fetches journal entries THEN the system SHALL display the sum of all debit amounts (debit_in_account_currency or debit) from the accounts child table for each entry

2.2 WHEN the Kas Keluar list page fetches journal entries THEN the system SHALL display the sum of all credit amounts (credit_in_account_currency or credit) from the accounts child table for each entry

2.3 WHEN the API route calculates totals from the accounts child table THEN the system SHALL correctly return total_debit and total_credit values in the enrichedData response

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN journal entries are filtered by company, date range, voucher_type, or status THEN the system SHALL CONTINUE TO apply these filters correctly

3.2 WHEN journal entries are fetched with pagination parameters THEN the system SHALL CONTINUE TO respect limit_page_length and start parameters

3.3 WHEN journal entries are displayed with other fields (name, voucher_type, posting_date, user_remark, status) THEN the system SHALL CONTINUE TO display these fields correctly

### Bug 2: Item Field Not Refilling in Edit Mode

#### Current Behavior (Defect)

1.4 WHEN a user clicks an item from the list to edit THEN the system opens the form but the `custom_financial_cost_percent` field remains at its default value of 0

1.5 WHEN the API route `/api/inventory/items/[item_code]/route.ts` returns item details including `custom_financial_cost_percent` THEN the field value is not populated in the form despite being in the API response

#### Expected Behavior (Correct)

2.4 WHEN a user clicks an item from the list to edit THEN the system SHALL populate the `custom_financial_cost_percent` field with the value from ERPNext

2.5 WHEN the API returns item details with a `custom_financial_cost_percent` value THEN the system SHALL display this value in the form input field (e.g., 5.50 for 5.5%)

#### Unchanged Behavior (Regression Prevention)

3.4 WHEN editing an existing item THEN the system SHALL CONTINUE TO populate all other fields (item_code, item_name, description, item_group, stock_uom, opening_stock, valuation_rate, standard_rate, last_purchase_rate, brand) correctly

3.5 WHEN creating a new item THEN the system SHALL CONTINUE TO initialize `custom_financial_cost_percent` to 0 as the default value

3.6 WHEN the user manually enters a value in the `custom_financial_cost_percent` field THEN the system SHALL CONTINUE TO accept and save the value correctly
