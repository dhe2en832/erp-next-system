# Bugfix Requirements Document

## Introduction

The ERP Next.js application deployed on VPS is experiencing runtime errors in PM2 logs due to field permission restrictions and doctype access issues on the ERPNext backend at `https://bac.batasku.cloud`. These errors occur during accounting period validation checks and prevent proper system operation in production.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the system attempts to validate bank reconciliation using `clearance_date` field in GL Entry queries THEN the system throws "Field not permitted in query: clearance_date" DataError and fails validation

1.2 WHEN the system attempts to validate payroll entries by querying Salary Slip doctype THEN the system throws "Failed to fetch Salary Slip list" error and fails validation

1.3 WHEN these validation errors occur THEN the errors are logged in PM2 logs causing runtime instability and potential system reliability issues

### Expected Behavior (Correct)

2.1 WHEN the system attempts to validate bank reconciliation and `clearance_date` field is restricted THEN the system SHALL gracefully skip the bank reconciliation check or use alternative validation methods without throwing errors

2.2 WHEN the system attempts to validate payroll entries and Salary Slip doctype access is restricted THEN the system SHALL gracefully skip the payroll validation check without throwing errors

2.3 WHEN field permission or doctype access restrictions are encountered THEN the system SHALL log informational messages and continue operation without runtime errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN field permissions and doctype access are available THEN the system SHALL CONTINUE TO perform full validation checks as designed

3.2 WHEN other validation functions (draft transactions, sales invoices, purchase invoices, inventory transactions) are called THEN the system SHALL CONTINUE TO work normally without any changes

3.3 WHEN the accounting period validation API is called with proper permissions THEN the system SHALL CONTINUE TO return complete validation results as expected