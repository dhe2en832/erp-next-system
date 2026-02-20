"""
Unit Tests for Tax Calculator Module

Tests tax calculation with single and multiple tax rows,
different charge types, and add/deduct options.

Requirements: 15.2
"""

import unittest
from erpnext_custom.tax_calculator import (
    calculate_taxes,
    TaxValidationError,
    validate_tax_template,
    calculate_tax_for_single_row
)


class TestTaxCalculator(unittest.TestCase):
    """Test cases for tax calculation"""
    
    def test_calculate_taxes_with_single_tax_row(self):
        """Test tax calculation with single tax row (PPN 11%)"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "description": "PPN 11%",
                "rate": 11
            }]
        }
        
        result = calculate_taxes(900000, tax_template)
        
        self.assertEqual(len(result["taxes"]), 1)
        self.assertEqual(result["taxes"][0]["tax_amount"], 99000.0)
        self.assertEqual(result["taxes"][0]["total"], 999000.0)
        self.assertEqual(result["total_taxes"], 99000.0)
        self.assertEqual(result["grand_total"], 999000.0)
    
    def test_calculate_taxes_with_multiple_tax_rows(self):
        """Test tax calculation with multiple tax rows (PPN + PPh 23)"""
        tax_template = {
            "taxes": [
                {
                    "charge_type": "On Net Total",
                    "account_head": "2210 - Hutang PPN",
                    "description": "PPN 11%",
                    "rate": 11,
                    "add_deduct_tax": "Add"
                },
                {
                    "charge_type": "On Net Total",
                    "account_head": "2230 - Hutang PPh 23",
                    "description": "PPh 23 (2%)",
                    "rate": 2,
                    "add_deduct_tax": "Deduct"
                }
            ]
        }
        
        result = calculate_taxes(900000, tax_template)
        
        self.assertEqual(len(result["taxes"]), 2)
        # PPN: 11% of 900000 = 99000
        self.assertEqual(result["taxes"][0]["tax_amount"], 99000.0)
        self.assertEqual(result["taxes"][0]["total"], 999000.0)
        # PPh 23: -2% of 900000 = -18000
        self.assertEqual(result["taxes"][1]["tax_amount"], -18000.0)
        self.assertEqual(result["taxes"][1]["total"], 981000.0)
        # Total taxes: 99000 - 18000 = 81000
        self.assertEqual(result["total_taxes"], 81000.0)
        self.assertEqual(result["grand_total"], 981000.0)
    
    def test_charge_type_on_net_total(self):
        """Test charge_type: On Net Total"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 10
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        # 10% of 1000000 = 100000
        self.assertEqual(result["taxes"][0]["tax_amount"], 100000.0)
    
    def test_charge_type_on_previous_row_total(self):
        """Test charge_type: On Previous Row Total"""
        tax_template = {
            "taxes": [
                {
                    "charge_type": "On Net Total",
                    "account_head": "2210 - Hutang PPN",
                    "rate": 10,
                    "add_deduct_tax": "Add"
                },
                {
                    "charge_type": "On Previous Row Total",
                    "account_head": "2220 - Tax on Tax",
                    "rate": 5,
                    "add_deduct_tax": "Add"
                }
            ]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        # First tax: 10% of 1000000 = 100000, running total = 1100000
        self.assertEqual(result["taxes"][0]["tax_amount"], 100000.0)
        self.assertEqual(result["taxes"][0]["total"], 1100000.0)
        # Second tax: 5% of 1100000 = 55000, running total = 1155000
        self.assertEqual(result["taxes"][1]["tax_amount"], 55000.0)
        self.assertEqual(result["taxes"][1]["total"], 1155000.0)
        self.assertEqual(result["grand_total"], 1155000.0)
    
    def test_charge_type_actual(self):
        """Test charge_type: Actual (fixed amount)"""
        tax_template = {
            "taxes": [{
                "charge_type": "Actual",
                "account_head": "2210 - Fixed Tax",
                "tax_amount": 50000
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        # Fixed amount regardless of net_total
        self.assertEqual(result["taxes"][0]["tax_amount"], 50000.0)
        self.assertEqual(result["grand_total"], 1050000.0)
    
    def test_add_deduct_tax_add(self):
        """Test add_deduct_tax: Add (increases grand total)"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 10,
                "add_deduct_tax": "Add"
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        self.assertEqual(result["taxes"][0]["tax_amount"], 100000.0)
        self.assertEqual(result["grand_total"], 1100000.0)
    
    def test_add_deduct_tax_deduct(self):
        """Test add_deduct_tax: Deduct (decreases grand total)"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2230 - Hutang PPh 23",
                "rate": 2,
                "add_deduct_tax": "Deduct"
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        # Deduct: tax_amount is negative
        self.assertEqual(result["taxes"][0]["tax_amount"], -20000.0)
        self.assertEqual(result["grand_total"], 980000.0)
    
    def test_no_tax_template(self):
        """Test with no tax template (None)"""
        result = calculate_taxes(1000000, None)
        
        self.assertEqual(result["taxes"], [])
        self.assertEqual(result["total_taxes"], 0)
        self.assertEqual(result["grand_total"], 1000000)
    
    def test_empty_tax_template(self):
        """Test with empty tax template"""
        tax_template = {"taxes": []}
        
        result = calculate_taxes(1000000, tax_template)
        
        self.assertEqual(result["taxes"], [])
        self.assertEqual(result["total_taxes"], 0)
        self.assertEqual(result["grand_total"], 1000000)
    
    def test_zero_rate_tax(self):
        """Test with zero rate tax"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Zero Tax",
                "rate": 0
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        self.assertEqual(result["taxes"][0]["tax_amount"], 0.0)
        self.assertEqual(result["grand_total"], 1000000.0)
    
    def test_invalid_net_total_zero(self):
        """Test validation: net total must be greater than 0"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 11
            }]
        }
        
        with self.assertRaises(TaxValidationError) as context:
            calculate_taxes(0, tax_template)
        
        self.assertIn("Net total must be greater than 0", str(context.exception))
    
    def test_invalid_net_total_negative(self):
        """Test validation: net total cannot be negative"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 11
            }]
        }
        
        with self.assertRaises(TaxValidationError) as context:
            calculate_taxes(-1000, tax_template)
        
        self.assertIn("Net total must be greater than 0", str(context.exception))
    
    def test_invalid_tax_rate_negative(self):
        """Test validation: tax rate cannot be negative"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": -5
            }]
        }
        
        with self.assertRaises(TaxValidationError) as context:
            calculate_taxes(1000000, tax_template)
        
        self.assertIn("must be between 0 and 100", str(context.exception))
    
    def test_invalid_tax_rate_over_100(self):
        """Test validation: tax rate cannot exceed 100"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 150
            }]
        }
        
        with self.assertRaises(TaxValidationError) as context:
            calculate_taxes(1000000, tax_template)
        
        self.assertIn("must be between 0 and 100", str(context.exception))
    
    def test_rounding_to_two_decimals(self):
        """Test that results are rounded to 2 decimal places"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 11.555
            }]
        }
        
        result = calculate_taxes(1000000, tax_template)
        
        # Should round to 2 decimals
        self.assertEqual(result["taxes"][0]["tax_amount"], 115550.0)
        self.assertEqual(result["grand_total"], 1115550.0)


