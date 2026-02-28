"""
Credit Note Commission Adjustment Module

This module handles commission adjustments when Credit Notes (Sales Invoice returns) 
are submitted or cancelled. It automatically updates the custom_total_komisi_sales 
field on the original Sales Invoice.

Requirements: 7.3, 7.4

Usage:
    Add hooks to your ERPNext custom app's hooks.py:
    
    doc_events = {
        "Sales Invoice": {
            "on_submit": "erpnext_custom.credit_note_commission.on_credit_note_submit",
            "on_cancel": "erpnext_custom.credit_note_commission.on_credit_note_cancel"
        }
    }
"""

from typing import Any, Dict
import frappe
from frappe import _


def on_credit_note_submit(doc: Any, method: str = None) -> None:
    """
    Hook called when Sales Invoice is submitted.
    If it's a Credit Note (is_return=1), adjust commission on original invoice.
    
    Process:
    1. Check if this is a Credit Note (is_return=1)
    2. Get the original Sales Invoice (return_against)
    3. Calculate commission adjustment from Credit Note items
    4. Update custom_total_komisi_sales on original invoice
    
    Args:
        doc: Sales Invoice document object
        method: Hook method name (not used)
    
    Requirements: 7.3, 7.4
    """
    try:
        # Check if this is a Credit Note
        if not doc.is_return or doc.is_return != 1:
            # Not a Credit Note, skip commission adjustment
            return
        
        # Get original Sales Invoice reference
        original_invoice_name = doc.return_against
        if not original_invoice_name:
            frappe.log_error(
                message=f"Credit Note {doc.name} has no return_against reference",
                title="Commission Adjustment Error"
            )
            return
        
        # Get original Sales Invoice
        try:
            original_invoice = frappe.get_doc("Sales Invoice", original_invoice_name)
        except frappe.DoesNotExistError:
            frappe.throw(
                _(f"Original Sales Invoice {original_invoice_name} not found")
            )
            return
        
        # Calculate commission adjustment from Credit Note
        credit_note_commission = doc.get("custom_total_komisi_sales", 0)
        
        # Credit Note commission should be negative
        # We subtract it from original (which adds back the negative value)
        original_commission = original_invoice.get("custom_total_komisi_sales", 0)
        adjusted_commission = original_commission - abs(credit_note_commission)
        
        # Update original invoice commission
        original_invoice.custom_total_komisi_sales = adjusted_commission
        original_invoice.flags.ignore_validate_update_after_submit = True
        original_invoice.save(ignore_permissions=True)
        
        # Log the adjustment
        frappe.logger().info(
            f"Commission adjusted for Sales Invoice {original_invoice_name}: "
            f"Original={original_commission}, "
            f"Credit Note={credit_note_commission}, "
            f"Adjusted={adjusted_commission}"
        )
        
        # Add comment to original invoice for audit trail
        original_invoice.add_comment(
            "Info",
            f"Commission adjusted by Credit Note {doc.name}: "
            f"{original_commission} - {abs(credit_note_commission)} = {adjusted_commission}"
        )
        
        # Add comment to Credit Note
        doc.add_comment(
            "Info",
            f"Commission adjustment applied to {original_invoice_name}: "
            f"Reduced by {abs(credit_note_commission)}"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"Commission Adjustment Error - Credit Note {doc.name}"
        )
        # Don't throw error to prevent blocking Credit Note submission
        # Just log the error for manual review
        frappe.msgprint(
            _(f"Warning: Commission adjustment failed: {str(e)}"),
            indicator="orange"
        )


