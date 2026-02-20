"""
Invoice Cancellation Module

This module handles invoice cancellation by creating reversal GL Entries.
Ensures that cancellation completely reverses the original transaction.

Requirements: 6.4, 7.4, 8.4, 9.4, 10.5
"""

from typing import Dict, List, Any
from datetime import date


class CancellationError(Exception):
    """Exception raised for cancellation errors"""
    pass


def create_reversal_gl_entry(
    original_gl_entries: List[Dict[str, Any]],
    cancellation_date: str = None
) -> Dict[str, Any]:
    """
    Create reversal GL Entry for invoice cancellation.
    
    Reversal logic: Swap debit and credit amounts for each entry.
    This ensures that the net effect of original + reversal = 0.
    
    Args:
        original_gl_entries: List of original GL Entry lines
        cancellation_date: Date for reversal entries (defaults to today)
    
    Returns:
        Dict containing:
            - gl_entries: Array of reversal GL Entry lines
            - total_debit: Sum of all debits
            - total_credit: Sum of all credits
            - is_balanced: Boolean (total debit == total credit)
    
    Raises:
        CancellationError: If reversal entries are not balanced
    
    Example:
        >>> original_entries = [
        ...     {
        ...         "account": "1210 - Piutang Usaha",
        ...         "debit": 999000,
        ...         "credit": 0,
        ...         "remarks": "Sales Invoice SI-2024-00001"
        ...     },
        ...     {
        ...         "account": "4100 - Pendapatan Penjualan",
        ...         "debit": 0,
        ...         "credit": 1000000,
        ...         "remarks": "Sales Invoice SI-2024-00001"
        ...     }
        ... ]
        >>> result = create_reversal_gl_entry(original_entries)
        >>> result['gl_entries'][0]['debit']
        0
        >>> result['gl_entries'][0]['credit']
        999000
        >>> result['is_balanced']
        True
    """
    
    if not original_gl_entries:
        raise CancellationError("Original GL entries are required")
    
    if not cancellation_date:
        cancellation_date = str(date.today())
    
    reversal_entries = []
    
    for entry in original_gl_entries:
        # Swap debit and credit
        reversal_entry = {
            "account": entry.get("account", ""),
            "debit": entry.get("credit", 0),  # Swap: credit becomes debit
            "credit": entry.get("debit", 0),  # Swap: debit becomes credit
            "against": entry.get("against", ""),
            "posting_date": cancellation_date,
            "voucher_type": entry.get("voucher_type", ""),
            "voucher_no": entry.get("voucher_no", ""),
            "remarks": f"Reversal: {entry.get('remarks', '')}",
            "is_cancelled": 1
        }
        reversal_entries.append(reversal_entry)
    
    # Validate balanced entry
    total_debit = sum(entry["debit"] for entry in reversal_entries)
    total_credit = sum(entry["credit"] for entry in reversal_entries)
    is_balanced = abs(total_debit - total_credit) < 0.01  # Allow rounding error
    
    if not is_balanced:
        raise CancellationError(
            f"Reversal GL Entry not balanced: Debit={total_debit}, Credit={total_credit}"
        )
    
    return {
        "gl_entries": reversal_entries,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced
    }


def verify_cancellation_net_effect(
    original_gl_entries: List[Dict[str, Any]],
    reversal_gl_entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Verify that original + reversal entries have net effect of zero.
    
    This is a critical validation to ensure cancellation is complete.
    For each account, the sum of (original + reversal) should be zero.
    
    Args:
        original_gl_entries: List of original GL Entry lines
        reversal_gl_entries: List of reversal GL Entry lines
    
    Returns:
        Dict containing:
            - is_valid: Boolean (net effect is zero for all accounts)
            - account_balances: Dict of account -> net balance
            - errors: List of error messages if any
    """
    account_balances = {}
    
    # Sum original entries
    for entry in original_gl_entries:
        account = entry.get("account", "")
        debit = entry.get("debit", 0)
        credit = entry.get("credit", 0)
        net = debit - credit
        
        if account not in account_balances:
            account_balances[account] = 0
        account_balances[account] += net
    
    # Sum reversal entries
    for entry in reversal_gl_entries:
        account = entry.get("account", "")
        debit = entry.get("debit", 0)
        credit = entry.get("credit", 0)
        net = debit - credit
        
        if account not in account_balances:
            account_balances[account] = 0
        account_balances[account] += net
    
    # Check if all accounts have net balance of zero
    errors = []
    for account, balance in account_balances.items():
        if abs(balance) > 0.01:  # Allow rounding error
            errors.append(
                f"Account {account} has non-zero net balance: {balance}"
            )
    
    return {
        "is_valid": len(errors) == 0,
        "account_balances": {
            k: round(v, 2) for k, v in account_balances.items()
        },
        "errors": errors
    }


def cancel_invoice_with_gl_reversal(
    invoice_name: str,
    invoice_type: str,
    original_gl_entries: List[Dict[str, Any]],
    cancellation_date: str = None
) -> Dict[str, Any]:
    """
    Complete invoice cancellation workflow with GL reversal.
    
    This is a high-level function that:
    1. Creates reversal GL entries
    2. Verifies net effect is zero
    3. Returns complete cancellation result
    
    Args:
        invoice_name: Invoice number (e.g., "SI-2024-00001")
        invoice_type: "Sales Invoice" or "Purchase Invoice"
        original_gl_entries: List of original GL Entry lines
        cancellation_date: Date for cancellation (defaults to today)
    
    Returns:
        Dict containing:
            - success: Boolean
            - reversal_entries: List of reversal GL Entry lines
            - verification: Verification result
            - message: Success/error message
    """
    try:
        # Create reversal entries
        reversal_result = create_reversal_gl_entry(
            original_gl_entries,
            cancellation_date
        )
        
        # Verify net effect
        verification = verify_cancellation_net_effect(
            original_gl_entries,
            reversal_result["gl_entries"]
        )
        
        if not verification["is_valid"]:
            return {
                "success": False,
                "message": "Cancellation verification failed",
                "errors": verification["errors"]
            }
        
        return {
            "success": True,
            "message": f"{invoice_type} {invoice_name} cancelled successfully",
            "reversal_entries": reversal_result["gl_entries"],
            "verification": verification,
            "total_debit": reversal_result["total_debit"],
            "total_credit": reversal_result["total_credit"]
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Cancellation failed: {str(e)}",
            "errors": [str(e)]
        }
