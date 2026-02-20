# -*- coding: utf-8 -*-
# Copyright (c) 2024, Batasku and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class PeriodClosingLog(Document):
	def validate(self):
		"""Validate period closing log before saving"""
		self.validate_accounting_period()
		self.set_technical_details()
	
	def validate_accounting_period(self):
		"""Validate that the accounting period exists"""
		if not frappe.db.exists("Accounting Period", self.accounting_period):
			frappe.throw(f"Accounting Period {self.accounting_period} does not exist")
	
	def set_technical_details(self):
		"""Set IP address and user agent if not already set"""
		if not self.ip_address:
			self.ip_address = frappe.local.request_ip if hasattr(frappe.local, 'request_ip') else None
		
		if not self.user_agent:
			if hasattr(frappe.local, 'request') and frappe.local.request:
				self.user_agent = frappe.local.request.headers.get('User-Agent', '')[:140]
