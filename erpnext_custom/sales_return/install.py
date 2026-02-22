"""
Sales Return DocType Installation Script

This script helps install the Sales Return DocType and its validation scripts
into ERPNext. Run this from the ERPNext bench console or as a script.

Usage:
    bench --site [site-name] console
    >>> from erpnext_custom.sales_return.install import install_sales_return
    >>> install_sales_return()
"""

import frappe
import json
import os
from frappe import _

def install_sales_return():
    """
    Install Sales Return DocType and validation scripts
    """
    
    print("=" * 60)
    print("Sales Return DocType Installation")
    print("=" * 60)
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Step 1: Install Sales Return Item (Child Table)
    print("\n[1/4] Installing Sales Return Item (Child Table)...")
    try:
        install_doctype_from_json(
            os.path.join(script_dir, "sales_return_item.json"),
            "Sales Return Item"
        )
        print("✓ Sales Return Item installed successfully")
    except Exception as e:
        print(f"✗ Error installing Sales Return Item: {str(e)}")
        return False
    
    # Step 2: Install Sales Return (Parent DocType)
    print("\n[2/4] Installing Sales Return (Parent DocType)...")
    try:
        install_doctype_from_json(
            os.path.join(script_dir, "sales_return.json"),
            "Sales Return"
        )
        print("✓ Sales Return installed successfully")
    except Exception as e:
        print(f"✗ Error installing Sales Return: {str(e)}")
        return False
    
    # Step 3: Add custom field for stock_entry reference
    print("\n[3/4] Adding custom fields...")
    try:
        add_custom_fields()
        print("✓ Custom fields added successfully")
    except Exception as e:
        print(f"✗ Error adding custom fields: {str(e)}")
        # Continue anyway, this is not critical
    
    # Step 4: Setup validation scripts
    print("\n[4/4] Setting up validation scripts...")
    print("Note: Validation scripts need to be added manually via ERPNext UI")
    print("      See README.md for instructions")
    
    # Clear cache
    print("\nClearing cache...")
    frappe.clear_cache()
    
    print("\n" + "=" * 60)
    print("Installation Complete!")
    print("=" * 60)
    print("\nNext Steps:")
    print("1. Add validation scripts via Setup > Customize Form > Sales Return")
    print("2. Test creating a Sales Return document")
    print("3. Verify stock entries are created on submit")
    print("\nSee README.md for detailed instructions")
    
    return True


def install_doctype_from_json(json_path, doctype_name):
    """
    Install a DocType from JSON file
    """
    
    # Check if file exists
    if not os.path.exists(json_path):
        raise Exception(f"JSON file not found: {json_path}")
    
    # Read JSON file
    with open(json_path, 'r') as f:
        doctype_dict = json.load(f)
    
    # Check if DocType already exists
    if frappe.db.exists("DocType", doctype_name):
        print(f"  DocType '{doctype_name}' already exists. Updating...")
        doc = frappe.get_doc("DocType", doctype_name)
        doc.update(doctype_dict)
    else:
        print(f"  Creating new DocType '{doctype_name}'...")
        doc = frappe.get_doc(doctype_dict)
    
    # Save the DocType
    doc.save(ignore_permissions=True)
    frappe.db.commit()


def add_custom_fields():
    """
    Add custom fields to Sales Return DocType
    """
    
    # Add stock_entry field to track linked stock entry
    if not frappe.db.exists("Custom Field", "Sales Return-stock_entry"):
        custom_field = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Return",
            "fieldname": "stock_entry",
            "label": "Stock Entry",
            "fieldtype": "Link",
            "options": "Stock Entry",
            "read_only": 1,
            "insert_after": "grand_total",
            "no_copy": 1
        })
        custom_field.insert(ignore_permissions=True)
        frappe.db.commit()
        print("  Added 'stock_entry' field")


