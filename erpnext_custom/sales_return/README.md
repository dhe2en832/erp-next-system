# Sales Return DocType Configuration

This directory contains the ERPNext DocType JSON configuration files for the Sales Return Management feature.

## Files

- `sales_return.json` - Main Sales Return DocType configuration
- `sales_return_item.json` - Child table for Sales Return items
- `README.md` - This file with installation instructions

## Quick Start

For a complete installation, follow these steps in order:

1. **Install DocTypes** (this guide)
2. **Setup Validation Scripts** (see `VALIDATION_SETUP.md`)
3. **Test the Installation** (see Testing section below)

## Installation Instructions

### Method 1: Import via ERPNext UI (Recommended)

1. **Login to ERPNext** as Administrator or System Manager

2. **Import Sales Return Item (Child Table First)**
   - Navigate to: **Setup > Customize > DocType**
   - Click **Menu (⋮)** > **Import**
   - Upload `sales_return_item.json`
   - Click **Import**
   - Verify the import was successful

3. **Import Sales Return (Parent DocType)**
   - Navigate to: **Setup > Customize > DocType**
   - Click **Menu (⋮)** > **Import**
   - Upload `sales_return.json`
   - Click **Import**
   - Verify the import was successful

4. **Verify Installation**
   - Navigate to: **Selling > Sales Return**
   - You should see the new DocType in the menu
   - Try creating a new Sales Return document to verify all fields are present

### Method 2: Import via Bench Command

If you have access to the ERPNext server via SSH:

```bash
# Navigate to your ERPNext bench directory
cd /path/to/frappe-bench

# Import the child table first
bench --site [your-site-name] import-doc sales_return_item.json

# Import the parent DocType
bench --site [your-site-name] import-doc sales_return.json

# Clear cache
bench --site [your-site-name] clear-cache

# Restart bench
bench restart
```

### Method 3: Using Python Installation Script

If you have access to the ERPNext bench console:

```bash
# Navigate to your ERPNext bench directory
cd /path/to/frappe-bench

# Start bench console
bench --site [your-site-name] console

# Run installation script
>>> from erpnext_custom.sales_return.install import install_sales_return
>>> install_sales_return()

# Verify installation
>>> from erpnext_custom.sales_return.install import verify_installation
>>> verify_installation()
```

The script will:
- Install Sales Return Item (child table)
- Install Sales Return (parent DocType)
- Add custom fields
- Verify the installation

### Method 4: Manual Creation via UI

If import doesn't work, you can manually create the DocTypes:

#### Create Sales Return Item (Child Table)

1. Navigate to: **Setup > Customize > DocType > New**
2. Set **Name**: `Sales Return Item`
3. Set **Module**: `Selling`
4. Check **Is Child Table**: ✓
5. Add fields as per the JSON configuration
6. Save

#### Create Sales Return (Parent DocType)

1. Navigate to: **Setup > Customize > DocType > New**
2. Set **Name**: `Sales Return`
3. Set **Module**: `Selling`
4. Set **Naming Rule**: `By "Naming Series" field`
5. Check **Is Submittable**: ✓
6. Add fields as per the JSON configuration
7. Set permissions for Sales User and Sales Manager roles
8. Save

## DocType Structure

### Sales Return (Parent)

| Field Name | Field Type | Label | Required | Notes |
|------------|-----------|-------|----------|-------|
| naming_series | Select | Series | Yes | Default: RET-.YYYY.- |
| customer | Link | Customer | Yes | Links to Customer DocType |
| customer_name | Data | Customer Name | No | Fetched from Customer |
| posting_date | Date | Posting Date | Yes | Default: Today |
| delivery_note | Link | Delivery Note | Yes | Links to Delivery Note |
| company | Link | Company | Yes | Links to Company |
| status | Select | Status | No | Draft/Submitted/Cancelled |
| items | Table | Items | Yes | Child table: Sales Return Item |
| grand_total | Currency | Grand Total | No | Calculated, read-only |
| custom_notes | Text | Notes | No | Additional notes |

### Sales Return Item (Child Table)

