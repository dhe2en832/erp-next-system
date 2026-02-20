"""
ERPNext Hooks Configuration

This file configures hooks for automatic GL Entry posting when invoices are submitted or cancelled.
These hooks integrate with ERPNext's document lifecycle events.

Requirements: 6.6, 7.6, 8.6, 9.6

Usage:
    Add this to your ERPNext custom app's hooks.py file:
    
    doc_events = {
        "Sales Invoice": {
            "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
            "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
        },
        "Purchase Invoice": {
            "on_submit": "erpnext_custom.hooks.on_purchase_invoice_submit",
            "on_cancel": "erpnext_custom.hooks.on_purchase_invoice_cancel"
        }
    }
"""

from typing import Any
import frappe
from frappe import _

from .gl_entry_sales import post_sales_invoice_gl_entry, validate_sales_invoice_for_gl_posting
from .gl_entry_purchase import post_purchase_invoice_gl_entry, validate_purchase_invoice_for_gl_posting
from .invoice_cancellation import cancel_invoice_with_gl_reversal


def on_sales_invoice_submit(doc: Any, method: str = None) -> None:
    """
    Hook called when Sales Invoice is submitted.
    Posts GL Entry for discount and tax.
    
    Args:
        doc: Sales Invoice document object
        method: Hook method name (not used)
    """
    try:
        # Convert doc to dict for processing
        invoice_data = {
            "name": doc.name,
            "customer": doc.customer,
            "posting_date": str(doc.posting_date),
            "total": doc.total,
            "discount_amount": doc.get("discount_amount", 0),
            "discount_percentage": doc.get("discount_percentage", 0),
            "net_total": doc.net_total,
            "taxes": [],
            "grand_total": doc.grand_total
        }
        
        # Extract tax rows
        if hasattr(doc, "taxes") and doc.taxes:
            for tax_row in doc.taxes:
                invoice_data["taxes"].append({
                    "account_head": tax_row.account_head,
                    "description": tax_row.description,
                    "rate": tax_row.rate,
                    "tax_amount": tax_row.tax_amount
                })
        
        # Validate before posting
        error = validate_sales_invoice_for_gl_posting(invoice_data)
        if error:
            frappe.throw(_(f"GL Entry validation failed: {error}"))
        
        # Post GL Entry
        gl_result = post_sales_invoice_gl_entry(invoice_data, str(doc.posting_date))
        
        # Log success
        frappe.logger().info(
            f"GL Entry posted for Sales Invoice {doc.name}: "
            f"Debit={gl_result['total_debit']}, Credit={gl_result['total_credit']}"
        )
        
        # Store GL entries in doc for reference (optional)
        doc.add_comment(
            "Info",
            f"GL Entry posted: {len(gl_result['gl_entries'])} entries, "
            f"Total Debit: {gl_result['total_debit']}, "
            f"Total Credit: {gl_result['total_credit']}"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"GL Entry Error - Sales Invoice {doc.name}"
        )
        frappe.throw(_(f"Failed to post GL Entry: {str(e)}"))


def on_sales_invoice_cancel(doc: Any, method: str = None) -> None:
    """
    Hook called when Sales Invoice is cancelled.
    Creates reversal GL Entry.
    
    Args:
        doc: Sales Invoice document object
        method: Hook method name (not used)
    """
    try:
        # Get original GL entries
        original_gl_entries = frappe.get_all(
            "GL Entry",
            filters={
                "voucher_type": "Sales Invoice",
                "voucher_no": doc.name,
                "is_cancelled": 0
            },
            fields=["*"]
        )
        
        if not original_gl_entries:
            frappe.logger().warning(
                f"No GL entries found for Sales Invoice {doc.name}"
            )
            return
        
        # Create reversal
        cancellation_result = cancel_invoice_with_gl_reversal(
            invoice_name=doc.name,
            invoice_type="Sales Invoice",
            original_gl_entries=original_gl_entries,
            cancellation_date=str(frappe.utils.today())
        )
        
        if not cancellation_result["success"]:
            frappe.throw(_(cancellation_result["message"]))
        
        # Log success
        frappe.logger().info(
            f"Reversal GL Entry posted for Sales Invoice {doc.name}"
        )
        
        doc.add_comment(
            "Info",
            f"Reversal GL Entry posted: {len(cancellation_result['reversal_entries'])} entries"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"GL Reversal Error - Sales Invoice {doc.name}"
        )
        frappe.throw(_(f"Failed to create reversal GL Entry: {str(e)}"))