def uninstall_sales_return():
    """
    Uninstall Sales Return DocType (use with caution!)
    This will delete all Sales Return documents and the DocType itself
    """
    
    print("=" * 60)
    print("WARNING: Sales Return DocType Uninstallation")
    print("=" * 60)
    print("\nThis will DELETE:")
    print("- All Sales Return documents")
    print("- Sales Return DocType")
    print("- Sales Return Item DocType")
    print("- Custom fields")
    
    confirm = input("\nType 'DELETE' to confirm uninstallation: ")
    
    if confirm != "DELETE":
        print("Uninstallation cancelled")
        return False
    
    try:
        # Delete all Sales Return documents
        print("\nDeleting Sales Return documents...")
        frappe.db.sql("DELETE FROM `tabSales Return` WHERE 1=1")
        frappe.db.sql("DELETE FROM `tabSales Return Item` WHERE 1=1")
        frappe.db.commit()
        
        # Delete custom fields
        print("Deleting custom fields...")
        if frappe.db.exists("Custom Field", "Sales Return-stock_entry"):
            frappe.delete_doc("Custom Field", "Sales Return-stock_entry", force=1)
        
        # Delete DocTypes
        print("Deleting DocTypes...")
        if frappe.db.exists("DocType", "Sales Return"):
            frappe.delete_doc("DocType", "Sales Return", force=1)
        if frappe.db.exists("DocType", "Sales Return Item"):
            frappe.delete_doc("DocType", "Sales Return Item", force=1)
        
        frappe.db.commit()
        frappe.clear_cache()
        
        print("\n✓ Uninstallation complete")
        return True
        
    except Exception as e:
        print(f"\n✗ Error during uninstallation: {str(e)}")
        frappe.db.rollback()
        return False


def verify_installation():
    """
    Verify that Sales Return DocType is installed correctly
    """
    
    print("=" * 60)
    print("Sales Return Installation Verification")
    print("=" * 60)
    
    checks = []
    
    # Check 1: Sales Return Item DocType exists
    print("\n[1/5] Checking Sales Return Item DocType...")
    if frappe.db.exists("DocType", "Sales Return Item"):
        print("✓ Sales Return Item DocType exists")
        checks.append(True)
    else:
        print("✗ Sales Return Item DocType not found")
        checks.append(False)
    
    # Check 2: Sales Return DocType exists
    print("\n[2/5] Checking Sales Return DocType...")
    if frappe.db.exists("DocType", "Sales Return"):
        print("✓ Sales Return DocType exists")
        checks.append(True)
    else:
        print("✗ Sales Return DocType not found")
        checks.append(False)
    
    # Check 3: Verify fields
    print("\n[3/5] Checking required fields...")
    if frappe.db.exists("DocType", "Sales Return"):
        doc = frappe.get_doc("DocType", "Sales Return")
        required_fields = ["customer", "posting_date", "delivery_note", "company", "items"]
        missing_fields = []
        
        for field in required_fields:
            if not any(f.fieldname == field for f in doc.fields):
                missing_fields.append(field)
        
        if not missing_fields:
            print("✓ All required fields present")
            checks.append(True)
        else:
            print(f"✗ Missing fields: {', '.join(missing_fields)}")
            checks.append(False)
    else:
        checks.append(False)
    
    # Check 4: Verify naming series
    print("\n[4/5] Checking naming series...")
    if frappe.db.exists("DocType", "Sales Return"):
        doc = frappe.get_doc("DocType", "Sales Return")
        naming_field = next((f for f in doc.fields if f.fieldname == "naming_series"), None)
        
        if naming_field and "RET-.YYYY.-" in naming_field.options:
            print("✓ Naming series configured correctly")
            checks.append(True)
        else:
            print("✗ Naming series not configured correctly")
            checks.append(False)
    else:
        checks.append(False)
    
    # Check 5: Verify permissions
    print("\n[5/5] Checking permissions...")
    if frappe.db.exists("DocType", "Sales Return"):
        doc = frappe.get_doc("DocType", "Sales Return")
        
        if doc.permissions:
            print(f"✓ Permissions configured ({len(doc.permissions)} roles)")
            checks.append(True)
        else:
            print("✗ No permissions configured")
            checks.append(False)
    else:
        checks.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    passed = sum(checks)
    total = len(checks)
    
    if passed == total:
        print(f"✓ All checks passed ({passed}/{total})")
        print("Installation is complete and verified!")
    else:
        print(f"✗ Some checks failed ({passed}/{total})")
        print("Please review the errors above and reinstall if needed")
    
    print("=" * 60)
    
    return passed == total


if __name__ == "__main__":
    # Run installation when script is executed directly
    install_sales_return()
