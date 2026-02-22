"""
Sales Return DocType Validation Script
This script should be added to the Sales Return DocType in ERPNext
via Setup > Customize Form > Sales Return > Server Script
"""

import frappe
from frappe import _

def validate(doc, method=None):
    """
    Validate Sales Return document before saving
    
    Validates:
    - Return quantity <= delivered quantity
    - Return reason is selected for all items
    - Notes are provided when reason is "Other"
    - Calculates line totals and grand total
    """
    
    # Validate delivery note exists and is submitted
    if doc.delivery_note:
        dn = frappe.get_doc("Delivery Note", doc.delivery_note)
        if dn.docstatus != 1:
            frappe.throw(_("Delivery Note {0} must be submitted before creating a return").format(doc.delivery_note))
    
    # Validate items
    if not doc.items:
        frappe.throw(_("Please add at least one item to return"))
    
    # Get delivered quantities from delivery note
    dn_items = {}
    if doc.delivery_note:
        dn = frappe.get_doc("Delivery Note", doc.delivery_note)
        for item in dn.items:
            dn_items[item.name] = {
                'qty': item.qty,
                'item_code': item.item_code,
                'rate': item.rate,
                'warehouse': item.warehouse
            }
    
    grand_total = 0
    
    for item in doc.items:
        # Validate return quantity > 0
        if item.qty <= 0:
            frappe.throw(_("Row {0}: Return quantity must be greater than 0").format(item.idx))
        
        # Validate return quantity <= delivered quantity
        if item.delivery_note_item and item.delivery_note_item in dn_items:
            delivered_qty = dn_items[item.delivery_note_item]['qty']
            
            # Check for previous returns from the same delivery note item
            previous_returns = frappe.db.sql("""
                SELECT SUM(sri.qty) as total_returned
                FROM `tabSales Return Item` sri
                INNER JOIN `tabSales Return` sr ON sri.parent = sr.name
                WHERE sr.docstatus = 1
                AND sr.delivery_note = %s
                AND sri.delivery_note_item = %s
                AND sr.name != %s
            """, (doc.delivery_note, item.delivery_note_item, doc.name), as_dict=True)
            
            total_returned = previous_returns[0].total_returned or 0
            remaining_qty = delivered_qty - total_returned
            
            if item.qty > remaining_qty:
                frappe.throw(_(
                    "Row {0}: Return quantity ({1}) exceeds remaining returnable quantity ({2}). "
                    "Delivered: {3}, Previously returned: {4}"
                ).format(item.idx, item.qty, remaining_qty, delivered_qty, total_returned))
        
        # Validate return reason is selected
        if not item.return_reason:
            frappe.throw(_("Row {0}: Please select a return reason").format(item.idx))
        
        # Validate notes when reason is "Other"
        if item.return_reason == "Other" and not item.return_notes:
            frappe.throw(_("Row {0}: Please provide additional notes for return reason 'Other'").format(item.idx))
        
        # Calculate line total
        item.amount = item.qty * item.rate
        grand_total += item.amount
    
    # Set grand total
    doc.grand_total = grand_total
    
    # Set status based on docstatus
    if doc.docstatus == 0:
        doc.status = "Draft"
    elif doc.docstatus == 1:
        doc.status = "Submitted"
    elif doc.docstatus == 2:
        doc.status = "Cancelled"


def on_submit(doc, method=None):
    """
    Handle Sales Return submission
    Creates stock entries to increase inventory for returned items
    """
    
    # Create Stock Entry for return
    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.stock_entry_type = "Material Receipt"
    stock_entry.company = doc.company
    stock_entry.posting_date = doc.posting_date
    stock_entry.posting_time = frappe.utils.nowtime()
    
    # Add reference to Sales Return
    stock_entry.add_comment("Comment", f"Created from Sales Return: {doc.name}")
    
    for item in doc.items:
        stock_entry.append("items", {
            "item_code": item.item_code,
            "qty": item.qty,
            "uom": item.uom,
            "t_warehouse": item.warehouse,  # Target warehouse (receiving)
            "basic_rate": item.rate,
            "basic_amount": item.amount,
            "allow_zero_valuation_rate": 0
        })
    
    try:
        stock_entry.insert()
        stock_entry.submit()
        
        # Link stock entry to sales return
        frappe.db.set_value("Sales Return", doc.name, "stock_entry", stock_entry.name)
        frappe.db.commit()
        
        frappe.msgprint(_("Stock Entry {0} created successfully").format(stock_entry.name))
        
    except Exception as e:
        frappe.throw(_("Failed to create Stock Entry: {0}").format(str(e)))


def on_cancel(doc, method=None):
    """
    Handle Sales Return cancellation
    Cancels the associated stock entry to reverse inventory adjustments
    """
    
    # Get linked stock entry
    stock_entry_name = frappe.db.get_value("Sales Return", doc.name, "stock_entry")
    
    if stock_entry_name:
        try:
            stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
            
            if stock_entry.docstatus == 1:
                stock_entry.cancel()
                frappe.msgprint(_("Stock Entry {0} cancelled successfully").format(stock_entry_name))
            
        except Exception as e:
            frappe.throw(_("Failed to cancel Stock Entry: {0}").format(str(e)))
    else:
        frappe.msgprint(_("No Stock Entry found to cancel"), alert=True)


def before_cancel(doc, method=None):
    """
    Validate before cancellation
    """
    # Add any pre-cancellation validations here if needed
    pass
