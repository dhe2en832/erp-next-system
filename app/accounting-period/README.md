# Accounting Period Closing Module

This module implements the Accounting Period Closing feature for the ERP system.

## Structure

```
app/
├── accounting-period/          # Frontend pages
│   ├── components/            # Reusable components
│   │   ├── NotificationCenter.tsx      # Full notification center
│   │   ├── NotificationBadge.tsx       # Compact notification badge
│   │   ├── PeriodDashboard.tsx         # Dashboard component
│   │   ├── PeriodList.tsx              # Period list component
│   │   ├── CreatePeriodForm.tsx        # Period creation form
│   │   └── ClosingSummaryReport.tsx    # Closing report component
│   ├── notifications/         # Notification center page
│   ├── dashboard/             # Dashboard page
│   ├── create/                # Period creation page
│   ├── close/                 # Period closing wizard
│   ├── reports/               # Reports pages
│   ├── audit-log/             # Audit log viewer
│   ├── settings/              # Configuration settings
│   └── README.md              # This file
├── api/
│   └── accounting-period/     # API routes
│       ├── periods/           # Period CRUD operations
│       ├── validate/          # Pre-closing validations
│       ├── close/             # Period closing
│       ├── reopen/            # Period reopening
│       ├── permanent-close/   # Permanent closing
│       ├── reports/           # Closing reports
│       ├── audit-log/         # Audit trail
│       └── config/            # Configuration management
lib/
├── erpnext.ts                 # ERPNext API client
└── accounting-period-schemas.ts # Zod validation schemas
types/
└── accounting-period.ts       # TypeScript type definitions
```

## Configuration

### TypeScript
- Strict mode enabled in `tsconfig.json`
- All types defined in `types/accounting-period.ts`

### Validation
- Zod schemas defined in `lib/accounting-period-schemas.ts`
- Request/response validation for all API endpoints

### ERPNext Integration
- Generic ERPNext client in `lib/erpnext.ts`
- Supports the following DocTypes:
  - Accounting Period
  - Period Closing Log
  - Period Closing Config

## Development

### Notification System

The notification system provides real-time alerts for accounting periods that need attention:

**Components:**
- `NotificationCenter`: Full-featured notification center with filtering and read/unread tracking
- `NotificationBadge`: Compact badge for navigation bars with dropdown preview

**Notification Types:**
1. **Reminder** (Info): 3 days before period end date
2. **Overdue** (Warning): Period passed end date (up to 7 days)
3. **Escalation** (Critical): Period overdue for 7+ days

**Features:**
- Persistent read/unread state (localStorage)
- Auto-refresh every 5 minutes
- Direct navigation to period details or closing wizard
- Severity-based sorting and visual indicators

**Usage:**
```tsx
// Full notification center
import NotificationCenter from './components/NotificationCenter';
<NotificationCenter />

// Compact badge for navigation
import NotificationBadge from './components/NotificationBadge';
<NotificationBadge />
```

### Adding New API Endpoints
1. Create route handler in `app/api/accounting-period/[endpoint]/route.ts`
2. Define request/response types in `types/accounting-period.ts`
3. Add Zod validation schema in `lib/accounting-period-schemas.ts`
4. Use `erpnextClient` from `lib/erpnext.ts` for ERPNext API calls

### Adding New Frontend Pages
1. Create page component in `app/accounting-period/[page]/page.tsx`
2. Use types from `types/accounting-period.ts`
3. Call API endpoints using fetch or custom hooks

## Testing

Tests will be implemented using Vitest and fast-check for property-based testing.

## Documentation

See the spec files in `.kiro/specs/accounting-period-closing/` for:
- Requirements (`requirements.md`)
- Design (`design.md`)
- Implementation tasks (`tasks.md`)
