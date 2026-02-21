# Notification Components Integration Guide

This guide shows how to integrate the notification components into your application.

## Components Overview

### 1. NotificationCenter
Full-featured notification center with complete notification management.

**Features:**
- Display all notifications (reminders, overdue, escalations)
- Mark individual notifications as read
- Mark all notifications as read
- Filter and sort by severity
- Direct navigation to period details or closing wizard
- Persistent read/unread state

**Usage:**
```tsx
import NotificationCenter from '@/app/accounting-period/components/NotificationCenter';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto p-6">
      <NotificationCenter />
    </div>
  );
}
```

### 2. NotificationBadge
Compact notification badge for navigation bars.

**Features:**
- Shows unread notification count
- Dropdown with critical notifications preview
- Auto-refresh every 5 minutes
- Quick access to notification center

**Usage in Navigation:**
```tsx
import NotificationBadge from '@/app/accounting-period/components/NotificationBadge';

export default function Navigation() {
  return (
    <nav className="flex items-center space-x-4">
      {/* Other navigation items */}
      <NotificationBadge />
    </nav>
  );
}
```

## Integration Examples

### Example 1: Add to Main Layout

```tsx
// app/layout.tsx or app/accounting-period/layout.tsx
import NotificationBadge from './accounting-period/components/NotificationBadge';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1>ERP System</h1>
            <div className="flex items-center space-x-4">
              {/* Other header items */}
              <NotificationBadge />
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Example 2: Add to Dashboard

```tsx
// app/accounting-period/dashboard/page.tsx
import NotificationCenter from '../components/NotificationCenter';
import PeriodDashboard from '../components/PeriodDashboard';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main dashboard content */}
        <div className="lg:col-span-2">
          <PeriodDashboard />
        </div>
        
        {/* Notification sidebar */}
        <div className="lg:col-span-1">
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
}
```

### Example 3: Standalone Notification Page

```tsx
// app/accounting-period/notifications/page.tsx
import NotificationCenter from '../components/NotificationCenter';

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <NotificationCenter />
    </div>
  );
}
```

### Example 4: Modal/Popover Integration

```tsx
'use client';

import { useState } from 'react';
import NotificationCenter from '../components/NotificationCenter';

export default function NotificationModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        View Notifications
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <NotificationCenter 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
            />
          </div>
        </div>
      )}
    </>
  );
}
```

## Notification Logic

### Notification Types and Timing

1. **Reminder Notifications (Info)**
   - Triggered: 3 days before period end date
   - Severity: Info (blue)
   - Purpose: Give advance warning to prepare for closing

2. **Overdue Notifications (Warning)**
   - Triggered: 1-7 days after period end date
   - Severity: Warning (yellow)
   - Purpose: Alert that period should be closed

3. **Escalation Notifications (Critical)**
   - Triggered: 7+ days after period end date
   - Severity: Error (red)
   - Purpose: Critical alert for significantly overdue periods

### Configuration

The notification timing can be configured in the Period Closing Config:
- `reminder_days_before_end`: Days before end date to send reminders (default: 3)
- `escalation_days_after_end`: Days after end date to escalate (default: 7)

### Read/Unread State

Notifications use localStorage to persist read/unread state:
- Key: `accounting_period_read_notifications`
- Value: Array of notification IDs that have been marked as read
- Cleared when: User clears browser data or manually resets

## Styling

Both components use Tailwind CSS and follow the existing design system:
- Colors: Indigo for primary actions, severity-based colors for notifications
- Icons: Heroicons (outline style)
- Spacing: Consistent with existing components
- Responsive: Mobile-friendly with appropriate breakpoints

## API Integration

The components fetch data from:
- `GET /api/accounting-period/periods?status=Open`

No additional API endpoints are required. Notifications are generated client-side based on period dates and current date.

## Performance Considerations

- **Auto-refresh**: NotificationBadge refreshes every 5 minutes
- **Lazy loading**: Notifications are only fetched when component mounts
- **Local storage**: Read state is cached to reduce re-renders
- **Memoization**: Notification calculations are memoized with useMemo

## Accessibility

- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- Color contrast meets WCAG AA standards

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires localStorage support
- Requires ES6+ JavaScript features