def on_credit_note_cancel(doc: Any, method: str = None) -> None:
    """
    Hook called when Sales Invoice is cancelled.
    If it's a Credit Note (is_return=1), reverse commission adjustment on original invoice.
    
    Process:
    1. Check if this is a Credit Note (is_return=1)
    2. Get the original Sales Invoice (return_against)
    3. Calculate commission reversal (add back the commission)
    4. Update custom_total_komisi_sales on original invoice
    
    Args:
        doc: Sales Invoice document object
        method: Hook method name (not used)
    
    Requirements: 7.3, 7.4
    """
    try:
        # Check if this is a Credit Note
        if not doc.is_return or doc.is_return != 1:
            # Not a Credit Note, skip commission adjustment
            return
        
        # Get original Sales Invoice reference
        original_invoice_name = doc.return_against
        if not original_invoice_name:
            frappe.log_error(
                message=f"Credit Note {doc.name} has no return_against reference",
                title="Commission Reversal Error"
            )
            return
        
        # Get original Sales Invoice
        try:
            original_invoice = frappe.get_doc("Sales Invoice", original_invoice_name)
        except frappe.DoesNotExistError:
            frappe.throw(
                _(f"Original Sales Invoice {original_invoice_name} not found")
            )
            return
        
        # Calculate commission reversal from Credit Note
        credit_note_commission = doc.get("custom_total_komisi_sales", 0)
        
        # Reverse the adjustment: add back the commission that was deducted
        original_commission = original_invoice.get("custom_total_komisi_sales", 0)
        reversed_commission = original_commission + abs(credit_note_commission)
        
        # Update original invoice commission
        original_invoice.custom_total_komisi_sales = reversed_commission
        original_invoice.flags.ignore_validate_update_after_submit = True
        original_invoice.save(ignore_permissions=True)
        
        # Log the reversal
        frappe.logger().info(
            f"Commission reversed for Sales Invoice {original_invoice_name}: "
            f"Current={original_commission}, "
            f"Credit Note={credit_note_commission}, "
            f"Reversed={reversed_commission}"
        )
        
        # Add comment to original invoice for audit trail
        original_invoice.add_comment(
            "Info",
            f"Commission reversal by Credit Note {doc.name} cancellation: "
            f"{original_commission} + {abs(credit_note_commission)} = {reversed_commission}"
        )
        
        # Add comment to Credit Note
        doc.add_comment(
            "Info",
            f"Commission reversal applied to {original_invoice_name}: "
            f"Added back {abs(credit_note_commission)}"
        )
        
    except Exception as e:
        frappe.log_error(
            message=str(e),
            title=f"Commission Reversal Error - Credit Note {doc.name}"
        )
        # Don't throw error to prevent blocking Credit Note cancellation
        # Just log the error for manual review
        frappe.msgprint(
            _(f"Warning: Commission reversal failed: {str(e)}"),
            indicator="orange"
        )


def calculate_commission_adjustment(credit_note: Any) -> float:
    """
    Calculate total commission adjustment from Credit Note items.
    
    Args:
        credit_note: Credit Note (Sales Invoice) document
    
    Returns:
        Total commission adjustment (negative value)
    
    Example:
        >>> credit_note = frappe.get_doc("Sales Invoice", "CN-2024-00001")
        >>> adjustment = calculate_commission_adjustment(credit_note)
        >>> adjustment
        -50000.0
    """
    total_commission = 0.0
    
    if hasattr(credit_note, "items") and credit_note.items:
        for item in credit_note.items:
            item_commission = item.get("custom_komisi_sales", 0)
            total_commission += item_commission
    
    return round(total_commission, 2)


def validate_commission_adjustment(
    original_invoice: Any,
    credit_note: Any
) -> Dict[str, Any]:
    """
    Validate commission adjustment before applying.
    
    Args:
        original_invoice: Original Sales Invoice document
        credit_note: Credit Note document
    
    Returns:
        Dict with validation result:
            - valid: Boolean
            - message: Error message if invalid
            - original_commission: Original commission value
            - adjustment: Commission adjustment value
            - new_commission: New commission after adjustment
    """
    result = {
        "valid": True,
        "message": "",
        "original_commission": 0.0,
        "adjustment": 0.0,
        "new_commission": 0.0
    }
    
    # Get original commission
    original_commission = original_invoice.get("custom_total_komisi_sales", 0)
    result["original_commission"] = original_commission
    
    # Get Credit Note commission
    credit_note_commission = credit_note.get("custom_total_komisi_sales", 0)
    result["adjustment"] = credit_note_commission
    
    # Calculate new commission
    new_commission = original_commission - abs(credit_note_commission)
    result["new_commission"] = new_commission
    
    # Validate: new commission should not be negative
    if new_commission < 0:
        result["valid"] = False
        result["message"] = (
            f"Commission adjustment would result in negative commission: "
            f"{original_commission} - {abs(credit_note_commission)} = {new_commission}"
        )
        return result
    
    # Validate: Credit Note commission should be negative or zero
    if credit_note_commission > 0:
        result["valid"] = False
        result["message"] = (
            f"Credit Note commission should be negative or zero, got: {credit_note_commission}"
        )
        return result
    
    return result
