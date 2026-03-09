#!/usr/bin/env python3
"""
Script to create custom fields for Purchase Return and Debit Note features
Creates custom fields in Purchase Receipt and Purchase Invoice doctypes

Module: Batasku Custom
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def create_purchase_receipt_custom_fields():
    """Create custom fields for Purchase Receipt (Purchase Return)"""
    
    custom_fields = {
        'Purchase Receipt': [
            {
                'fieldname': 'custom_return_notes',
                'label': 'Return Notes',
                'fieldtype': 'Text Editor',
                'insert_after': 'remarks',
                'depends_on': 'eval:doc.is_return==1',
                'description': 'Additional notes for purchase return',
                'module': 'Batasku Custom',
            }
        ],
        'Purchase Receipt Item': [
            {
                'fieldname': 'custom_return_reason',
                'label': 'Return Reason',
                'fieldtype': 'Select',
                'options': '\nDamaged\nQuality Issue\nWrong Item\nSupplier Request\nExpired\nOther',
                'insert_after': 'item_name',
                'depends_on': 'eval:parent.is_return==1',
                'description': 'Reason for returning this item',
                'module': 'Batasku Custom',
            },
            {
                'fieldname': 'custom_return_item_notes',
                'label': 'Return Item Notes',
                'fieldtype': 'Small Text',
                'insert_after': 'custom_return_reason',
                'depends_on': 'eval:parent.is_return==1',
                'description': 'Additional notes for this return item (required for "Other" reason)',
                'module': 'Batasku Custom',
            }
        ]
    }
    
    create_custom_fields(custom_fields, update=True)
    print("✅ Custom fields for Purchase Receipt created successfully")

def create_purchase_invoice_custom_fields():
    """Create custom fields for Purchase Invoice (Debit Note)"""
    
    custom_fields = {
        'Purchase Invoice': [
            {
                'fieldname': 'custom_return_notes',
                'label': 'Return Notes',
                'fieldtype': 'Text Editor',
                'insert_after': 'remarks',
                'depends_on': 'eval:doc.is_return==1',
                'description': 'Additional notes for debit note',
                'module': 'Batasku Custom',
            }
        ],
        'Purchase Invoice Item': [
            {
                'fieldname': 'custom_return_reason',
                'label': 'Return Reason',
                'fieldtype': 'Select',
                'options': '\nDamaged\nQuality Issue\nWrong Item\nSupplier Request\nExpired\nOther',
                'insert_after': 'item_name',
                'depends_on': 'eval:parent.is_return==1',
                'description': 'Reason for returning this item',
                'module': 'Batasku Custom',
            },
            {
                'fieldname': 'custom_return_item_notes',
                'label': 'Return Item Notes',
                'fieldtype': 'Small Text',
                'insert_after': 'custom_return_reason',
                'depends_on': 'eval:parent.is_return==1',
                'description': 'Additional notes for this return item (required for "Other" reason)',
                'module': 'Batasku Custom',
            }
        ]
    }
    
    create_custom_fields(custom_fields, update=True)
    print("✅ Custom fields for Purchase Invoice created successfully")

def main():
    """Main function to create all custom fields"""
    frappe.init(site='your-site-name')  # Replace with your actual site name
    frappe.connect()
    
    try:
        print("Creating custom fields for Purchase Return and Debit Note...")
        print("\n1. Creating Purchase Receipt custom fields...")
        create_purchase_receipt_custom_fields()
        
        print("\n2. Creating Purchase Invoice custom fields...")
        create_purchase_invoice_custom_fields()
        
        frappe.db.commit()
        print("\n✅ All custom fields created successfully!")
        print("\nCustom fields created:")
        print("  - Purchase Receipt: custom_return_notes")
        print("  - Purchase Receipt Item: custom_return_reason, custom_return_item_notes")
        print("  - Purchase Invoice: custom_return_notes")
        print("  - Purchase Invoice Item: custom_return_reason, custom_return_item_notes")
        
    except Exception as e:
        frappe.db.rollback()
        print(f"\n❌ Error creating custom fields: {str(e)}")
        raise
    finally:
        frappe.destroy()

if __name__ == '__main__':
    main()
