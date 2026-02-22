---
inclusion: always
---

# Technology Stack

## Frontend Framework

- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5

## Styling & UI

- Tailwind CSS 4
- Custom component library
- Responsive design (mobile-first)
- Color palette: Indigo (primary), Green (success), Yellow (warning), Red (danger)

## Backend Integration

- ERPNext REST API
- node-fetch for HTTP requests
- WebSocket support (ws library)

## Key Libraries

- recharts - Data visualization
- xlsx - Excel file handling
- dayjs - Date manipulation
- zod - Schema validation
- lucide-react - Icons

## Development Tools

- ESLint - Code linting
- ts-node - TypeScript execution
- tsx - TypeScript runner
- pnpm - Package manager

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)

# Build & Production
pnpm build                  # Build for production
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # Run ESLint

# WebSocket Server
pnpm ws-server              # Start WebSocket server

# Tax Setup Scripts
pnpm create-tax-accounts                # Create tax accounts
pnpm setup-sales-tax-templates          # Setup sales tax templates
pnpm setup-purchase-tax-templates       # Setup purchase tax templates
pnpm setup-all-tax-templates            # Run all tax setup scripts

# Testing
pnpm test:*                 # Various test scripts available
```

## API Route Pattern (Next.js 14+)

CRITICAL: `params` is now a Promise and must be awaited:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params; // MUST await
  // ... implementation
}
```

## TypeScript Configuration

- Target: ES2017
- Module: esnext
- Module Resolution: bundler
- Strict mode enabled
- Path alias: `@/*` maps to project root
- JSX: react-jsx

## Environment Setup

Required `.env` variables:
- `ERPNEXT_API_URL` - ERPNext backend URL (default: http://localhost:8000)
- `ERP_API_KEY` - API key for authentication
- `ERP_API_SECRET` - API secret for authentication
