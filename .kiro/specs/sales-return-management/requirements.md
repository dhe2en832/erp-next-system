# Requirements Document

## Introduction

The Sales Return Management feature enables users to process product returns from customers based on previously issued delivery notes. This feature integrates with the existing ERPNext-based ERP system to track returned items, update inventory levels, and maintain proper linkage between returns and their originating delivery notes. The system will provide a dedicated interface for creating, viewing, and managing sales return documents through the Next.js frontend application.

## Glossary

- **Sales_Return_System**: The module responsible for managing product returns from delivery notes
- **Delivery_Note**: An ERPNext document representing goods shipped to customers (Surat Jalan)
- **Return_Document**: A document that records items being returned by customers
- **Return_Item**: An individual line item within a Return_Document specifying product, quantity, and reason
- **Inventory_Manager**: The ERPNext subsystem responsible for updating stock levels
- **User**: A person with appropriate permissions to create and manage return documents
- **ERPNext_API**: The REST API interface to the ERPNext backend system

## Requirements

### Requirement 1: Create Sales Return from Delivery Note

**User Story:** As a User, I want to create a return document based on an existing delivery note, so that I can process customer product returns efficiently.

#### Acceptance Criteria

1. WHEN a User selects a valid Delivery_Note, THE Sales_Return_System SHALL retrieve all items from that Delivery_Note
2. THE Sales_Return_System SHALL display the Delivery_Note number, date, customer name, and all line items
3. THE Sales_Return_System SHALL allow the User to select which items to include in the Return_Document
4. FOR EACH selected item, THE Sales_Return_System SHALL allow the User to specify a return quantity not exceeding the originally delivered quantity
5. THE Sales_Return_System SHALL link the Return_Document to the originating Delivery_Note
6. WHEN the User saves the Return_Document, THE Sales_Return_System SHALL store it with status "Draft"

### Requirement 2: Return Quantity Validation

**User Story:** As a User, I want the system to prevent invalid return quantities, so that I cannot process returns exceeding what was delivered.

#### Acceptance Criteria

1. WHEN a User enters a return quantity for a Return_Item, THE Sales_Return_System SHALL validate that the quantity is greater than zero
2. THE Sales_Return_System SHALL validate that the return quantity does not exceed the delivered quantity from the Delivery_Note
3. IF a User attempts to save a Return_Document with invalid quantities, THEN THE Sales_Return_System SHALL display an error message and prevent saving
4. THE Sales_Return_System SHALL calculate and display the remaining returnable quantity for each item

### Requirement 3: Return Reason Tracking

**User Story:** As a User, I want to record why items are being returned, so that I can analyze return patterns and improve quality.

#### Acceptance Criteria

1. FOR EACH Return_Item, THE Sales_Return_System SHALL allow the User to select a return reason from a predefined list
2. THE Sales_Return_System SHALL support the following return reasons: "Damaged", "Wrong Item", "Quality Issue", "Customer Request", "Expired", "Other"
3. WHERE the return reason is "Other", THE Sales_Return_System SHALL require the User to provide additional text explanation
4. THE Sales_Return_System SHALL store the return reason with each Return_Item

### Requirement 4: Inventory Update on Return Submission

**User Story:** As a User, I want inventory to be updated automatically when I submit a return, so that stock levels remain accurate.

#### Acceptance Criteria

1. WHEN a User submits a Return_Document, THE Sales_Return_System SHALL send the return data to the ERPNext_API
2. THE ERPNext_API SHALL instruct the Inventory_Manager to increase stock quantities for all returned items
3. THE Inventory_Manager SHALL update stock levels in the warehouse specified in the original Delivery_Note
4. IF the inventory update fails, THEN THE Sales_Return_System SHALL display an error message and keep the Return_Document in "Draft" status
5. WHEN the inventory update succeeds, THE Sales_Return_System SHALL change the Return_Document status to "Submitted"

### Requirement 5: List and Search Returns

**User Story:** As a User, I want to view and search all return documents, so that I can track and manage returns efficiently.

#### Acceptance Criteria

