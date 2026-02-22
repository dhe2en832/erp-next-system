# Sales Return Validation Scripts Setup Guide

This guide explains how to add validation scripts to the Sales Return DocType in ERPNext.

## Overview

The Sales Return DocType requires validation scripts to:
1. Validate return quantities against delivered quantities
2. Ensure return reasons are selected
3. Calculate line totals and grand total
4. Create stock entries on submit
5. Cancel stock entries on cancellation

## Prerequisites

- Sales Return and Sales Return Item DocTypes must be installed
- You must be logged in as Administrator or System Manager
- Access to ERPNext UI

## Method 1: Using Server Scripts (Recommended)

### Step 1: Create Validation Server Script

1. Navigate to: **Setup > Automation > Server Script**
2. Click **New**
3. Fill in the form:
   - **Name**: `Sales Return Validation`
   - **Script Type**: `DocType Event`
   - **Reference DocType**: `Sales Return`
   - **DocType Event**: `Before Save`
   - **Enabled**: ✓ (checked)

4. Copy and paste the validation code from `sales_return_validation.py` (the `validate` function)

5. Click **Save**

### Step 2: Create Submit Server Script

1. Navigate to: **Setup > Automation > Server Script**
2. Click **New**
3. Fill in the form:
   - **Name**: `Sales Return On Submit`
   - **Script Type**: `DocType Event`
   - **Reference DocType**: `Sales Return`
   - **DocType Event**: `On Submit`
   - **Enabled**: ✓ (checked)

4. Copy and paste the submit code from `sales_return_validation.py` (the `on_submit` function)

5. Click **Save**

### Step 3: Create Cancel Server Script

1. Navigate to: **Setup > Automation > Server Script**
2. Click **New**
3. Fill in the form:
   - **Name**: `Sales Return On Cancel`
   - **Script Type**: `DocType Event`
   - **Reference DocType**: `Sales Return`
   - **DocType Event**: `On Cancel`
   - **Enabled**: ✓ (checked)

4. Copy and paste the cancel code from `sales_return_validation.py` (the `on_cancel` function)

5. Click **Save**

## Method 2: Using Custom App (Advanced)

If you have a custom ERPNext app, you can add the validation scripts programmatically:

### Step 1: Create Python Module

Create a file in your custom app: `[app_name]/[app_name]/sales_return.py`

```python
# Copy the entire content of sales_return_validation.py here
```

### Step 2: Register Hooks

Add to your app's `hooks.py`:

```python
doc_events = {
    "Sales Return": {
        "validate": "your_app_name.sales_return.validate",
        "on_submit": "your_app_name.sales_return.on_submit",
        "on_cancel": "your_app_name.sales_return.on_cancel",
        "before_cancel": "your_app_name.sales_return.before_cancel"
    }
}
```

### Step 3: Restart Bench

```bash
bench restart
```

## Validation Script Details

### 1. Validate Function (Before Save)

**Purpose**: Validates data before saving the document

**Validations**:
- Delivery Note must be submitted
- At least one item must be present
- Return quantity must be > 0
- Return quantity must not exceed remaining returnable quantity
- Return reason must be selected for all items
- Notes required when reason is "Other"
- Calculates line totals (qty × rate)
- Calculates grand total (sum of line totals)

**Error Messages**:
- "Delivery Note {0} must be submitted before creating a return"
- "Please add at least one item to return"
- "Row {0}: Return quantity must be greater than 0"
- "Row {0}: Return quantity ({1}) exceeds remaining returnable quantity ({2})"
- "Row {0}: Please select a return reason"
- "Row {0}: Please provide additional notes for return reason 'Other'"

### 2. On Submit Function

**Purpose**: Creates stock entry to increase inventory

**Actions**:
1. Creates a new Stock Entry document
2. Sets type to "Material Receipt"
3. Adds all return items to the stock entry
4. Submits the stock entry
5. Links stock entry to sales return document

**Stock Entry Details**:
- **Stock Entry Type**: Material Receipt
- **Company**: From Sales Return
- **Posting Date**: From Sales Return
- **Items**: All items from Sales Return with target warehouse

**Error Handling**:
- If stock entry creation fails, throws error and prevents submission
- Error message: "Failed to create Stock Entry: {error}"

### 3. On Cancel Function

**Purpose**: Reverses inventory adjustments

**Actions**:
1. Retrieves linked stock entry
2. Cancels the stock entry
3. Shows success message

**Error Handling**:
- If stock entry cancellation fails, throws error
- Error message: "Failed to cancel Stock Entry: {error}"
- If no stock entry found, shows warning message

