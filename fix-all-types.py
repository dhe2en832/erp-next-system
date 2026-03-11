#!/usr/bin/env python3
import os
import re
from pathlib import Path

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix: for (const x of array) where array comes from getList
    content = re.sub(
        r'for \(const (\w+) of \((\w+Data) \|\| \[\]\)\)',
        r'for (const \1 of (\2 || []) as any[])',
        content
    )
    
    # Fix: array.forEach where array comes from getList
    content = re.sub(
        r'(\w+Data)\.forEach\(',
        r'(\1 as any[]).forEach(',
        content
    )
    
    # Fix: glData.forEach
    content = re.sub(
        r'glData\.forEach\(',
        r'(glData as any[]).forEach(',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Find all TypeScript files in app/api
api_dir = Path('app/api')
fixed_count = 0

for ts_file in api_dir.rglob('*.ts'):
    if fix_file(ts_file):
        fixed_count += 1
        print(f'Fixed: {ts_file}')

print(f'\nTotal files fixed: {fixed_count}')
