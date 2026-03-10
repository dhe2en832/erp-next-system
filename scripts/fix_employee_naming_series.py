#!/usr/bin/env python3
"""
Fix Employee Naming Series Counter

This script fixes the Employee naming series counter in ERPNext when it's out of sync.
Run this on the ERPNext server using bench console.

Usage:
    bench --site cirebon.batasku.cloud console
    
Then paste this entire script and it will run automatically.
"""

import frappe

def fix_employee_naming_series():
    """Fix the Employee naming series counter"""
    
    print("=" * 60)
    print("FIXING EMPLOYEE NAMING SERIES COUNTER")
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
    print(f"\n📝 Next employee will be: HR-EMP-{str(next_number).zfill(5)}")
    print("=" * 60)
    
    return {
        'success': True,
        'total_employees': len(employees),
        'highest_number': max_number,
        'next_number': next_number,
        'next_id': f"HR-EMP-{str(next_number).zfill(5)}"
    }

# Auto-run when pasted in console
if __name__ == '__main__':
    result = fix_employee_naming_series()
    print("\nResult:", result)
else:
    # Also run when imported
    result = fix_employee_naming_series()
    print("\nResult:", result)
