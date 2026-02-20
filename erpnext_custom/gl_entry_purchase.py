"""
GL Entry Posting Module for Purchase Invoice

This module handles GL Entry posting for Purchase Invoices with discounts and taxes.
Ensures balanced entries (total debit = total credit) and proper account mapping.

Requirements: 7.1, 7.2, 7.3, 7.5, 9.1, 9.2, 9.3, 10.2, 10.3
"""

from typing import Dict, List, Any
from datetime import date


class GLEntryError(Exception):
    """Exception raised for GL Entry errors"""
    pass


def post_purchase_invoice_gl_entry(
    invoice: Dict[str, Any],
    posting_date: str = None
) -> Dict[str, Any]:
    """
    Post GL Entry for Purchase Invoice with discount and tax.
    
    Journal Entry Structure:
    - Debit:  Persediaan (net_total after discount)
    - Debit:  Pajak Dibayar Dimuka (PPN Input) - for each tax row
    - Credit: Hutang Usaha (grand_total)
    
    Note: Discount is already reflected in net_total, so no separate GL Entry
    for purchase discount. The discount reduces the cost of inventory.
    
    Args:
        invoice: Purchase Invoice object containing:
            - name: Invoice number
            - supplier: Supplier ID
            - total: Total before discount
            - discount_amount: Discount amount (optional)
            - net_total: Total after discount
            - taxes: Array of tax rows (optional)
            - grand_total: Final total
        posting_date: GL Entry posting date (defaults to invoice posting_date)
    
    Returns:
        Dict containing:
            - gl_entries: Array of GL Entry lines
            - total_debit: Sum of all debits
            - total_credit: Sum of all credits
            - is_balanced: Boolean (total debit == total credit)
    
    Raises:
        GLEntryError: If GL Entry is not balanced or validation fails
    
    Example:
        >>> invoice = {
        ...     "name": "PI-2024-00001",
        ...     "supplier": "SUPP-001",
        ...     "total": 600000,
        ...     "discount_amount": 50000,
        ...     "net_total": 550000,
        ...     "taxes": [{
        ...         "account_head": "1410 - Pajak Dibayar Dimuka",
        ...         "description": "PPN Masukan 11%",
        ...         "tax_amount": 60500
        ...     }],
        ...     "grand_total": 610500
        ... }
        >>> result = post_purchase_invoice_gl_entry(invoice, "2024-01-15")
        >>> result['is_balanced']
        True
        >>> result['total_debit']
        610500.0
        >>> result['total_credit']
        610500.0
    """
    
    # Validate required fields
    if not invoice.get("name"):
        raise GLEntryError("Invoice name is required")
    
    if not invoice.get("supplier"):
        raise GLEntryError("Supplier is required")
    
    if not invoice.get("grand_total"):
        raise GLEntryError("Grand total is required")
    
    # Use invoice posting_date if not provided
    if not posting_date:
        posting_date = invoice.get("posting_date", str(date.today()))
    
    gl_entries = []
    
    # 1. Debit: Persediaan (Stock/Inventory)
    # This is the cost of goods after discount
    net_total = invoice.get("net_total", invoice.get("total", 0))
    gl_entries.append({
        "account": "1310 - Persediaan",
        "debit": net_total,
        "credit": 0,
        "posting_date": posting_date,
        "voucher_type": "Purchase Invoice",
        "voucher_no": invoice["name"],
        "remarks": f"Purchase Invoice {invoice['name']}"
    })
    
    # 2. Debit: Pajak Dibayar Dimuka (PPN Input) and other taxes
    # For each tax row, create appropriate GL Entry
    taxes = invoice.get("taxes", [])
    for tax_row in taxes:
        tax_amount = tax_row.get("tax_amount", 0)
        if tax_amount == 0:
            continue
        
        account_head = tax_row.get("account_head", "")
        description = tax_row.get("description", "Tax")
        
        if tax_amount > 0:
            # Add tax (e.g., PPN Input - can be credited)
            gl_entries.append({
                "account": account_head,
                "debit": tax_amount,
                "credit": 0,
                "posting_date": posting_date,
                "voucher_type": "Purchase Invoice",
                "voucher_no": invoice["name"],
                "remarks": f"{description} on {invoice['name']}"
            })
        else:
            # Deduct tax (e.g., PPh 23 withheld by us)
            # This reduces the amount we owe to supplier
            gl_entries.append({
                "account": account_head,
                "debit": 0,
                "credit": abs(tax_amount),
                "posting_date": posting_date,
                "voucher_type": "Purchase Invoice",
                "voucher_no": invoice["name"],
                "remarks": f"{description} on {invoice['name']}"
            })
    
    # 3. Credit: Hutang Usaha (Payable)
    # This is the amount we owe to supplier (grand_total)
    gl_entries.append({
        "account": "2110 - Hutang Usaha",
        "debit": 0,
        "credit": invoice["grand_total"],
        "against": invoice["supplier"],
        "posting_date": posting_date,
        "voucher_type": "Purchase Invoice",
        "voucher_no": invoice["name"],
        "remarks": f"Purchase Invoice {invoice['name']}"
    })
    
    # Validate balanced entry
    total_debit = sum(entry["debit"] for entry in gl_entries)
    total_credit = sum(entry["credit"] for entry in gl_entries)
    is_balanced = abs(total_debit - total_credit) < 0.01  # Allow rounding error
    
    if not is_balanced:
        raise GLEntryError(
            f"GL Entry not balanced: Debit={total_debit}, Credit={total_credit}"
        )
    
    return {
        "gl_entries": gl_entries,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced
    }


def validate_purchase_invoice_for_gl_posting(invoice: Dict[str, Any]) -> str:
    """
    Validate purchase invoice before GL Entry posting.
    
    Args:
        invoice: Purchase Invoice object
    
    Returns:
        None if valid, error message string if invalid
    """
    if not invoice.get("name"):
        return "Invoice name is required"
    
    if not invoice.get("supplier"):
        return "Supplier is required"
    
    if not invoice.get("grand_total"):
        return "Grand total is required"
    
    # Validate grand total calculation
    net_total = invoice.get("net_total", 0)
    
    taxes = invoice.get("taxes", [])
    total_taxes = sum(tax.get("tax_amount", 0) for tax in taxes)
    
    expected_grand_total = net_total + total_taxes
    actual_grand_total = invoice.get("grand_total", 0)
    
    if abs(expected_grand_total - actual_grand_total) > 0.01:
        return (
            f"Grand total mismatch. "
            f"Expected: {expected_grand_total}, Got: {actual_grand_total}"
        )
    
    return None


def get_stock_valuation_rate(invoice: Dict[str, Any]) -> float:
    """
    Calculate stock valuation rate after discount.
    
    For purchase invoices with discount, the stock should be valued at
    net_total (after discount), not gross total.
    
    Args:
        invoice: Purchase Invoice object
    
    Returns:
        Valuation rate per unit
    """
    net_total = invoice.get("net_total", 0)
    
    # Calculate total quantity
    items = invoice.get("items", [])
    total_qty = sum(item.get("qty", 0) for item in items)
    
    if total_qty == 0:
        return 0
    
    return round(net_total / total_qty, 2)