## Testing the Validation Scripts

### Test 1: Basic Validation

1. Create a new Sales Return
2. Try to save without selecting a delivery note
   - **Expected**: Error message about delivery note
3. Select a delivery note
4. Try to save without adding items
   - **Expected**: Error message about items
5. Add an item with quantity = 0
   - **Expected**: Error message about quantity > 0
6. Set quantity > delivered quantity
   - **Expected**: Error message about exceeding delivered quantity
7. Don't select a return reason
   - **Expected**: Error message about return reason
8. Select "Other" as reason without notes
   - **Expected**: Error message about notes required

### Test 2: Calculation Validation

1. Create a valid Sales Return with 2 items
2. Item 1: qty=5, rate=1000
3. Item 2: qty=3, rate=2000
4. Save the document
5. Check that:
   - Item 1 amount = 5,000
   - Item 2 amount = 6,000
   - Grand total = 11,000

### Test 3: Submit and Stock Entry

1. Create a valid Sales Return
2. Submit the document
3. Check that:
   - Status changes to "Submitted"
   - A Stock Entry is created
   - Stock Entry is submitted
   - Stock Entry reference is saved in Sales Return
4. Check inventory:
   - Stock quantities should increase for returned items

### Test 4: Cancellation

1. Take a submitted Sales Return
2. Cancel the document
3. Check that:
   - Status changes to "Cancelled"
   - Linked Stock Entry is cancelled
   - Stock quantities are reversed

### Test 5: Multiple Returns from Same Delivery Note

1. Create a Delivery Note with item qty=10
2. Create Sales Return 1 with qty=3
3. Submit Sales Return 1
4. Create Sales Return 2 with qty=5
5. Submit Sales Return 2
6. Try to create Sales Return 3 with qty=3
   - **Expected**: Error about exceeding remaining quantity (only 2 left)

## Troubleshooting

### Script Not Running

**Problem**: Validation script doesn't execute

**Solutions**:
1. Check that the script is enabled
2. Verify the DocType Event is correct
3. Clear cache: **Setup > Clear Cache**
4. Check error log: **Setup > Error Log**
5. Restart bench if using custom app

### Stock Entry Not Created

**Problem**: Stock Entry is not created on submit

**Solutions**:
1. Check that on_submit script is enabled
2. Verify warehouse is set for all items
3. Check item master exists and is a stock item
4. Check error log for detailed error message
5. Verify user has permission to create Stock Entry

### Calculation Errors

**Problem**: Totals are not calculated correctly

**Solutions**:
1. Check that validate script is running
2. Verify rate and qty are numeric values
3. Check for rounding issues (use precision=2)
4. Clear cache and retry

### Permission Errors

**Problem**: "You don't have permission" errors

**Solutions**:
1. Check user has Sales User or Sales Manager role
2. Verify permissions on Sales Return DocType
3. Check permissions on Stock Entry DocType
4. Ensure user has access to the warehouse

## Advanced Customizations

### Adding Email Notifications

Add to on_submit script:

```python
# Send email notification
frappe.sendmail(
    recipients=["sales@example.com"],
    subject=f"Sales Return {doc.name} Submitted",
    message=f"Sales Return {doc.name} for customer {doc.customer_name} has been submitted."
)
```

### Adding Workflow

1. Navigate to: **Setup > Workflow > Workflow**
2. Create new workflow for Sales Return
3. Define states: Draft → Pending Approval → Approved → Submitted
4. Define transitions and permissions

### Adding Custom Fields

If you need additional fields:

1. Navigate to: **Setup > Customize Form**
2. Select **Sales Return**
3. Add custom fields as needed
4. Update validation scripts to include new fields

## Maintenance

### Regular Checks

1. **Monthly**: Review error logs for validation failures
2. **Quarterly**: Verify stock entries are being created correctly
3. **Annually**: Review and update validation rules if needed

### Updating Scripts

When updating validation scripts:

1. Test changes in development environment first
2. Backup existing scripts before updating
3. Update one script at a time
4. Test thoroughly after each update
5. Monitor error logs after deployment

## Support

For issues or questions:
- Check ERPNext documentation: https://docs.erpnext.com
- Review error logs in ERPNext
- Contact your ERPNext administrator
- Refer to the main spec documentation

## Version History

- **v1.0** (2024-01-01) - Initial validation scripts
  - Basic quantity validation
  - Return reason validation
  - Stock entry creation on submit
  - Stock entry cancellation on cancel
