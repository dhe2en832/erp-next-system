#!/bin/bash

# Script to add type assertions to client.get/insert calls

# Find all files with client.get/insert without 'as any'
find app/api -name "*.ts" -type f -exec sed -i \
  -e 's/\(const [a-zA-Z_][a-zA-Z0-9_]* = await client\.get([^)]*)\);/\1 as any;/g' \
  -e 's/\(const [a-zA-Z_][a-zA-Z0-9_]* = await client\.insert([^)]*)\);/\1 as any;/g' \
  -e 's/\(const [a-zA-Z_][a-zA-Z0-9_]* = await client\.getDoc([^)]*)\);/\1 as any;/g' \
  {} \;

echo "Type assertions added"
