---
inclusion: always
---

# Project Structure

## Root Organization

```
erp-next-system/
├── app/                    # Next.js App Router (pages & API routes)
├── components/             # Reusable React components
├── lib/                    # Shared utilities & libraries
├── utils/                  # Helper functions
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
├── docs/                   # Documentation files
├── tests/                  # Test files
├── scripts/                # Utility scripts
├── erpnext_custom/         # Python customizations for ERPNext
└── public/                 # Static assets
```

## App Directory Structure

```
app/
├── api/                    # Backend API routes
│   ├── [module]/
│   │   ├── route.ts        # GET (list) + POST (create)
│   │   └── [name]/
│   │       ├── route.ts    # GET (detail) + PUT (update) + DELETE
│   │       └── submit/
│   │           └── route.ts # POST (submit action)
├── [module-name]/          # Frontend pages per module
│   ├── page.tsx            # Main page (list view)
│   └── [module]Main/
│       └── component.tsx   # Create/Edit form
├── layout.tsx              # Root layout
└── globals.css             # Global styles
```

## Module Organization

Each business module follows this pattern:

```
app/[module]/
├── page.tsx                # List view
├── [module]Main/
│   └── component.tsx       # Create/Edit form
└── [module]List/
    └── component.tsx       # List component (if separate)
```

Examples:
- `app/purchase-orders/` - Purchase Order module
- `app/sales-order/` - Sales Order module
- `app/invoice/` - Sales Invoice module
- `app/delivery-note/` - Delivery Note module

## API Route Conventions

Standard CRUD pattern:
- `GET /api/[module]` - List with pagination/filtering
- `POST /api/[module]` - Create new document
- `GET /api/[module]/[name]` - Get document detail
- `PUT /api/[module]/[name]` - Update document
- `DELETE /api/[module]/[name]` - Delete document
- `POST /api/[module]/[name]/submit` - Submit document (change status)

## Component Organization

```
components/
├── invoice/                # Invoice-specific components
├── loading/                # Loading state components
├── toast/                  # Toast notification components
├── LoadingButton.tsx       # Reusable button with loading state
├── LoadingSpinner.tsx      # Spinner component
├── ErrorDialog.tsx         # Error display dialog
└── [Other shared components]
```

## Library Organization

```
lib/
├── erpnext.ts              # ERPNext API helpers
├── normalizers.ts          # Data transformation utilities
├── csrf-protection.ts      # CSRF protection utilities
├── input-sanitization.ts   # Input validation & sanitization
├── toast-context.tsx       # Toast notification context
├── accounting-period-*.ts  # Accounting period utilities
└── use-loading.ts          # Loading state hook
```

## Utilities Organization

```
utils/
├── erpnext-api-helper.ts   # ERPNext API wrapper functions
├── erpnext-auth.ts         # Authentication utilities
├── erpnext-error-handler.ts # Error handling utilities
├── format.ts               # Formatting utilities (currency, date)
└── index.ts                # Utility exports
```

## Type Definitions

```
types/
├── accounting-period.ts    # Accounting period types
├── purchase-invoice.ts     # Purchase invoice types
└── sales-invoice.ts        # Sales invoice types
```

## Documentation Structure

```
docs/
├── accounting-period-*.md  # Accounting period documentation
├── COA_*.md                # Chart of Accounts documentation
├── erpnext-server-scripts.md
└── [Other feature documentation]
```

## Python Customizations

```
erpnext_custom/
├── __init__.py
├── hooks.py                # ERPNext hooks configuration
├── discount_calculator.py  # Discount calculation logic
├── tax_calculator.py       # Tax calculation logic
├── gl_entry_sales.py       # GL entry for sales
├── gl_entry_purchase.py    # GL entry for purchases
└── invoice_cancellation.py # Invoice cancellation logic
```

## Naming Conventions

- Files: kebab-case (e.g., `purchase-orders.tsx`)
- Components: PascalCase (e.g., `PurchaseOrderForm`)
- Functions: camelCase (e.g., `fetchPurchaseOrders`)
- Constants: UPPER_SNAKE_CASE (e.g., `ERPNEXT_API_URL`)
- Types/Interfaces: PascalCase (e.g., `PurchaseOrder`)

## File Naming Patterns

- Page components: `page.tsx`
- API routes: `route.ts`
- Component files: `component.tsx` (in module folders)
- Type definitions: `[module].ts` in `types/`
- Utilities: `[purpose].ts` in `utils/` or `lib/`
- Tests: `[feature].test.ts` in `tests/`

## Import Path Aliases

- `@/*` - Maps to project root
- Example: `import { formatCurrency } from '@/utils/format'`
