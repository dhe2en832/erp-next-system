# Bugfix Requirements Document

## Introduction

This document specifies the requirements for fixing a bug in the Sales Invoice creation flow where the payment due date is incorrectly calculated when using payment terms templates. Currently, when creating a Sales Invoice with a NET 30 payment terms template, the due date is set to the same date as the invoice date instead of being calculated as invoice_date + 30 days. This affects the accounts receivable tracking and payment collection workflow.

The bug occurs in the Sales Invoice creation component (`app/invoice/siMain/component.tsx`) when a delivery note is selected and the due date is calculated based on the payment terms template from the associated sales order.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a Sales Invoice is created from a Delivery Note with payment terms template "NET 30" and invoice date is 28-02-2026 THEN the system sets the due date to 28-02-2026 (same as invoice date)

1.2 WHEN the calculateDueDate function is called with a posting date and sales order name THEN the system returns a due date that equals the posting date instead of posting date + credit_days

1.3 WHEN payment terms template specifies credit_days of 30 THEN the system fails to add 30 days to the invoice date when calculating the due date

### Expected Behavior (Correct)

2.1 WHEN a Sales Invoice is created from a Delivery Note with payment terms template "NET 30" and invoice date is 28-02-2026 THEN the system SHALL set the due date to 29-03-2026 (30 days after invoice date)

2.2 WHEN the calculateDueDate function is called with a posting date and sales order name THEN the system SHALL return a due date that equals posting date + credit_days from the payment terms template

2.3 WHEN payment terms template specifies credit_days of 30 THEN the system SHALL correctly add 30 days to the invoice date when calculating the due date

2.4 WHEN the payment terms template cannot be fetched or credit_days is not specified THEN the system SHALL default to adding 30 days to the invoice date

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Sales Invoice is created without a payment terms template THEN the system SHALL CONTINUE TO use the default 30-day calculation for due date

3.2 WHEN a Sales Invoice is created manually (not from a Delivery Note) THEN the system SHALL CONTINUE TO allow manual due date entry

3.3 WHEN the due date is manually edited by the user THEN the system SHALL CONTINUE TO accept and save the user-specified due date

3.4 WHEN a Sales Invoice is edited in view/edit mode THEN the system SHALL CONTINUE TO display the existing due date correctly

3.5 WHEN the posting date is changed THEN the system SHALL CONTINUE TO maintain the existing due date unless explicitly recalculated