| Field Name | Field Type | Label | Required | Notes |
|------------|-----------|-------|----------|-------|
| item_code | Link | Item Code | Yes | Links to Item |
| item_name | Data | Item Name | No | Fetched from Item |
| qty | Float | Quantity | Yes | Return quantity |
| uom | Link | UOM | Yes | Unit of measure |
| rate | Currency | Rate | Yes | Unit price |
| amount | Currency | Amount | No | Calculated: qty × rate |
| warehouse | Link | Warehouse | Yes | Return warehouse |
| delivery_note_item | Data | Delivery Note Item | No | Reference to DN item |
| return_reason | Select | Return Reason | Yes | Damaged/Wrong Item/etc. |
| return_notes | Text | Return Notes | No | Additional notes |

## Naming Series

The Sales Return documents use the naming series: **RET-.YYYY.-**

Examples:
- RET-2024-00001
- RET-2024-00002
- RET-2025-00001

The year (YYYY) is automatically extracted from the posting date, and the sequence number resets each year.

## Permissions

### Sales User Role
- Create, Read, Write, Submit, Print, Email, Export, Share

### Sales Manager Role
- All Sales User permissions plus:
- Cancel, Amend, Delete

## Workflow States

The Sales Return DocType supports the following workflow states:

1. **Draft** - Initial state when created
2. **Submitted** - After submission (triggers inventory updates)
3. **Cancelled** - After cancellation (reverses inventory updates)

## Next Steps

After installing the DocTypes, you need to:

1. **Add Validation Scripts** (Task 14.2) - **REQUIRED**
   - See `VALIDATION_SETUP.md` for detailed instructions
   - Validates return quantities
   - Calculates totals
   - Creates stock entries on submit
   - Reverses stock entries on cancel

2. **Test the Installation**
   - Create a test Delivery Note
   - Create a test Sales Return
   - Verify validation works
   - Submit and check stock entry creation

3. **Configure Permissions** (Task 14.4)
   - Fine-tune role permissions if needed
   - Set up workflow if required

4. **Integrate with Frontend**
   - The Next.js frontend is already implemented
   - API routes are ready at `/api/sales/sales-return`
   - UI components are in `app/sales-return/`

## Testing the Installation

### Basic Test

1. **Create a Delivery Note**
   - Navigate to: **Stock > Delivery Note > New**
   - Add customer, items, and warehouse
   - Submit the delivery note

2. **Create a Sales Return**
   - Navigate to: **Selling > Sales Return > New**
   - Select the delivery note created above
   - Add items to return with quantities
   - Select return reasons
   - Save as Draft

3. **Verify Validation**
   - Try to enter invalid quantities (should show error)
   - Try to save without return reason (should show error)
   - Verify totals are calculated correctly

4. **Submit the Return**
   - Submit the sales return
   - Check that status changes to "Submitted"
   - Verify a Stock Entry is created
   - Check inventory levels increased

5. **Cancel the Return**
   - Cancel the submitted return
   - Check that status changes to "Cancelled"
   - Verify Stock Entry is cancelled
   - Check inventory levels reversed

### Advanced Testing

See `VALIDATION_SETUP.md` for comprehensive testing scenarios including:
- Multiple returns from same delivery note
- Edge cases and error handling
- Performance testing with large datasets

## Troubleshooting

### Import Fails

If the import fails:
- Check that you're logged in as Administrator
- Ensure the child table (Sales Return Item) is imported first
- Check the error log in ERPNext for details
- Try the manual creation method instead

### Fields Not Showing

If fields don't appear after import:
- Clear cache: **Setup > Clear Cache**
- Reload the page
- Check field permissions in Customize Form

### Naming Series Not Working

If the naming series doesn't generate correctly:
- Navigate to: **Setup > Settings > Naming Series**
- Find "Sales Return" in the list
- Set current value to 1 (or desired starting number)
- Save

## Support

For issues or questions:
- Check the main spec documentation: `erp-next-system/.kiro/specs/sales-return-management/`
- Review the design document for detailed specifications
- Contact the development team

## Version History

- **v1.0** (2024-01-01) - Initial DocType configuration
  - Basic Sales Return and Sales Return Item structure
  - Naming series: RET-.YYYY.-
  - Standard permissions for Sales User and Sales Manager