class TestValidateTaxTemplate(unittest.TestCase):
    """Test cases for tax template validation"""
    
    def test_valid_tax_template(self):
        """Test validation with valid tax template"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 11
            }]
        }
        
        error = validate_tax_template(tax_template)
        self.assertIsNone(error)
    
    def test_missing_tax_template(self):
        """Test validation with missing tax template"""
        error = validate_tax_template(None)
        self.assertIsNotNone(error)
        self.assertIn("Tax template is required", error)
    
    def test_missing_taxes_array(self):
        """Test validation with missing taxes array"""
        tax_template = {"name": "Test"}  # Has content but no taxes array
        
        error = validate_tax_template(tax_template)
        self.assertIsNotNone(error)
        self.assertIn("must have 'taxes' array", error)
    
    def test_taxes_not_array(self):
        """Test validation with taxes not being an array"""
        tax_template = {"taxes": "not an array"}
        
        error = validate_tax_template(tax_template)
        self.assertIsNotNone(error)
        self.assertIn("must be an array", error)
    
    def test_missing_charge_type(self):
        """Test validation with missing charge_type"""
        tax_template = {
            "taxes": [{
                "account_head": "2210 - Hutang PPN",
                "rate": 11
            }]
        }
        
        error = validate_tax_template(tax_template)
        self.assertIsNotNone(error)
        self.assertIn("'charge_type' is required", error)
    
    def test_missing_account_head(self):
        """Test validation with missing account_head"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "rate": 11
            }]
        }
        
        error = validate_tax_template(tax_template)
        self.assertIsNotNone(error)
        self.assertIn("'account_head' is required", error)
    
    def test_invalid_rate_in_template(self):
        """Test validation with invalid rate"""
        tax_template = {
            "taxes": [{
                "charge_type": "On Net Total",
                "account_head": "2210 - Hutang PPN",
                "rate": 150
            }]
        }
        
        error = validate_tax_template(tax_template)
        self.assertIsNotNone(error)
        self.assertIn("must be between 0 and 100", error)


class TestCalculateTaxForSingleRow(unittest.TestCase):
    """Test cases for single tax row calculation"""
    
    def test_calculate_single_tax_row(self):
        """Test calculation for single tax row"""
        tax_amount = calculate_tax_for_single_row(1000000, 10)
        self.assertEqual(tax_amount, 100000.0)
    
    def test_calculate_with_deduct(self):
        """Test calculation with deduct option"""
        tax_amount = calculate_tax_for_single_row(1000000, 2, add_deduct="Deduct")
        self.assertEqual(tax_amount, -20000.0)
    
    def test_zero_base_amount(self):
        """Test with zero base amount"""
        tax_amount = calculate_tax_for_single_row(0, 10)
        self.assertEqual(tax_amount, 0)
    
    def test_invalid_rate_single_row(self):
        """Test validation with invalid rate"""
        with self.assertRaises(TaxValidationError):
            calculate_tax_for_single_row(1000000, 150)


if __name__ == "__main__":
    unittest.main()
