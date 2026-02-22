---
inclusion: always
---

# Product Overview

This is a Next.js-based ERP system that provides a modern web interface for ERPNext. The system manages complete business operations including finance, purchasing, sales, inventory, and HR.

## Core Purpose

Frontend application that integrates with ERPNext backend via REST API to provide:
- Financial management (Chart of Accounts, Journal Entries, GL Entries, Reports)
- Purchase operations (Orders, Receipts, Invoices)
- Sales operations (Orders, Delivery Notes, Invoices)
- Inventory management (Stock Entry, Reconciliation, Warehouses)
- HR operations (Employees, Commission tracking)

## Key Features

- Full CRUD operations for all ERPNext document types
- Real-time data synchronization with ERPNext backend
- Document workflow management (Draft → Submit → Complete)
- Financial reporting (Trial Balance, Balance Sheet, P&L)
- Commission calculation and payment tracking
- Responsive UI with Tailwind CSS
- Indonesian language support (Bahasa Indonesia)

## Authentication

Uses dual authentication approach:
1. API Key authentication (primary)
2. Session-based authentication (fallback)

Environment variables required:
- `ERPNEXT_API_URL` - ERPNext backend URL
- `ERP_API_KEY` - API key for authentication
- `ERP_API_SECRET` - API secret for authentication
