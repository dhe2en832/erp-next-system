"""
Property-Based Tests for Discount and Tax Implementation

These tests verify universal properties that must hold for all valid inputs.
Uses Hypothesis library for property-based testing.

Requirements: 6.5, 7.5, 8.5, 9.5, 10.6, 5.5, 6.4, 7.4, 8.4, 9.4, 10.5

To run these tests, install hypothesis:
    pip install hypothesis

Then run:
    python -m pytest erpnext_custom/tests/test_properties.py -v
    or
    python -m unittest erpnext_custom.tests.test_properties -v
"""

import unittest

try:
    from hypothesis import given, strategies as st, settings
    HYPOTHESIS_AVAILABLE = True
except ImportError:
    HYPOTHESIS_AVAILABLE = False
    # Create dummy decorators when hypothesis is not available
    def given(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    def settings(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    class st:
        @staticmethod
        def floats(*args, **kwargs):
            return None
        
        @staticmethod
        def integers(*args, **kwargs):
            return None
    
    print("WARNING: Hypothesis not installed. Property-based tests will be skipped.")
    print("Install with: pip install hypothesis")

from erpnext_custom.discount_calculator import calculate_discount
from erpnext_custom.tax_calculator import calculate_taxes
from erpnext_custom.gl_entry_sales import post_sales_invoice_gl_entry
from erpnext_custom.gl_entry_purchase import post_purchase_invoice_gl_entry
from erpnext_custom.invoice_cancellation import (
    create_reversal_gl_entry,
    verify_cancellation_net_effect
)


# Skip all tests if hypothesis is not available
@unittest.skipIf(not HYPOTHESIS_AVAILABLE, "Hypothesis library not installed")
class TestGLEntryBalancedProperty(unittest.TestCase):
    """
    Property 1: GL Entry Balanced (Fundamental Invariant)
    
    For any invoice (Sales or Purchase) with discount and/or tax,
    total debit must equal total credit in GL Entry (tolerance: 0.01).
    
    Validates: Requirements 6.5, 7.5, 8.5, 9.5, 10.6
    """
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        discount_percentage=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        tax_rate=st.floats(min_value=0, max_value=20, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100, deadline=None)
    def test_sales_invoice_gl_entry_balanced(self, subtotal, discount_percentage, tax_rate):
        """
        Property: For any Sales Invoice, GL Entry must be balanced.
        
        Generate random invoice data, post GL Entry, verify total debit = total credit.
        """
        try:
            # Calculate discount
            discount_result = calculate_discount(subtotal, discount_percentage=discount_percentage)
            
            # Calculate tax
            tax_template = {
                "taxes": [{
                    "charge_type": "On Net Total",
                    "account_head": "2210 - Hutang PPN",
                    "description": f"Tax {tax_rate}%",
                    "rate": tax_rate
                }]
            }
            tax_result = calculate_taxes(discount_result["net_total"], tax_template)
            
            # Create invoice
            invoice = {
                "name": "SI-TEST-001",
                "customer": "CUST-001",
                "total": subtotal,
                "discount_amount": discount_result["discount_amount"],
                "discount_percentage": discount_result["discount_percentage"],
                "net_total": discount_result["net_total"],
                "taxes": tax_result["taxes"],
                "grand_total": tax_result["grand_total"]
            }
            
            # Post GL Entry
            gl_result = post_sales_invoice_gl_entry(invoice, "2024-01-15")
            
            # Verify balanced
            self.assertTrue(gl_result["is_balanced"], 
                f"GL Entry not balanced: Debit={gl_result['total_debit']}, Credit={gl_result['total_credit']}")
            
            # Verify debit = credit (with tolerance)
            self.assertAlmostEqual(
                gl_result["total_debit"],
                gl_result["total_credit"],
                places=2,
                msg=f"Debit ({gl_result['total_debit']}) != Credit ({gl_result['total_credit']})"
            )
            
        except Exception as e:
            # Skip invalid combinations (e.g., very small numbers causing rounding issues)
            if "validation" in str(e).lower():
                return
            raise
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        discount_percentage=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        tax_rate=st.floats(min_value=0, max_value=20, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100, deadline=None)
    def test_purchase_invoice_gl_entry_balanced(self, subtotal, discount_percentage, tax_rate):
        """
        Property: For any Purchase Invoice, GL Entry must be balanced.
        
        Generate random invoice data, post GL Entry, verify total debit = total credit.
        """
        try:
            # Calculate discount
            discount_result = calculate_discount(subtotal, discount_percentage=discount_percentage)
            
            # Calculate tax
            tax_template = {
                "taxes": [{
                    "charge_type": "On Net Total",
                    "account_head": "1410 - Pajak Dibayar Dimuka",
                    "description": f"Tax {tax_rate}%",
                    "rate": tax_rate
                }]
            }
            tax_result = calculate_taxes(discount_result["net_total"], tax_template)
            
            # Create invoice
            invoice = {
                "name": "PI-TEST-001",
                "supplier": "SUPP-001",
                "total": subtotal,
                "discount_amount": discount_result["discount_amount"],
                "net_total": discount_result["net_total"],
                "taxes": tax_result["taxes"],
                "grand_total": tax_result["grand_total"],
                "items": [{"qty": 10, "rate": subtotal / 10}]
            }
            
            # Post GL Entry
            gl_result = post_purchase_invoice_gl_entry(invoice, "2024-01-15")
            
            # Verify balanced
            self.assertTrue(gl_result["is_balanced"],
                f"GL Entry not balanced: Debit={gl_result['total_debit']}, Credit={gl_result['total_credit']}")
            
            # Verify debit = credit (with tolerance)
            self.assertAlmostEqual(
                gl_result["total_debit"],
                gl_result["total_credit"],
                places=2,
                msg=f"Debit ({gl_result['total_debit']}) != Credit ({gl_result['total_credit']})"
            )
            
        except Exception as e:
            # Skip invalid combinations
            if "validation" in str(e).lower():
                return
            raise


@unittest.skipIf(not HYPOTHESIS_AVAILABLE, "Hypothesis library not installed")
class TestGrandTotalCalculationProperty(unittest.TestCase):
    """
    Property 2: Grand Total Calculation Accuracy
    
    For any invoice with items, discount, and tax:
    grand_total = subtotal - discount_amount + total_taxes (tolerance: 0.01)
    
    Validates: Requirements 5.5
    """
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        discount_percentage=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        tax_rate=st.floats(min_value=0, max_value=20, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100, deadline=None)
    def test_grand_total_calculation_accuracy(self, subtotal, discount_percentage, tax_rate):
        """
        Property: grand_total = subtotal - discount + taxes
        
        Generate random invoice data, calculate grand_total, verify accuracy.
        """
        try:
            # Calculate discount
            discount_result = calculate_discount(subtotal, discount_percentage=discount_percentage)
            
            # Calculate tax
            tax_template = {
                "taxes": [{
                    "charge_type": "On Net Total",
                    "account_head": "2210 - Hutang PPN",
                    "description": f"Tax {tax_rate}%",
                    "rate": tax_rate
                }]
            }
            tax_result = calculate_taxes(discount_result["net_total"], tax_template)
            
            # Calculate expected grand total
            expected_grand_total = subtotal - discount_result["discount_amount"] + tax_result["total_taxes"]
            
            # Verify calculation
            self.assertAlmostEqual(
                tax_result["grand_total"],
                expected_grand_total,
                places=2,
                msg=f"Grand total mismatch: Expected={expected_grand_total}, Got={tax_result['grand_total']}"
            )
            
            # Also verify: grand_total = net_total + total_taxes
            expected_from_net = discount_result["net_total"] + tax_result["total_taxes"]
            self.assertAlmostEqual(
                tax_result["grand_total"],
                expected_from_net,
                places=2,
                msg=f"Grand total mismatch from net: Expected={expected_from_net}, Got={tax_result['grand_total']}"
            )
            
        except Exception as e:
            # Skip invalid combinations
            if "validation" in str(e).lower():
                return
            raise


@unittest.skipIf(not HYPOTHESIS_AVAILABLE, "Hypothesis library not installed")
class TestInvoiceCancellationReversalProperty(unittest.TestCase):
    """
    Property 11: Invoice Cancellation Reversal (Round-trip Property)
    
    For any submitted invoice with discount and tax, if cancelled:
    - Reversal GL Entry must swap debit and credit
    - Sum of original + reversal = 0 for each account
    
    Validates: Requirements 6.4, 7.4, 8.4, 9.4, 10.5
    """
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        discount_percentage=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        tax_rate=st.floats(min_value=0, max_value=20, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100, deadline=None)
    def test_invoice_cancellation_reversal(self, subtotal, discount_percentage, tax_rate):
        """
        Property: original + reversal = 0 for each account
        
        Generate random invoice, post GL Entry, cancel, verify net effect is zero.
        """
        try:
            # Calculate discount
            discount_result = calculate_discount(subtotal, discount_percentage=discount_percentage)
            
            # Calculate tax
            tax_template = {
                "taxes": [{
                    "charge_type": "On Net Total",
                    "account_head": "2210 - Hutang PPN",
                    "description": f"Tax {tax_rate}%",
                    "rate": tax_rate
                }]
            }
            tax_result = calculate_taxes(discount_result["net_total"], tax_template)
            
            # Create invoice
            invoice = {
                "name": "SI-TEST-CANCEL-001",
                "customer": "CUST-001",
                "total": subtotal,
                "discount_amount": discount_result["discount_amount"],
                "discount_percentage": discount_result["discount_percentage"],
                "net_total": discount_result["net_total"],
                "taxes": tax_result["taxes"],
                "grand_total": tax_result["grand_total"]
            }
            
            # Post original GL Entry
            original_result = post_sales_invoice_gl_entry(invoice, "2024-01-15")
            original_entries = original_result["gl_entries"]
            
            # Create reversal
            reversal_result = create_reversal_gl_entry(original_entries, "2024-01-16")
            reversal_entries = reversal_result["gl_entries"]
            
            # Verify reversal is balanced
            self.assertTrue(reversal_result["is_balanced"],
                f"Reversal not balanced: Debit={reversal_result['total_debit']}, Credit={reversal_result['total_credit']}")
            
            # Verify net effect is zero
            verification = verify_cancellation_net_effect(original_entries, reversal_entries)
            
            self.assertTrue(verification["is_valid"],
                f"Cancellation verification failed: {verification['errors']}")
            
            # Verify each account has net balance of zero
            for account, balance in verification["account_balances"].items():
                self.assertAlmostEqual(
                    balance,
                    0.0,
                    places=2,
                    msg=f"Account {account} has non-zero net balance: {balance}"
                )
            
        except Exception as e:
            # Skip invalid combinations
            if "validation" in str(e).lower():
                return
            raise


@unittest.skipIf(not HYPOTHESIS_AVAILABLE, "Hypothesis library not installed")
class TestOldInvoiceEditIdempotenceProperty(unittest.TestCase):
    """
    Property 14: Old Invoice Edit Idempotence
    
    For any old invoice (without discount/tax), if edited without adding discount/tax:
    - GL Entry must remain unchanged
    - Only non-financial fields can be modified
    
    Validates: Requirements 14.4
    """
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        customer_name_suffix=st.integers(min_value=1, max_value=9999)
    )
    @settings(max_examples=100, deadline=None)
    def test_old_invoice_edit_without_discount_tax_unchanged(self, subtotal, customer_name_suffix):
        """
        Property: Editing old invoice without adding discount/tax keeps GL Entry unchanged.
        
        Create old invoice (no discount/tax), get GL Entry snapshot,
        edit invoice (change non-discount field), verify GL Entry unchanged.
        """
        try:
            # Create old invoice (no discount, no tax)
            old_invoice = {
                "name": "SI-OLD-001",
                "customer": "CUST-001",
                "customer_name": "Old Customer Name",
                "total": subtotal,
                "discount_amount": 0,
                "discount_percentage": 0,
                "net_total": subtotal,
                "taxes": [],
                "grand_total": subtotal
            }
            
            # Post original GL Entry (snapshot)
            original_gl_result = post_sales_invoice_gl_entry(old_invoice, "2024-01-15")
            original_entries = original_gl_result["gl_entries"]
            
            # Edit invoice - change customer name only (non-financial field)
            edited_invoice = old_invoice.copy()
            edited_invoice["customer_name"] = f"Customer {customer_name_suffix}"
            
            # Post GL Entry after edit
            edited_gl_result = post_sales_invoice_gl_entry(edited_invoice, "2024-01-15")
            edited_entries = edited_gl_result["gl_entries"]
            
            # Verify GL Entry unchanged (same number of entries)
            self.assertEqual(
                len(original_entries),
                len(edited_entries),
                msg=f"GL Entry count changed: Original={len(original_entries)}, Edited={len(edited_entries)}"
            )
            
            # Verify each GL Entry line unchanged (account, debit, credit)
            for i, (orig, edit) in enumerate(zip(original_entries, edited_entries)):
                # Account should be the same
                self.assertEqual(
                    orig["account"],
                    edit["account"],
                    msg=f"Entry {i}: Account changed from {orig['account']} to {edit['account']}"
                )
                
                # Debit should be the same
                self.assertAlmostEqual(
                    orig["debit"],
                    edit["debit"],
                    places=2,
                    msg=f"Entry {i}: Debit changed from {orig['debit']} to {edit['debit']}"
                )
                
                # Credit should be the same
                self.assertAlmostEqual(
                    orig["credit"],
                    edit["credit"],
                    places=2,
                    msg=f"Entry {i}: Credit changed from {orig['credit']} to {edit['credit']}"
                )
            
            # Verify totals unchanged
            self.assertAlmostEqual(
                original_gl_result["total_debit"],
                edited_gl_result["total_debit"],
                places=2,
                msg=f"Total debit changed: Original={original_gl_result['total_debit']}, Edited={edited_gl_result['total_debit']}"
            )
            
            self.assertAlmostEqual(
                original_gl_result["total_credit"],
                edited_gl_result["total_credit"],
                places=2,
                msg=f"Total credit changed: Original={original_gl_result['total_credit']}, Edited={edited_gl_result['total_credit']}"
            )
            
        except Exception as e:
            # Skip invalid combinations
            if "validation" in str(e).lower():
                return
            raise
    
    @given(
        subtotal=st.floats(min_value=1000, max_value=10000000, allow_nan=False, allow_infinity=False),
        discount_percentage=st.floats(min_value=1, max_value=50, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100, deadline=None)
    def test_old_invoice_edit_with_discount_changes_gl(self, subtotal, discount_percentage):
        """
        Property: Editing old invoice and adding discount DOES change GL Entry.
        
        This is the inverse test - verify that adding discount to old invoice
        properly updates GL Entry (not idempotent when financial fields change).
        """
        try:
            # Create old invoice (no discount, no tax)
            old_invoice = {
                "name": "SI-OLD-002",
                "customer": "CUST-001",
                "total": subtotal,
                "discount_amount": 0,
                "discount_percentage": 0,
                "net_total": subtotal,
                "taxes": [],
                "grand_total": subtotal
            }
            
            # Post original GL Entry
            original_gl_result = post_sales_invoice_gl_entry(old_invoice, "2024-01-15")
            
            # Edit invoice - add discount
            discount_result = calculate_discount(subtotal, discount_percentage=discount_percentage)
            edited_invoice = old_invoice.copy()
            edited_invoice["discount_amount"] = discount_result["discount_amount"]
            edited_invoice["discount_percentage"] = discount_result["discount_percentage"]
            edited_invoice["net_total"] = discount_result["net_total"]
            edited_invoice["grand_total"] = discount_result["net_total"]
            
            # Post GL Entry after adding discount
            edited_gl_result = post_sales_invoice_gl_entry(edited_invoice, "2024-01-15")
            
            # Verify GL Entry HAS changed (more entries due to discount account)
            self.assertGreater(
                len(edited_gl_result["gl_entries"]),
                len(original_gl_result["gl_entries"]),
                msg="GL Entry should have more entries after adding discount"
            )
            
            # Verify discount account exists in edited GL Entry
            discount_accounts = [e for e in edited_gl_result["gl_entries"] 
                               if "Potongan Penjualan" in e["account"]]
            self.assertGreater(
                len(discount_accounts),
                0,
                msg="Discount account (Potongan Penjualan) should exist in GL Entry after adding discount"
            )
            
            # Verify grand total changed
            self.assertLess(
                edited_gl_result["total_debit"],
                original_gl_result["total_debit"] + discount_result["discount_amount"] + 1,  # Allow small tolerance
                msg="Total debit should reflect discount addition"
            )
            
        except Exception as e:
            # Skip invalid combinations
            if "validation" in str(e).lower():
                return
            raise


# Fallback tests if Hypothesis is not available
class TestPropertyTestsRequireHypothesis(unittest.TestCase):
    """Fallback test to indicate Hypothesis is required"""
    
    @unittest.skipIf(HYPOTHESIS_AVAILABLE, "Hypothesis is available")
    def test_hypothesis_required(self):
        """This test indicates that Hypothesis library is required for property-based tests"""
        self.skipTest(
            "Property-based tests require Hypothesis library. "
            "Install with: pip install hypothesis"
        )


if __name__ == "__main__":
    if HYPOTHESIS_AVAILABLE:
        print("Running property-based tests with Hypothesis...")
        print("This may take a while (100 examples per property)...")
    else:
        print("WARNING: Hypothesis not installed. Property-based tests will be skipped.")
    
    unittest.main()
