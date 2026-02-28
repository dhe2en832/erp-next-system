"""
Unit Tests for Credit Note Commission Adjustment

Tests the commission adjustment logic when Credit Notes are submitted or cancelled.

Requirements: 7.3, 7.4
"""

import unittest
from unittest.mock import Mock, MagicMock, patch
from erpnext_custom.credit_note_commission import (
    calculate_commission_adjustment,
    validate_commission_adjustment,
    on_credit_note_submit,
    on_credit_note_cancel
)


class TestCalculateCommissionAdjustment(unittest.TestCase):
    """Test commission adjustment calculation"""
    
    def test_calculate_single_item_commission(self):
        """Test commission calculation with single item"""
        credit_note = Mock()
        credit_note.items = [
            Mock(custom_komisi_sales=-50000)
        ]
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, -50000.0)
    
    def test_calculate_multiple_items_commission(self):
        """Test commission calculation with multiple items"""
        credit_note = Mock()
        credit_note.items = [
            Mock(custom_komisi_sales=-30000),
            Mock(custom_komisi_sales=-20000),
            Mock(custom_komisi_sales=-15000)
        ]
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, -65000.0)
    
    def test_calculate_zero_commission(self):
        """Test commission calculation with zero commission"""
        credit_note = Mock()
        credit_note.items = [
            Mock(custom_komisi_sales=0)
        ]
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, 0.0)
    
    def test_calculate_no_items(self):
        """Test commission calculation with no items"""
        credit_note = Mock()
        credit_note.items = []
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, 0.0)
    
    def test_calculate_missing_items_attribute(self):
        """Test commission calculation when items attribute is missing"""
        credit_note = Mock(spec=[])
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, 0.0)
    
    def test_calculate_rounding(self):
        """Test commission calculation with rounding"""
        credit_note = Mock()
        credit_note.items = [
            Mock(custom_komisi_sales=-33333.333),
            Mock(custom_komisi_sales=-22222.222)
        ]
        
        result = calculate_commission_adjustment(credit_note)
        self.assertEqual(result, -55555.56)  # Rounded to 2 decimals


class TestValidateCommissionAdjustment(unittest.TestCase):
    """Test commission adjustment validation"""
    
    def test_valid_adjustment(self):
        """Test valid commission adjustment"""
        original_invoice = Mock()
        original_invoice.get = Mock(return_value=100000)
        
        credit_note = Mock()
        credit_note.get = Mock(return_value=-30000)
        
        result = validate_commission_adjustment(original_invoice, credit_note)
        
        self.assertTrue(result["valid"])
        self.assertEqual(result["original_commission"], 100000)
        self.assertEqual(result["adjustment"], -30000)
        self.assertEqual(result["new_commission"], 70000)
        self.assertEqual(result["message"], "")
    
    def test_adjustment_resulting_in_negative(self):
        """Test adjustment that would result in negative commission"""
        original_invoice = Mock()
        original_invoice.get = Mock(return_value=50000)
        
        credit_note = Mock()
        credit_note.get = Mock(return_value=-80000)
        
        result = validate_commission_adjustment(original_invoice, credit_note)
        
        self.assertFalse(result["valid"])
        self.assertIn("negative commission", result["message"])
        self.assertEqual(result["new_commission"], -30000)
    
    def test_positive_credit_note_commission(self):
        """Test validation fails when Credit Note has positive commission"""
        original_invoice = Mock()
        original_invoice.get = Mock(return_value=100000)
        
        credit_note = Mock()
        credit_note.get = Mock(return_value=30000)  # Positive (invalid)
        
        result = validate_commission_adjustment(original_invoice, credit_note)
        
        self.assertFalse(result["valid"])
        self.assertIn("should be negative or zero", result["message"])
    
    def test_zero_commission_adjustment(self):
        """Test valid adjustment with zero commission"""
        original_invoice = Mock()
        original_invoice.get = Mock(return_value=100000)
        
        credit_note = Mock()
        credit_note.get = Mock(return_value=0)
        
        result = validate_commission_adjustment(original_invoice, credit_note)
        
        self.assertTrue(result["valid"])
        self.assertEqual(result["new_commission"], 100000)
    
    def test_full_commission_reversal(self):
        """Test adjustment that reverses full commission"""
        original_invoice = Mock()
        original_invoice.get = Mock(return_value=100000)
        
        credit_note = Mock()
        credit_note.get = Mock(return_value=-100000)
        
        result = validate_commission_adjustment(original_invoice, credit_note)
        
        self.assertTrue(result["valid"])
        self.assertEqual(result["new_commission"], 0)


