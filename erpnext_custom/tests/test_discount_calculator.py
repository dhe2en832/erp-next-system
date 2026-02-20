"""
Unit Tests for Discount Calculator Module

Tests discount calculation with percentage and amount inputs,
validation rules, and edge cases.

Requirements: 15.1
"""

import unittest
from erpnext_custom.discount_calculator import (
    calculate_discount,
    DiscountValidationError,
    validate_discount_input
)


class TestDiscountCalculator(unittest.TestCase):
    """Test cases for discount calculation"""
    
    def test_calculate_discount_with_percentage(self):
        """Test discount calculation using percentage"""
        result = calculate_discount(1000000, discount_percentage=10)
        
        self.assertEqual(result["discount_amount"], 100000.0)
        self.assertEqual(result["discount_percentage"], 10.0)
        self.assertEqual(result["net_total"], 900000.0)
    
    def test_calculate_discount_with_amount(self):
        """Test discount calculation using amount"""
        result = calculate_discount(1000000, discount_amount=150000)
        
        self.assertEqual(result["discount_amount"], 150000.0)
        self.assertEqual(result["discount_percentage"], 15.0)
        self.assertEqual(result["net_total"], 850000.0)
    
    def test_priority_rule_amount_over_percentage(self):
        """Test that discount_amount takes priority over discount_percentage"""
        # Both fields provided, amount should be used
        result = calculate_discount(
            1000000,
            discount_percentage=10,
            discount_amount=150000
        )
        
        self.assertEqual(result["discount_amount"], 150000.0)
        self.assertEqual(result["discount_percentage"], 15.0)
        self.assertEqual(result["net_total"], 850000.0)
    
    def test_no_discount(self):
        """Test calculation with no discount"""
        result = calculate_discount(1000000)
        
        self.assertEqual(result["discount_amount"], 0.0)
        self.assertEqual(result["discount_percentage"], 0.0)
        self.assertEqual(result["net_total"], 1000000.0)
    
    def test_zero_discount_percentage(self):
        """Test with explicit zero discount percentage"""
        result = calculate_discount(1000000, discount_percentage=0)
        
        self.assertEqual(result["discount_amount"], 0.0)
        self.assertEqual(result["discount_percentage"], 0.0)
        self.assertEqual(result["net_total"], 1000000.0)
    
    def test_100_percent_discount(self):
        """Test with 100% discount (edge case)"""
        result = calculate_discount(1000000, discount_percentage=100)
        
        self.assertEqual(result["discount_amount"], 1000000.0)
        self.assertEqual(result["discount_percentage"], 100.0)
        self.assertEqual(result["net_total"], 0.0)
    
    def test_discount_amount_equals_subtotal(self):
        """Test with discount amount equal to subtotal (edge case)"""
        result = calculate_discount(1000000, discount_amount=1000000)
        
        self.assertEqual(result["discount_amount"], 1000000.0)
        self.assertEqual(result["discount_percentage"], 100.0)
        self.assertEqual(result["net_total"], 0.0)
    
    def test_rounding_to_two_decimals(self):
        """Test that results are rounded to 2 decimal places"""
        result = calculate_discount(1000000, discount_percentage=10.555)
        
        # Should round to 2 decimals
        self.assertEqual(result["discount_amount"], 105550.0)
        self.assertEqual(result["discount_percentage"], 10.55)  # Rounds down
        self.assertEqual(result["net_total"], 894450.0)
    
    def test_invalid_subtotal_zero(self):
        """Test validation: subtotal must be greater than 0"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(0, discount_percentage=10)
        
        self.assertIn("Subtotal must be greater than 0", str(context.exception))
    
    def test_invalid_subtotal_negative(self):
        """Test validation: subtotal cannot be negative"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(-1000, discount_percentage=10)
        
        self.assertIn("Subtotal must be greater than 0", str(context.exception))
    
    def test_invalid_discount_percentage_negative(self):
        """Test validation: discount percentage cannot be negative"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(1000000, discount_percentage=-5)
        
        self.assertIn("must be between 0 and 100", str(context.exception))
    
    def test_invalid_discount_percentage_over_100(self):
        """Test validation: discount percentage cannot exceed 100"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(1000000, discount_percentage=150)
        
        self.assertIn("must be between 0 and 100", str(context.exception))
    
    def test_invalid_discount_amount_negative(self):
        """Test validation: discount amount cannot be negative"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(1000000, discount_amount=-50000)
        
        self.assertIn("cannot be negative", str(context.exception))
    
    def test_invalid_discount_amount_exceeds_subtotal(self):
        """Test validation: discount amount cannot exceed subtotal"""
        with self.assertRaises(DiscountValidationError) as context:
            calculate_discount(1000000, discount_amount=1500000)
        
        self.assertIn("cannot exceed subtotal", str(context.exception))
    
    def test_small_subtotal(self):
        """Test with small subtotal values"""
        result = calculate_discount(100, discount_percentage=10)
        
        self.assertEqual(result["discount_amount"], 10.0)
        self.assertEqual(result["discount_percentage"], 10.0)
        self.assertEqual(result["net_total"], 90.0)
    
    def test_large_subtotal(self):
        """Test with large subtotal values"""
        result = calculate_discount(1000000000, discount_percentage=5)
        
        self.assertEqual(result["discount_amount"], 50000000.0)
        self.assertEqual(result["discount_percentage"], 5.0)
        self.assertEqual(result["net_total"], 950000000.0)
    
    def test_fractional_discount_percentage(self):
        """Test with fractional discount percentage"""
        result = calculate_discount(1000000, discount_percentage=12.5)
        
        self.assertEqual(result["discount_amount"], 125000.0)
        self.assertEqual(result["discount_percentage"], 12.5)
        self.assertEqual(result["net_total"], 875000.0)
    
    def test_fractional_discount_amount(self):
        """Test with fractional discount amount"""
        result = calculate_discount(1000000, discount_amount=123456.78)
        
        self.assertEqual(result["discount_amount"], 123456.78)
        self.assertAlmostEqual(result["discount_percentage"], 12.35, places=2)
        self.assertEqual(result["net_total"], 876543.22)


class TestValidateDiscountInput(unittest.TestCase):
    """Test cases for discount input validation"""
    
    def test_valid_discount_percentage(self):
        """Test validation with valid discount percentage"""
        error = validate_discount_input(1000000, discount_percentage=10)
        self.assertIsNone(error)
    
    def test_valid_discount_amount(self):
        """Test validation with valid discount amount"""
        error = validate_discount_input(1000000, discount_amount=100000)
        self.assertIsNone(error)
    
    def test_invalid_returns_error_message(self):
        """Test that invalid input returns error message"""
        error = validate_discount_input(1000000, discount_percentage=150)
        self.assertIsNotNone(error)
        self.assertIn("must be between 0 and 100", error)
    
    def test_invalid_discount_amount_returns_error(self):
        """Test that invalid discount amount returns error message"""
        error = validate_discount_input(1000000, discount_amount=1500000)
        self.assertIsNotNone(error)
        self.assertIn("cannot exceed subtotal", error)


if __name__ == "__main__":
    unittest.main()
