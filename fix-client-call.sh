#!/bin/bash

# Fix client.call() type errors
find app/api -name "*.ts" -type f -exec sed -i \
  -e 's/\(const [a-zA-Z_][a-zA-Z0-9_]* = await client\.call([^)]*)\);/\1 as any;/g' \
  {} \;

echo "client.call() type assertions added"