1. THE Sales_Return_System SHALL display a list of all Return_Documents with pagination
2. THE Sales_Return_System SHALL display the following fields for each Return_Document: return number, date, customer name, delivery note reference, status, and total items
3. THE Sales_Return_System SHALL allow the User to filter returns by date range
4. THE Sales_Return_System SHALL allow the User to filter returns by customer name
5. THE Sales_Return_System SHALL allow the User to filter returns by status
6. THE Sales_Return_System SHALL allow the User to search returns by return number or delivery note number

### Requirement 6: View Return Details

**User Story:** As a User, I want to view complete details of a return document, so that I can review return information.

#### Acceptance Criteria

1. WHEN a User selects a Return_Document from the list, THE Sales_Return_System SHALL display all return details
2. THE Sales_Return_System SHALL display the linked Delivery_Note information including number and date
3. THE Sales_Return_System SHALL display customer information including name and contact details
4. THE Sales_Return_System SHALL display all Return_Items with product name, quantity returned, return reason, and unit price
5. THE Sales_Return_System SHALL display the total value of returned items
6. THE Sales_Return_System SHALL provide a link to view the original Delivery_Note

### Requirement 7: Cancel Return Document

**User Story:** As a User, I want to cancel a submitted return document, so that I can correct mistakes or handle exceptional cases.

#### Acceptance Criteria

1. WHEN a User cancels a submitted Return_Document, THE Sales_Return_System SHALL send a cancellation request to the ERPNext_API
2. THE ERPNext_API SHALL instruct the Inventory_Manager to reverse the inventory adjustments
3. THE Inventory_Manager SHALL decrease stock quantities for all items in the cancelled Return_Document
4. WHEN the inventory reversal succeeds, THE Sales_Return_System SHALL change the Return_Document status to "Cancelled"
5. IF the inventory reversal fails, THEN THE Sales_Return_System SHALL display an error message and maintain the current status

### Requirement 8: Return Document Numbering

**User Story:** As a User, I want return documents to have unique identifiers, so that I can reference them unambiguously.

#### Acceptance Criteria

1. WHEN a Return_Document is created, THE Sales_Return_System SHALL generate a unique return number
2. THE Sales_Return_System SHALL follow the naming pattern "RET-YYYY-NNNNN" where YYYY is the year and NNNNN is a sequential number
3. THE Sales_Return_System SHALL ensure no duplicate return numbers are generated
4. THE Sales_Return_System SHALL display the return number prominently on the return document

### Requirement 9: API Integration for Return Operations

**User Story:** As a developer, I want standardized API endpoints for return operations, so that the frontend can communicate reliably with ERPNext.

#### Acceptance Criteria

1. THE Sales_Return_System SHALL provide a GET endpoint at "/api/sales-return" to list all Return_Documents with pagination and filtering
2. THE Sales_Return_System SHALL provide a POST endpoint at "/api/sales-return" to create a new Return_Document
3. THE Sales_Return_System SHALL provide a GET endpoint at "/api/sales-return/[name]" to retrieve a specific Return_Document
4. THE Sales_Return_System SHALL provide a PUT endpoint at "/api/sales-return/[name]" to update a Return_Document in "Draft" status
5. THE Sales_Return_System SHALL provide a POST endpoint at "/api/sales-return/[name]/submit" to submit a Return_Document
6. THE Sales_Return_System SHALL provide a POST endpoint at "/api/sales-return/[name]/cancel" to cancel a submitted Return_Document
7. WHEN any API operation fails, THE Sales_Return_System SHALL return appropriate HTTP status codes and error messages

### Requirement 10: User Interface for Return Management

**User Story:** As a User, I want an intuitive interface for managing returns, so that I can process returns quickly and accurately.

#### Acceptance Criteria

1. THE Sales_Return_System SHALL provide a dedicated menu item labeled "Sales Returns" in the main navigation
2. THE Sales_Return_System SHALL provide a "Create Return" button on the returns list page
3. WHEN creating a return, THE Sales_Return_System SHALL provide a delivery note selector with search functionality
4. THE Sales_Return_System SHALL display a responsive form that works on desktop and mobile devices
5. THE Sales_Return_System SHALL provide visual feedback during save and submit operations using loading indicators
6. THE Sales_Return_System SHALL display success messages using toast notifications when operations complete
7. IF an operation fails, THEN THE Sales_Return_System SHALL display error messages using toast notifications or error dialogs
8. THE Sales_Return_System SHALL use the existing color palette: Indigo for primary actions, Green for success, Yellow for warnings, Red for errors
