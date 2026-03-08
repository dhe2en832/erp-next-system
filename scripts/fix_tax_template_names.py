#!/usr/bin/env python3
"""
Script to fix tax template names by replacing incorrect company suffix with correct one.

Usage:
    bench --site [site-name] execute scripts/fix_tax_template_names.py

Example:
    bench --site cirebon.batasku.cloud execute erp-next-system/scripts/fix_tax_template_names.py
"""

import frappe
import re

def fix_tax_template_names():
    """
    Fix tax template names by replacing company suffix with correct company from field.
    
    Example:
        "PPN 11% - BAC" with company="Cirebon" → "PPN 11% - Cirebon"
    """
    
    # Get all companies
    companies = frappe.get_all('Company', fields=['name'])
    company_names = [c.name for c in companies]
    
    print(f"\n{'='*60}")
    print(f"Found {len(company_names)} companies: {', '.join(company_names)}")
    print(f"{'='*60}\n")
    
    # Process both Sales and Purchase tax templates
    doctypes = [
        'Sales Taxes and Charges Template',
        'Purchase Taxes and Charges Template'
    ]
    
    total_updated = 0
    
    for doctype in doctypes:
        print(f"\n--- Processing {doctype} ---\n")
        
        # Get all templates
        templates = frappe.get_all(doctype, fields=['name', 'company', 'title'])
        
        for template in templates:
            name = template.name
            company = template.company
            title = template.title or name
            
            # Check if name has company suffix pattern (e.g., " - BAC", " - Cirebon")
            # Pattern: ends with " - [CompanyName]"
            suffix_pattern = r'\s*-\s*(' + '|'.join(re.escape(c) for c in company_names) + r')$'
            match = re.search(suffix_pattern, name)
            
            if match:
                current_suffix = match.group(1)
                
                # Check if suffix matches the actual company field
                if current_suffix != company:
                    # Build new name by replacing suffix
                    base_name = re.sub(suffix_pattern, '', name)
                    new_name = f"{base_name} - {company}"
                    
                    print(f"Template: {name}")
                    print(f"  Company field: {company}")
                    print(f"  Current suffix: {current_suffix}")
                    print(f"  New name: {new_name}")
                    
                    try:
                        # Rename the document
                        frappe.rename_doc(doctype, name, new_name, force=True)
                        
                        # Update title if it also has the wrong suffix
                        if title and re.search(suffix_pattern, title):
                            base_title = re.sub(suffix_pattern, '', title)
                            new_title = f"{base_title} - {company}"
                            
                            doc = frappe.get_doc(doctype, new_name)
                            doc.title = new_title
                            doc.save()
                            
                            print(f"  ✓ Renamed and updated title")
                        else:
                            print(f"  ✓ Renamed")
                        
                        total_updated += 1
                        
                    except Exception as e:
                        print(f"  ✗ Error: {str(e)}")
                    
                    print()
    
    frappe.db.commit()
    
    print(f"\n{'='*60}")
    print(f"Total templates updated: {total_updated}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    fix_tax_template_names()
