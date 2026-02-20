# -*- coding: utf-8 -*-
# Copyright (c) 2024, Batasku and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import getdate

class AccountingPeriod(Document):
	def validate(self):
		"""Validate accounting period before saving"""
		self.validate_dates()
		self.validate_overlapping_periods()
		self.validate_status_transition()
	
	def validate_dates(self):
		"""Validate that start_date is before end_date"""
		if getdate(self.start_date) >= getdate(self.end_date):
			frappe.throw("Start Date must be before End Date")
	
	def validate_overlapping_periods(self):
		"""Check for overlapping periods with the same company"""
		if self.is_new():
			# Check for overlapping periods
			overlapping = frappe.db.sql("""
				SELECT name, period_name
				FROM `tabAccounting Period`
				WHERE company = %s
				AND name != %s
				AND (
					(start_date <= %s AND end_date >= %s)
					OR (start_date <= %s AND end_date >= %s)
					OR (start_date >= %s AND end_date <= %s)
				)
			""", (self.company, self.name or '', self.start_date, self.start_date,
				  self.end_date, self.end_date, self.start_date, self.end_date))
			
			if overlapping:
				frappe.throw(f"Period overlaps with existing period: {overlapping[0][1]}")
	
	def validate_status_transition(self):
		"""Validate status transitions"""
		if not self.is_new():
			old_doc = self.get_doc_before_save()
			if old_doc:
				old_status = old_doc.status
				new_status = self.status
				
				# Permanently Closed cannot be changed
				if old_status == "Permanently Closed" and new_status != "Permanently Closed":
					frappe.throw("Cannot change status of a Permanently Closed period")
				
				# Cannot go directly from Open to Permanently Closed
				if old_status == "Open" and new_status == "Permanently Closed":
					frappe.throw("Period must be Closed before it can be Permanently Closed")
	
	def on_update(self):
		"""Actions to perform after update"""
		# Create audit log entry
		if not self.is_new():
			old_doc = self.get_doc_before_save()
			if old_doc and old_doc.status != self.status:
				self.create_audit_log(old_doc)
	
	def create_audit_log(self, old_doc):
		"""Create audit log entry for status changes"""
		action_type = None
		if self.status == "Closed" and old_doc.status == "Open":
			action_type = "Closed"
		elif self.status == "Open" and old_doc.status == "Closed":
			action_type = "Reopened"
		elif self.status == "Permanently Closed" and old_doc.status == "Closed":
			action_type = "Permanently Closed"
		
		if action_type:
			log = frappe.get_doc({
				"doctype": "Period Closing Log",
				"accounting_period": self.name,
				"action_type": action_type,
				"action_by": frappe.session.user,
				"action_date": frappe.utils.now(),
				"before_snapshot": frappe.as_json(old_doc.as_dict()),
				"after_snapshot": frappe.as_json(self.as_dict())
			})
			log.insert(ignore_permissions=True)
