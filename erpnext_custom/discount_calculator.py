"""
Discount Calculator Module

This module provides functions for calculating discounts on invoices.
Supports both percentage-based and amount-based discounts with proper validation.

Requirements: 5.1, 5.2, 5.4
"""

from typing import Dict, Union


class DiscountValidationError(Exception):
    """Exception raised for discount validation errors"""
    pass


def calculate_discount(
    subtotal: float,
    discount_percentage: float = 0,
    discount_amount: float = 0
) -> Dict[str, float]:
    """
    Calculate discount amount and percentage with validation.
    
    Priority: discount_amount > discount_percentage
    If both are provided, discount_amount takes precedence.
    
    Args:
        subtotal: Total amount before discount (must be > 0)
        discount_percentage: Discount in percentage (0-100, optional)
        discount_amount: Discount in currency amount (0-subtotal, optional)
    
    Returns:
        Dict containing:
            - discount_amount: Final discount amount
            - discount_percentage: Final discount percentage
            - net_total: Subtotal after discount
    
    Raises:
        DiscountValidationError: If validation fails
    
    Examples:
        >>> calculate_discount(1000000, discount_percentage=10)
        {'discount_amount': 100000.0, 'discount_percentage': 10.0, 'net_total': 900000.0}
        
        >>> calculate_discount(1000000, discount_amount=150000)
        {'discount_amount': 150000.0, 'discount_percentage': 15.0, 'net_total': 850000.0}
        
        >>> calculate_discount(1000000, discount_percentage=10, discount_amount=150000)
        {'discount_amount': 150000.0, 'discount_percentage': 15.0, 'net_total': 850000.0}
    """
    
    # Validation: Subtotal must be greater than 0
    if subtotal <= 0:
        raise DiscountValidationError("Subtotal must be greater than 0")
    
    # Validation: Discount percentage must be between 0 and 100
    if discount_percentage < 0 or discount_percentage > 100:
        raise DiscountValidationError(
            f"Discount percentage must be between 0 and 100, got {discount_percentage}"
        )
    
    # Validation: Discount amount must be between 0 and subtotal
    if discount_amount < 0:
        raise DiscountValidationError(
            f"Discount amount cannot be negative, got {discount_amount}"
        )
    
    if discount_amount > subtotal:
        raise DiscountValidationError(
            f"Discount amount ({discount_amount}) cannot exceed subtotal ({subtotal})"
        )
    
    # Calculate based on priority: discount_amount > discount_percentage
    if discount_amount > 0:
        # Use discount_amount as primary
        final_discount_amount = discount_amount
        final_discount_percentage = (discount_amount / subtotal) * 100
    elif discount_percentage > 0:
        # Use discount_percentage
        final_discount_amount = (discount_percentage / 100) * subtotal
        final_discount_percentage = discount_percentage
    else:
        # No discount
        final_discount_amount = 0
        final_discount_percentage = 0
    
    # Calculate net total
    net_total = subtotal - final_discount_amount
    
    return {
        "discount_amount": round(final_discount_amount, 2),
        "discount_percentage": round(final_discount_percentage, 2),
        "net_total": round(net_total, 2)
    }


def validate_discount_input(
    subtotal: float,
    discount_percentage: float = 0,
    discount_amount: float = 0
) -> Union[None, str]:
    """
    Validate discount input without calculating.
    
    Args:
        subtotal: Total amount before discount
        discount_percentage: Discount in percentage
        discount_amount: Discount in currency amount
    
    Returns:
        None if valid, error message string if invalid
    """
    try:
        calculate_discount(subtotal, discount_percentage, discount_amount)
        return None
    except DiscountValidationError as e:
        return str(e)
