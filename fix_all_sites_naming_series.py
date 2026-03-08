#!/usr/bin/env python3
"""
Fix Employee Naming Series Counter for All Sites

This script fixes the Employee naming series counter for all sites in a multi-tenant ERPNext setup.
Run this on the ERPNext server.

Usage Option 1 - Fix all sites:
    python3 fix_all_sites_naming_series.py

Usage Option 2 - Fix specific site:
    bench --site cirebon.batasku.cloud console
    # Then paste the fix_employee_naming_series() function and call it
"""

import frappe
import sys

def fix_employee_naming_series():
    """Fix the Employee naming series counter for current site"""
    
    print("=" * 60)
    print(f"FIXING EMPLOYEE NAMING SERIES FOR: {frappe.local.site}")
    print("=" * 60)
    
    # Get all employees
    employees = frappe.get_all('Employee', fields=['name'], order_by='name desc', limit_page_length=999999)
    
    # Find highest number
    max_number = 0
    for emp in employees:
        if emp.name.startswith('HR-EMP-'):
            try:
                num = int(emp.name.replace('HR-EMP-', ''))
                if num > max_number:
                    max_number = num
            except ValueError:
                continue
    
    next_number = max_number + 1
    
    print(f"\n📊 Current State:")
    print(f"  - Total employees: {len(employees)}")
    print(f"  - Highest ID number: {max_number}")
    print(f"  - Next ID should be: {next_number}")
    
    # Check current naming series value
    current_series = frappe.db.sql("""
        SELECT current FROM tabSeries WHERE name = 'HR-EMP-'
    """, as_dict=True)
    
    if current_series:
        print(f"  - Current series counter: {current_series[0].current}")
    else:
        print(f"  - Current series counter: NOT SET")
    
    # Update naming series counter
    print(f"\n🔧 Updating naming series counter...")
    frappe.db.sql("""
        INSERT INTO tabSeries (name, current) 
        VALUES ('HR-EMP-', %s)
        ON DUPLICATE KEY UPDATE current = %s
    """, (next_number, next_number))
    
    frappe.db.commit()
    
    print(f"✅ Successfully updated naming series counter to {next_number}")
    print(f"📝 Next employee will be: HR-EMP-{str(next_number).zfill(5)}")
    print("=" * 60)
    
    return {
        'site': frappe.local.site,
        'success': True,
        'total_employees': len(employees),
        'highest_number': max_number,
        'next_number': next_number,
        'next_id': f"HR-EMP-{str(next_number).zfill(5)}"
    }

def fix_all_sites():
    """Fix naming series for all sites"""
    
    # Get all sites
    sites = frappe.utils.get_sites()
    
    print("=" * 80)
    print("FIXING EMPLOYEE NAMING SERIES FOR ALL SITES")
    print("=" * 80)
    print(f"\nFound {len(sites)} sites\n")
    
    results = []
    
    for site in sites:
        try:
            frappe.init(site=site)
            frappe.connect()
            
            result = fix_employee_naming_series()
            results.append(result)
            
            frappe.destroy()
            
        except Exception as e:
            print(f"\n❌ Error fixing {site}: {str(e)}\n")
            results.append({
                'site': site,
                'success': False,
                'error': str(e)
            })
            frappe.destroy()
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    success_count = sum(1 for r in results if r.get('success'))
    failed_count = len(results) - success_count
    
    print(f"\n✅ Successfully fixed: {success_count} sites")
    print(f"❌ Failed: {failed_count} sites\n")
    
    for result in results:
        if result.get('success'):
            print(f"✅ {result['site']}: {result['total_employees']} employees, next ID: {result['next_id']}")
        else:
            print(f"❌ {result['site']}: {result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--all':
        # Fix all sites
        fix_all_sites()
    else:
        # Fix current site (when run from bench console)
        if hasattr(frappe, 'local') and hasattr(frappe.local, 'site'):
            result = fix_employee_naming_series()
            print("\nResult:", result)
        else:
            print("Usage:")
            print("  Option 1 - Fix all sites:")
            print("    python3 fix_all_sites_naming_series.py --all")
            print()
            print("  Option 2 - Fix specific site:")
            print("    bench --site your-site.com console")
            print("    # Then paste this script")
