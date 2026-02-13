# API Structure Documentation

## Overview

This API has been restructured into logical modules to improve maintainability and organization. During the migration period, both old and new API paths are supported.

## New Modular Structure

### 📦 Purchase Module (`/api/purchase/`)
- **Orders** - Purchase Orders management
  - `GET /api/purchase/orders` - List purchase orders
  - `POST /api/purchase/orders` - Create purchase order
  - `GET /api/purchase/orders/[name]` - Get purchase order details
  - `POST /api/purchase/orders/[name]/submit` - Submit purchase order
  - `POST /api/purchase/orders/[name]/receive` - Receive purchase order
  - `POST /api/purchase/orders/[name]/complete` - Complete purchase order

- **Receipts** - Purchase Receipts management
  - `GET /api/purchase/receipts` - List purchase receipts
  - `GET /api/purchase/receipts/[name]` - Get receipt details
  - `POST /api/purchase/receipts/[name]/submit` - Submit receipt

- **Invoices** - Purchase Invoices management
  - `GET /api/purchase/invoices` - List purchase invoices
  - `GET /api/purchase/invoices/[name]` - Get invoice details
  - `POST /api/purchase/invoices/[name]/submit` - Submit invoice

- **Suppliers** - Supplier management
  - `GET /api/purchase/suppliers` - List suppliers
  - `GET /api/purchase/suppliers/[name]` - Get supplier details

### 🛍️ Sales Module (`/api/sales/`)
- **Orders** - Sales Orders management
  - `GET /api/sales/orders` - List sales orders
  - `POST /api/sales/orders` - Create sales order
  - `GET /api/sales/orders/[name]` - Get sales order details
  - `POST /api/sales/orders/[name]/submit` - Submit sales order

- **Delivery Notes** - Delivery Notes management
  - `GET /api/sales/delivery-notes` - List delivery notes
  - `POST /api/sales/delivery-notes` - Create delivery note
  - `GET /api/sales/delivery-notes/[name]` - Get delivery note details
  - `POST /api/sales/delivery-notes/[name]/submit` - Submit delivery note
  - `POST /api/sales/delivery-notes/from-sales-order/[name]` - Create from sales order

- **Invoices** - Sales Invoices management
  - `GET /api/sales/invoices` - List sales invoices
  - `POST /api/sales/invoices` - Create sales invoice
  - `GET /api/sales/invoices/[name]` - Get invoice details
  - `POST /api/sales/invoices/[name]/submit` - Submit invoice
  - `POST /api/sales/invoices/from-sales-order/[name]` - Create from sales order

- **Customers** - Customer management
  - `GET /api/sales/customers` - List customers
  - `GET /api/sales/customers/[name]` - Get customer details

### 📦 Inventory Module (`/api/inventory/`)
- **Stock Entry** - Stock entries management
  - `GET /api/inventory/stock-entry` - List stock entries
  - `POST /api/inventory/stock-entry` - Create stock entry

- **Reconciliation** - Stock reconciliation
  - `GET /api/inventory/reconciliation` - List reconciliations
  - `POST /api/inventory/reconciliation` - Create reconciliation

- **Items** - Items management
  - `GET /api/inventory/items` - List items
  - `POST /api/inventory/items` - Create item

- **Warehouses** - Warehouse management
  - `GET /api/inventory/warehouses` - List warehouses
  - `POST /api/inventory/warehouses` - Create warehouse

### 💰 Finance Module (`/api/finance/`)
- **Reports** - Financial reports
  - `GET /api/finance/reports` - Get financial reports (Trial Balance, Balance Sheet, P&L)

- **Payments** - Payment management
  - `GET /api/finance/payments` - List payments
  - `POST /api/finance/payments` - Create payment
  - `GET /api/finance/payments/[name]` - Get payment details
  - `POST /api/finance/payments/[name]/submit` - Submit payment

- **Accounts** - Chart of Accounts
  - `GET /api/finance/accounts` - Get chart of accounts
  - `GET /api/finance/accounts?account=[name]` - Get account details with journal

- **Journal** - Journal entries
  - `GET /api/finance/journal` - List journal entries
  - `GET /api/finance/journal/simple` - Simple journal view

### ⚙️ Setup Module (`/api/setup/`)
- **Authentication** - User authentication
  - `POST /api/setup/auth/login` - User login
  - `POST /api/setup/auth/logout` - User logout
  - `POST /api/setup/auth/set-company` - Set selected company

- **Dashboard** - Dashboard data
  - `GET /api/setup/dashboard` - Get dashboard statistics

- **Commission** - Commission calculations
  - `GET /api/setup/commission` - Get commission data

- **Projects** - Project management
  - `GET /api/setup/projects` - List projects

### 🔧 Utils Module (`/api/utils/`)
- **Diagnostics** - System diagnostics
  - `GET /api/utils/diagnose` - System health check

- **ERPNext** - Direct ERPNext access
  - `GET /api/utils/erpnext/*` - Direct ERPNext API access

- **Test** - Testing endpoints
  - `GET /api/utils/test` - Test endpoints for development

## Migration Status

### ✅ Phase 1 Complete
- New modular structure created
- Frontend updated to use new API paths
- Core APIs copied to new structure
- Proxy routes created for backward compatibility

### 🔄 Phase 2 In Progress
- Old APIs now proxy to new APIs
- Duplicate endpoints being consolidated
- All frontend components using new paths

### ⏳ Phase 3 Pending
- Remove old API folders after full migration
- Add comprehensive API documentation
- Standardize error handling across all modules

## Old API Paths (Deprecated)

These paths are still supported during migration but will be removed in Phase 3:

| Old Path | New Path |
|----------|----------|
| `/api/purchase-orders` | `/api/purchase/orders` |
| `/api/purchase-receipts` | `/api/purchase/receipts` |
| `/api/purchase-invoice` | `/api/purchase/invoices` |
| `/api/sales-order` | `/api/sales/orders` |
| `/api/delivery-note` | `/api/sales/delivery-notes` |
| `/api/invoice` | `/api/sales/invoices` |
| `/api/payment` | `/api/finance/payments` |
| `/api/items` | `/api/inventory/items` |
| `/api/warehouses` | `/api/inventory/warehouses` |
| `/api/stock-entry` | `/api/inventory/stock-entry` |
| `/api/financial-reports` | `/api/finance/reports` |
| `/api/chart-of-accounts` | `/api/finance/accounts` |

## Authentication

All APIs support session-based authentication with fallback to API key authentication:

```javascript
// Session authentication (recommended)
const response = await fetch('/api/purchase/orders', {
  credentials: 'include', // Include session cookies
});

// API key authentication (fallback)
const response = await fetch('/api/purchase/orders', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-API-Key': 'YOUR_API_KEY',
  },
});
```

## Error Handling

All APIs follow consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per user session

## Pagination

List endpoints support pagination with these parameters:
- `limit` - Number of items per page (default: 20, max: 100)
- `start` - Starting index (default: 0)
- `search` - Search term
- `filters` - JSON encoded filters array

Example:
```
GET /api/purchase/orders?limit=50&start=100&search=supplier&filters=[["status","=","Submitted"]]
```
