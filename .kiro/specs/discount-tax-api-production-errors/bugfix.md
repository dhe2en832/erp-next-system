# Bugfix Requirements Document

## Introduction

After deploying the discount and tax feature (Task 17 completed), three critical production errors have emerged that prevent users from viewing invoice lists, selecting tax templates, and building the Purchase Invoice form. These errors affect core functionality and must be resolved to restore system operations.

The errors are:
1. ERPNext API rejecting discount fields in GET requests with "Field not permitted in query" error
2. Tax template API returning 400 error due to missing company parameter validation
3. Purchase Invoice form failing to build due to incorrect component import paths

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN GET request is made to /api/sales/invoices with discount_amount and discount_percentage in the fields parameter THEN ERPNext returns "Field not permitted in query: discount_percentage" error and the request fails

1.2 WHEN GET request is made to /api/purchase/invoices with discount_amount and discount_percentage in the fields parameter THEN ERPNext returns "Field not permitted in query: discount_percentage" error and the request fails

1.3 WHEN GET request is made to /api/setup/tax-templates without company parameter from the frontend THEN the API returns 400 Bad Request with "Missing required company parameter" error

1.4 WHEN the Purchase Invoice form (piMain/component.tsx) attempts to import DiscountInput, TaxTemplateSelect, and InvoiceSummary components using relative path "../../components/invoice/" THEN the build process fails with "Module not found" error

### Expected Behavior (Correct)

2.1 WHEN GET request is made to /api/sales/invoices THEN the system SHALL successfully return invoice data including discount and tax fields without ERPNext permission errors

2.2 WHEN GET request is made to /api/purchase/invoices THEN the system SHALL successfully return invoice data including discount and tax fields without ERPNext permission errors

2.3 WHEN GET request is made to /api/setup/tax-templates from the frontend THEN the system SHALL accept the request with company parameter and return active tax templates for the specified company

2.4 WHEN the Purchase Invoice form (piMain/component.tsx) builds THEN the system SHALL successfully import DiscountInput, TaxTemplateSelect, and InvoiceSummary components and complete the build process

### Unchanged Behavior (Regression Prevention)

3.1 WHEN GET requests are made to /api/sales/invoices and /api/purchase/invoices for invoices without discount fields THEN the system SHALL CONTINUE TO return invoice data with default values (0) for discount_amount and discount_percentage

3.2 WHEN POST requests are made to create new sales or purchase invoices with discount and tax fields THEN the system SHALL CONTINUE TO validate and create invoices successfully

3.3 WHEN tax template API is called with valid type and company parameters THEN the system SHALL CONTINUE TO return filtered active tax templates for the specified company

3.4 WHEN other components import from the components directory THEN the system SHALL CONTINUE TO resolve imports correctly without build errors

3.5 WHEN users view invoice lists after the fix THEN the system SHALL CONTINUE TO display all invoice fields including totals, status, and dates correctly

3.6 WHEN users interact with discount and tax input fields in invoice forms THEN the system SHALL CONTINUE TO calculate totals correctly and submit data to ERPNext
