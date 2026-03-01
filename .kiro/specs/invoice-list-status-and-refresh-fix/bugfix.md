# Bugfix Requirements Document

## Introduction

The Sales Invoice List component (siList/component.tsx) has two related issues affecting data visibility and freshness:

1. **Missing Status Display**: Status badges are displayed in mobile card view but completely absent from the desktop table view, making it difficult for users to quickly identify invoice states (Draft, Paid, Unpaid, etc.) on larger screens.

2. **Stale Data After Operations**: After performing operations like submitting an invoice or making payments, the list may not reflect the latest state from ERPNext, causing confusion about the actual status of invoices.

These issues impact user experience by hiding critical status information on desktop and potentially showing outdated data after state-changing operations.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN viewing the invoice list on desktop (non-mobile view) THEN the system does not display the status badge in the table rows, even though the status data is available and the badge rendering functions (getStatusLabel, getStatusBadgeClass) are defined

1.2 WHEN a user submits an invoice using the "Ajukan" button THEN the system calls fetchInvoices(true) but may not always reflect the updated status immediately due to timing issues or caching

1.3 WHEN the list is displayed after navigation or page refresh THEN the system may show cached or stale data instead of fetching the latest state from ERPNext

### Expected Behavior (Correct)

2.1 WHEN viewing the invoice list on desktop (non-mobile view) THEN the system SHALL display the status badge in a dedicated column in the table, using the same STATUS_LABELS and STATUS_COLORS mappings as the mobile view

2.2 WHEN a user submits an invoice or performs any state-changing operation THEN the system SHALL immediately refresh the list data from ERPNext to reflect the updated status

2.3 WHEN the list is displayed after navigation or page refresh THEN the system SHALL fetch fresh data from ERPNext with proper cache-busting mechanisms to ensure the latest state is shown

### Unchanged Behavior (Regression Prevention)

3.1 WHEN viewing the invoice list on mobile devices THEN the system SHALL CONTINUE TO display the status badge in the card layout exactly as it currently does

3.2 WHEN the status badge is displayed (mobile or desktop) THEN the system SHALL CONTINUE TO use the existing STATUS_LABELS mapping for Indonesian translations and STATUS_COLORS for visual styling

3.3 WHEN users interact with other list features (pagination, filtering, sorting, infinite scroll) THEN the system SHALL CONTINUE TO function exactly as before without any behavioral changes

3.4 WHEN the desktop table displays other columns (document number, customer, dates, amounts, payment progress, actions) THEN the system SHALL CONTINUE TO render them in their current positions and formats

3.5 WHEN users click on invoice rows to navigate to detail view THEN the system SHALL CONTINUE TO navigate correctly without interference from the new status column
