"""
GL Entry Posting Module for Sales Invoice

This module handles GL Entry posting for Sales Invoices with discounts and taxes.
Ensures balanced entries (total debit = total credit) and proper account mapping.

Requirements: 6.1, 6.2, 6.3, 6.5, 8.1, 8.2, 8.3
"""

from typing import Dict, List, Any
from datetime import date


class GLEntryError(Exception):
    """Exception raised for GL Entry errors"""
    pass


def post_sales_invoice_gl_entry(
    invoice: Dict[str, Any],
    posting_date: str = None
) -> Dict[str, Any]:
    """
    Post GL Entry for Sales Invoice with discount and tax.
    
    Journal Entry Structure:
    - Debit:  Piutang Usaha (grand_total)
    - Debit:  Potongan Penjualan (discount_amount) - if discount exists
    - Credit: Pendapatan Penjualan (total before discount)
    - Credit: Hutang PPN (tax_amount) - for each tax row
    
    Args:
        invoice: Sales Invoice object containing:
            - name: Invoice number
            - customer: Customer ID
            - total: Total before discount
            - discount_amount: Discount amount (optional)
            - discount_percentage: Discount percentage (optional)
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
        ...     "name": "SI-2024-00001",
        ...     "customer": "CUST-001",
        ...     "total": 1000000,
        ...     "discount_amount": 100000,
        ...     "discount_percentage": 10,
        ...     "net_total": 900000,
        ...     "taxes": [{
        ...         "account_head": "2210 - Hutang PPN",
        ...         "description": "PPN 11%",
        ...         "tax_amount": 99000
        ...     }],
        ...     "grand_total": 999000
        ... }
        >>> result = post_sales_invoice_gl_entry(invoice, "2024-01-15")
        >>> result['is_balanced']
        True
        >>> result['total_debit']
        1099000.0
        >>> result['total_credit']
        1099000.0
    """
    
    # Validate required fields
    if not invoice.get("name"):
        raise GLEntryError("Invoice name is required")
    
    if not invoice.get("customer"):
        raise GLEntryError("Customer is required")
    
    if not invoice.get("grand_total"):
        raise GLEntryError("Grand total is required")
    
    # Use invoice posting_date if not provided
    if not posting_date:
        posting_date = invoice.get("posting_date", str(date.today()))
    
    gl_entries = []
    
    # 1. Debit: Piutang Usaha (Receivable)
    # This is the amount customer owes (grand_total)
    gl_entries.append({
        "account": "1210 - Piutang Usaha",
        "debit": invoice["grand_total"],
        "credit": 0,
        "against": invoice["customer"],
        "posting_date": posting_date,
        "voucher_type": "Sales Invoice",
        "voucher_no": invoice["name"],
        "remarks": f"Sales Invoice {invoice['name']}"
    })
    
    # 2. Debit: Potongan Penjualan (if discount exists)
    # This is a contra-income account that reduces revenue
    discount_amount = invoice.get("discount_amount", 0)
    if discount_amount > 0:
        discount_percentage = invoice.get("discount_percentage", 0)
        gl_entries.append({
            "account": "4300 - Potongan Penjualan",
            "debit": discount_amount,
            "credit": 0,
            "posting_date": posting_date,
            "voucher_type": "Sales Invoice",
            "voucher_no": invoice["name"],
            "remarks": f"Discount {discount_percentage}% on {invoice['name']}"
        })
    
    # 3. Credit: Pendapatan Penjualan (Income)
    # This is the gross revenue before discount
    total_before_discount = invoice.get("total", invoice["grand_total"])
    gl_entries.append({
        "account": "4100 - Pendapatan Penjualan",
        "debit": 0,
        "credit": total_before_discount,
        "against": invoice["customer"],
        "posting_date": posting_date,
        "voucher_type": "Sales Invoice",
        "voucher_no": invoice["name"],
        "remarks": f"Sales Invoice {invoice['name']}"
    })
    
    # 4. Credit/Debit: Tax Entries (Hutang PPN, PPh 23, etc.)
    # For each tax row, create appropriate GL Entry
    taxes = invoice.get("taxes", [])
    for tax_row in taxes:
        tax_amount = tax_row.get("tax_amount", 0)
        if tax_amount == 0:
            continue
        
        account_head = tax_row.get("account_head", "")
        description = tax_row.get("description", "Tax")
        
        if tax_amount > 0:
            # Add tax (e.g., PPN Output)
            gl_entries.append({
                "account": account_head,
                "debit": 0,
                "credit": tax_amount,
                "posting_date": posting_date,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice["name"],
                "remarks": f"{description} on {invoice['name']}"
            })
        else:
            # Deduct tax (e.g., PPh 23 withheld)
            gl_entries.append({
                "account": account_head,
                "debit": abs(tax_amount),
                "credit": 0,
                "posting_date": posting_date,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice["name"],
                "remarks": f"{description} on {invoice['name']}"
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


def validate_sales_invoice_for_gl_posting(invoice: Dict[str, Any]) -> str:
    """
    Validate sales invoice before GL Entry posting.
    
    Args:
        invoice: Sales Invoice object
    
    Returns:
        None if valid, error message string if invalid
    """
    if not invoice.get("name"):
        return "Invoice name is required"
    
    if not invoice.get("customer"):
        return "Customer is required"
    
    if not invoice.get("grand_total"):
        return "Grand total is required"
    
    # Validate grand total calculation
    total = invoice.get("total", 0)
    discount_amount = invoice.get("discount_amount", 0)
    net_total = invoice.get("net_total", total - discount_amount)
    
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
