"""
Tax Calculator Module

This module provides functions for calculating taxes on invoices.
Supports multiple tax rows with different charge types and add/deduct options.

Requirements: 4.5, 8.1, 9.1, 10.1, 10.2
"""

from typing import Dict, List, Any, Optional


class TaxValidationError(Exception):
    """Exception raised for tax validation errors"""
    pass


def calculate_taxes(
    net_total: float,
    tax_template: Optional[Dict[str, Any]] = None,
    tax_type: str = "Sales"
) -> Dict[str, Any]:
    """
    Calculate taxes based on tax template.
    Supports multiple tax rows with different charge types.
    
    Args:
        net_total: Subtotal after discount (must be > 0)
        tax_template: Tax template object with array of taxes
        tax_type: "Sales" or "Purchase" (for context)
    
    Returns:
        Dict containing:
            - taxes: Array of calculated tax rows
            - total_taxes: Total tax amount
            - grand_total: Net total + taxes
    
    Raises:
        TaxValidationError: If validation fails
    
    Examples:
        >>> # PPN 11% only
        >>> tax_template = {
        ...     "taxes": [{
        ...         "charge_type": "On Net Total",
        ...         "account_head": "2210 - Hutang PPN",
        ...         "description": "PPN 11%",
        ...         "rate": 11
        ...     }]
        ... }
        >>> calculate_taxes(900000, tax_template)
        {
            'taxes': [{
                'charge_type': 'On Net Total',
                'account_head': '2210 - Hutang PPN',
                'description': 'PPN 11%',
                'rate': 11,
                'tax_amount': 99000.0,
                'total': 999000.0
            }],
            'total_taxes': 99000.0,
            'grand_total': 999000.0
        }
        
        >>> # PPN 11% + PPh 23 (2%)
        >>> tax_template = {
        ...     "taxes": [
        ...         {
        ...             "charge_type": "On Net Total",
        ...             "account_head": "2210 - Hutang PPN",
        ...             "rate": 11,
        ...             "add_deduct_tax": "Add"
        ...         },
        ...         {
        ...             "charge_type": "On Net Total",
        ...             "account_head": "2230 - Hutang PPh 23",
        ...             "rate": 2,
        ...             "add_deduct_tax": "Deduct"
        ...         }
        ...     ]
        ... }
        >>> calculate_taxes(900000, tax_template)
        {
            'taxes': [
                {'tax_amount': 99000.0, 'total': 999000.0, ...},
                {'tax_amount': -18000.0, 'total': 981000.0, ...}
            ],
            'total_taxes': 81000.0,
            'grand_total': 981000.0
        }
    """
    
    # Validation: Net total must be greater than 0
    if net_total <= 0:
        raise TaxValidationError("Net total must be greater than 0")
    
    # If no tax template provided, return zero taxes
    if not tax_template or not tax_template.get("taxes"):
        return {
            "taxes": [],
            "total_taxes": 0,
            "grand_total": net_total
        }
    
    calculated_taxes = []
    running_total = net_total
    total_tax_amount = 0
    
    for tax_row in tax_template["taxes"]:
        charge_type = tax_row.get("charge_type", "On Net Total")
        rate = tax_row.get("rate", 0)
        add_deduct = tax_row.get("add_deduct_tax", "Add")
        
        # Validate rate
        if rate < 0 or rate > 100:
            raise TaxValidationError(
                f"Tax rate must be between 0 and 100, got {rate}"
            )
        
        # Calculate tax amount based on charge type
        if charge_type == "On Net Total":
            tax_amount = (rate / 100) * net_total
        elif charge_type == "On Previous Row Total":
            tax_amount = (rate / 100) * running_total
        elif charge_type == "Actual":
            tax_amount = tax_row.get("tax_amount", 0)
        else:
            tax_amount = 0
        
        # Apply add/deduct
        if add_deduct == "Deduct":
            tax_amount = -abs(tax_amount)
        
        # Update running total
        running_total += tax_amount
        total_tax_amount += tax_amount
        
        # Add to result
        calculated_taxes.append({
            "charge_type": charge_type,
            "account_head": tax_row.get("account_head", ""),
            "description": tax_row.get("description", ""),
            "rate": rate,
            "tax_amount": round(tax_amount, 2),
            "total": round(running_total, 2),
            "add_deduct_tax": add_deduct
        })
    
    return {
        "taxes": calculated_taxes,
        "total_taxes": round(total_tax_amount, 2),
        "grand_total": round(running_total, 2)
    }


def validate_tax_template(tax_template: Dict[str, Any]) -> Optional[str]:
    """
    Validate tax template structure.
    
    Args:
        tax_template: Tax template object to validate
    
    Returns:
        None if valid, error message string if invalid
    """
    if not tax_template:
        return "Tax template is required"
    
    if "taxes" not in tax_template:
        return "Tax template must have 'taxes' array"
    
    if not isinstance(tax_template["taxes"], list):
        return "Tax template 'taxes' must be an array"
    
    for idx, tax_row in enumerate(tax_template["taxes"]):
        if "charge_type" not in tax_row:
            return f"Tax row {idx}: 'charge_type' is required"
        
        if "account_head" not in tax_row:
            return f"Tax row {idx}: 'account_head' is required"
        
        rate = tax_row.get("rate", 0)
        if rate < 0 or rate > 100:
            return f"Tax row {idx}: rate must be between 0 and 100, got {rate}"
    
    return None


def calculate_tax_for_single_row(
    base_amount: float,
    rate: float,
    charge_type: str = "On Net Total",
    add_deduct: str = "Add"
) -> float:
    """
    Calculate tax for a single tax row.
    
    Args:
        base_amount: Amount to calculate tax on
        rate: Tax rate in percentage
        charge_type: Type of charge calculation
        add_deduct: "Add" or "Deduct"
    
    Returns:
        Calculated tax amount
    """
    if base_amount <= 0:
        return 0
    
    if rate < 0 or rate > 100:
        raise TaxValidationError(f"Tax rate must be between 0 and 100, got {rate}")
    
    tax_amount = (rate / 100) * base_amount
    
    if add_deduct == "Deduct":
        tax_amount = -abs(tax_amount)
    
    return round(tax_amount, 2)