def on_purchase_invoice_submit(doc: Any, method: str = None) -> None:
    """
    Hook called when Purchase Invoice is submitted.
    Posts GL Entry for discount and tax.
    
    Args:
        doc: Purchase Invoice document object
        method: Hook method name (not used)
    """
    try:
        # Convert doc to dict for processing
        invoice_data = {
            "name": doc.name,
            "supplier": doc.supplier,
            "posting_date": str(doc.posting_date),
            "total": doc.total,
            "discount_amount": doc.get("discount_amount", 0),
            "net_total": doc.net_total,
            "taxes": [],
            "grand_total": doc.grand_total,
            "items": []
        }
        
        # Extract items for stock valuation
        if hasattr(doc, "items") and doc.items:
            for item in doc.items:
                invoice_data["items"].append({
                    "item_code": item.item_code,
                    "qty": item.qty,
                    "rate": item.rate
                })
        
        # Extract tax rows
        if hasattr(doc, "taxes") and doc.taxes:
            for tax_row in doc.taxes:
                invoice_data["taxes"].append({
                    "account_head": tax_row.account_head,
                    "description": tax_row.description,
                    "rate": tax_row.rate,
                    "tax_amount": tax_row.tax_amount
                })
        
        # Validate before posting
        error = validate_purchase_invoice_for_gl_posting(invoice_data)
        if error:
            frappe.throw(_(f"GL Entry validation failed: {error}"))
        
        # Post GL Entry
        gl_result = post_purchase_invoice_gl_entry(invoice_data, str(doc.posting_date))
        
        # Log success
        frappe.logger().info(
            f"GL Entry posted for Purchase Invoice {doc.name}: "
            f"Debit={gl_result['total_debit']}, Credit={gl_result['total_credit']}"
        )
        
        doc.add_comment(
            "Info",
            f"GL Entry posted: {len(gl_result['gl_entries'])} entries, "
            f"Total Debit: {gl_result['total_debit']}, "
            f"Total Credit: {gl_result['total_credit']}"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"GL Entry Error - Purchase Invoice {doc.name}"
        )
        frappe.throw(_(f"Failed to post GL Entry: {str(e)}"))


def on_purchase_invoice_cancel(doc: Any, method: str = None) -> None:
    """
    Hook called when Purchase Invoice is cancelled.
    Creates reversal GL Entry.
    
    Args:
        doc: Purchase Invoice document object
        method: Hook method name (not used)
    """
    try:
        # Get original GL entries
        original_gl_entries = frappe.get_all(
            "GL Entry",
            filters={
                "voucher_type": "Purchase Invoice",
                "voucher_no": doc.name,
                "is_cancelled": 0
            },
            fields=["*"]
        )
        
        if not original_gl_entries:
            frappe.logger().warning(
                f"No GL entries found for Purchase Invoice {doc.name}"
            )
            return
        
        # Create reversal
        cancellation_result = cancel_invoice_with_gl_reversal(
            invoice_name=doc.name,
            invoice_type="Purchase Invoice",
            original_gl_entries=original_gl_entries,
            cancellation_date=str(frappe.utils.today())
        )
        
        if not cancellation_result["success"]:
            frappe.throw(_(cancellation_result["message"]))
        
        # Log success
        frappe.logger().info(
            f"Reversal GL Entry posted for Purchase Invoice {doc.name}"
        )
        
        doc.add_comment(
            "Info",
            f"Reversal GL Entry posted: {len(cancellation_result['reversal_entries'])} entries"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"GL Reversal Error - Purchase Invoice {doc.name}"
        )
        frappe.throw(_(f"Failed to create reversal GL Entry: {str(e)}"))


# Hook configuration to be added to ERPNext custom app
DOC_EVENTS = {
    "Sales Invoice": {
        "on_submit": "erpnext_custom.hooks.on_sales_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_sales_invoice_cancel"
    },
    "Purchase Invoice": {
        "on_submit": "erpnext_custom.hooks.on_purchase_invoice_submit",
        "on_cancel": "erpnext_custom.hooks.on_purchase_invoice_cancel"
    }
}