class TestOnCreditNoteSubmit(unittest.TestCase):
    """Test Credit Note submit hook"""
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_submit_regular_invoice_skips_adjustment(self, mock_frappe):
        """Test that regular invoice (not Credit Note) skips adjustment"""
        doc = Mock()
        doc.is_return = 0
        doc.name = "SI-2024-00001"
        
        on_credit_note_submit(doc)
        
        # Should not call frappe.get_doc
        mock_frappe.get_doc.assert_not_called()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_submit_credit_note_adjusts_commission(self, mock_frappe):
        """Test Credit Note submit adjusts original invoice commission"""
        # Setup Credit Note
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = "SI-2024-00001"
        credit_note.name = "CN-2024-00001"
        credit_note.get = Mock(return_value=-50000)
        credit_note.add_comment = Mock()
        
        # Setup original invoice
        original_invoice = Mock()
        original_invoice.name = "SI-2024-00001"
        original_invoice.get = Mock(return_value=100000)
        original_invoice.custom_total_komisi_sales = 100000
        original_invoice.flags = Mock()
        original_invoice.save = Mock()
        original_invoice.add_comment = Mock()
        
        mock_frappe.get_doc = Mock(return_value=original_invoice)
        mock_frappe.logger = Mock(return_value=Mock(info=Mock()))
        
        # Execute
        on_credit_note_submit(credit_note)
        
        # Verify original invoice was updated
        self.assertEqual(original_invoice.custom_total_komisi_sales, 50000)
        original_invoice.save.assert_called_once_with(ignore_permissions=True)
        
        # Verify comments were added
        original_invoice.add_comment.assert_called_once()
        credit_note.add_comment.assert_called_once()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_submit_credit_note_no_return_against(self, mock_frappe):
        """Test Credit Note without return_against logs error"""
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = None
        credit_note.name = "CN-2024-00001"
        
        mock_frappe.log_error = Mock()
        
        on_credit_note_submit(credit_note)
        
        # Should log error
        mock_frappe.log_error.assert_called_once()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_submit_credit_note_original_not_found(self, mock_frappe):
        """Test Credit Note when original invoice not found"""
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = "SI-2024-00001"
        credit_note.name = "CN-2024-00001"
        
        mock_frappe.get_doc = Mock(side_effect=mock_frappe.DoesNotExistError)
        mock_frappe.throw = Mock()
        
        on_credit_note_submit(credit_note)
        
        # Should throw error
        mock_frappe.throw.assert_called_once()


class TestOnCreditNoteCancel(unittest.TestCase):
    """Test Credit Note cancel hook"""
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_cancel_regular_invoice_skips_reversal(self, mock_frappe):
        """Test that regular invoice (not Credit Note) skips reversal"""
        doc = Mock()
        doc.is_return = 0
        doc.name = "SI-2024-00001"
        
        on_credit_note_cancel(doc)
        
        # Should not call frappe.get_doc
        mock_frappe.get_doc.assert_not_called()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_cancel_credit_note_reverses_commission(self, mock_frappe):
        """Test Credit Note cancel reverses commission adjustment"""
        # Setup Credit Note
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = "SI-2024-00001"
        credit_note.name = "CN-2024-00001"
        credit_note.get = Mock(return_value=-50000)
        credit_note.add_comment = Mock()
        
        # Setup original invoice (already adjusted)
        original_invoice = Mock()
        original_invoice.name = "SI-2024-00001"
        original_invoice.get = Mock(return_value=50000)  # Already reduced
        original_invoice.custom_total_komisi_sales = 50000
        original_invoice.flags = Mock()
        original_invoice.save = Mock()
        original_invoice.add_comment = Mock()
        
        mock_frappe.get_doc = Mock(return_value=original_invoice)
        mock_frappe.logger = Mock(return_value=Mock(info=Mock()))
        
        # Execute
        on_credit_note_cancel(credit_note)
        
        # Verify original invoice was restored
        self.assertEqual(original_invoice.custom_total_komisi_sales, 100000)
        original_invoice.save.assert_called_once_with(ignore_permissions=True)
        
        # Verify comments were added
        original_invoice.add_comment.assert_called_once()
        credit_note.add_comment.assert_called_once()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_cancel_credit_note_no_return_against(self, mock_frappe):
        """Test Credit Note cancel without return_against logs error"""
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = None
        credit_note.name = "CN-2024-00001"
        
        mock_frappe.log_error = Mock()
        
        on_credit_note_cancel(credit_note)
        
        # Should log error
        mock_frappe.log_error.assert_called_once()
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_cancel_handles_exception_gracefully(self, mock_frappe):
        """Test that exceptions don't block cancellation"""
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = "SI-2024-00001"
        credit_note.name = "CN-2024-00001"
        
        mock_frappe.get_doc = Mock(side_effect=Exception("Database error"))
        mock_frappe.log_error = Mock()
        mock_frappe.msgprint = Mock()
        
        # Should not raise exception
        on_credit_note_cancel(credit_note)
        
        # Should log error and show message
        mock_frappe.log_error.assert_called_once()
        mock_frappe.msgprint.assert_called_once()


class TestCommissionAdjustmentIntegration(unittest.TestCase):
    """Integration tests for commission adjustment workflow"""
    
    @patch('erpnext_custom.credit_note_commission.frappe')
    def test_full_workflow_submit_and_cancel(self, mock_frappe):
        """Test complete workflow: submit Credit Note then cancel it"""
        # Setup Credit Note
        credit_note = Mock()
        credit_note.is_return = 1
        credit_note.return_against = "SI-2024-00001"
        credit_note.name = "CN-2024-00001"
        credit_note.get = Mock(return_value=-50000)
        credit_note.add_comment = Mock()
        
        # Setup original invoice
        original_invoice = Mock()
        original_invoice.name = "SI-2024-00001"
        original_invoice.custom_total_komisi_sales = 100000
        original_invoice.flags = Mock()
        original_invoice.save = Mock()
        original_invoice.add_comment = Mock()
        
        # Mock get method to return current commission value
        def get_commission(field, default=0):
            if field == "custom_total_komisi_sales":
                return original_invoice.custom_total_komisi_sales
            return default
        
        original_invoice.get = get_commission
        
        mock_frappe.get_doc = Mock(return_value=original_invoice)
        mock_frappe.logger = Mock(return_value=Mock(info=Mock()))
        
        # Submit Credit Note
        on_credit_note_submit(credit_note)
        self.assertEqual(original_invoice.custom_total_komisi_sales, 50000)
        
        # Cancel Credit Note
        on_credit_note_cancel(credit_note)
        self.assertEqual(original_invoice.custom_total_komisi_sales, 100000)
        
        # Verify save was called twice
        self.assertEqual(original_invoice.save.call_count, 2)


if __name__ == '__main__':
    unittest.main()
