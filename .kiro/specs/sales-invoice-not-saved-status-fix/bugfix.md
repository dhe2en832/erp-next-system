# Bugfix Requirements Document

## Introduction

Sales Invoices created via the Next.js API display "Not Saved" status in the ERPNext UI, preventing users from creating Credit Notes. This occurs because the ERPNext client-side form cache is not updated after document creation via `frappe.client.insert`, even though the data is correctly saved to the database. Users must manually open the invoice in ERPNext UI and click "Save" to update the cache and enable Credit Note creation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a Sales Invoice is created via Next.js API using `frappe.client.insert` THEN the invoice displays "Not Saved" status in ERPNext UI despite being saved to the database

1.2 WHEN a user attempts to create a Credit Note for an invoice created via Next.js API THEN the Credit Note creation fails due to ERPNext considering the invoice as "Not Saved"

1.3 WHEN a user manually opens the "Not Saved" invoice in ERPNext UI and clicks "Save" without making changes THEN the status changes to "Draft" and Credit Note creation becomes possible

### Expected Behavior (Correct)

2.1 WHEN a Sales Invoice is created via Next.js API THEN the invoice SHALL display "Draft" status in ERPNext UI immediately after creation

2.2 WHEN a user attempts to create a Credit Note for an invoice created via Next.js API THEN the Credit Note creation SHALL succeed without requiring manual intervention

2.3 WHEN a Sales Invoice is created via Next.js API THEN the ERPNext client-side form cache SHALL be automatically updated to reflect the saved document state

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Sales Invoice is created directly in ERPNext UI THEN the system SHALL CONTINUE TO display "Draft" status correctly

3.2 WHEN a Sales Invoice is submitted via Next.js API THEN the system SHALL CONTINUE TO update the document status to "Submitted" correctly

3.3 WHEN Sales Invoice data is saved to the database via Next.js API THEN the system SHALL CONTINUE TO persist all fields correctly (custom_hpp_snapshot, custom_financial_cost_percent, custom_komisi_sales, debit_to, against_income_account, status, docstatus)

3.4 WHEN a user performs other CRUD operations on Sales Invoices via Next.js API THEN the system SHALL CONTINUE TO function correctly without affecting existing workflows
