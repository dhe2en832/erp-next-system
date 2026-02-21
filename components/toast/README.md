# Toast Notification System

## Overview

A comprehensive toast notification system for the ERP Next application, providing visual feedback for user actions with support for multiple notification types, auto-dismiss, and manual dismissal.

## Features

- ✅ Multiple toast types: success, error, warning, info
- ✅ Auto-dismiss with configurable duration
- ✅ Manual dismissal
- ✅ Multiple toasts displayed simultaneously (max 5 by default)
- ✅ Smooth animations (slide-in from right)
- ✅ Responsive design with Tailwind CSS
- ✅ Accessibility support (ARIA attributes)
- ✅ Integration with centralized error handler
- ✅ TypeScript support

## Architecture

### Components

1. **ToastContext** (`lib/toast-context.tsx`)
   - React Context for managing toast state
   - Provides hooks for showing and dismissing toasts
   - Handles auto-dismiss logic

2. **ToastContainer** (`components/ToastContainer.tsx`)
   - Renders all active toasts
   - Fixed position in top-right corner
   - Handles animations and styling

3. **ToastProvider** (in `lib/toast-context.tsx`)
   - Wraps the application to provide toast functionality
   - Configurable max toasts and default duration

4. **Toast Error Handler** (`lib/toast-error-handler.ts`)
   - Integration with centralized error handler
   - Convenience functions for common actions
   - Maps error types to appropriate toast types

## Installation

The toast system is already integrated into the application layout. No additional setup is required.

## Usage

### Basic Usage

```typescript
'use client';

import { useToast } from '@/lib/toast-context';

function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    toast.success('Success!', 'Operation completed successfully');
  };

  return <button onClick={handleAction}>Click me</button>;
}
```

### Toast Types

#### Success Toast
```typescript
toast.success('Title', 'Optional message', 5000);
```

#### Error Toast
```typescript
toast.error('Title', 'Optional message', 7000);
```

#### Warning Toast
```typescript
toast.warning('Title', 'Optional message', 7000);
```

#### Info Toast
```typescript
toast.info('Title', 'Optional message', 5000);
```

### Integration with Error Handler

```typescript
import { useToast } from '@/lib/toast-context';
import { showErrorToast, showPeriodCreatedToast } from '@/lib/toast-error-handler';

function PeriodForm() {
  const toast = useToast();

  const handleSubmit = async (data) => {
    try {
      const response = await fetch('/api/accounting-period/periods', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        showErrorToast(error, toast);
        return;
      }

      const result = await response.json();
      showPeriodCreatedToast(result.data.period_name, toast);
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Available Helper Functions

From `lib/toast-error-handler.ts`:

- `showErrorToast(error, toast, customTitle?)` - Display any error as toast
- `showApiErrorToast(errorResponse, toast, customTitle?)` - Display API error response
- `showSuccessToast(action, toast, details?)` - Display success message
- `showValidationWarningToast(message, toast, details?)` - Display validation warning
- `showInfoToast(message, toast, details?)` - Display info message
- `showPeriodCreatedToast(periodName, toast)` - Period created success
- `showPeriodClosedToast(periodName, toast)` - Period closed success
- `showPeriodReopenedToast(periodName, toast)` - Period reopened success
- `showPeriodPermanentlyClosedToast(periodName, toast)` - Permanent close success
- `showValidationResultsToast(passed, failedCount, toast)` - Validation results
- `showConfigUpdatedToast(toast)` - Config updated success

## Configuration

### ToastProvider Props

```typescript
<ToastProvider
  maxToasts={5}           // Maximum number of toasts (default: 5)
  defaultDuration={5000}  // Default duration in ms (default: 5000)
>
  {children}
</ToastProvider>
```

### Custom Toast Options

```typescript
const toastId = toast.showToast({
  type: 'success',
  title: 'Custom Toast',
  message: 'Optional message',
  duration: 5000,        // 0 = no auto-dismiss
  dismissible: true,     // false = can't be manually dismissed
});

// Manually dismiss later
toast.dismissToast(toastId);
```

## Styling

The toast system uses Tailwind CSS with the following color schemes:

- **Success**: Green (`bg-green-50`, `text-green-900`, etc.)
- **Error**: Red (`bg-red-50`, `text-red-900`, etc.)
- **Warning**: Yellow (`bg-yellow-50`, `text-yellow-900`, etc.)
- **Info**: Blue (`bg-blue-50`, `text-blue-900`, etc.)

Each toast includes:
- Icon based on type
- Title (required)
- Message (optional)
- Dismiss button (if dismissible)
- Border and shadow for depth

## Accessibility

The toast system includes proper ARIA attributes:

- `role="alert"` on each toast
- `aria-live="polite"` on the container
- `aria-atomic="true"` on the container
- `aria-label="Tutup"` on dismiss buttons

## Demo

Visit `/accounting-period/toast-demo` to see all toast types in action.

## Best Practices

1. **Use appropriate toast types**:
   - Success: For completed actions
   - Error: For failures and critical issues
   - Warning: For validation issues and non-critical problems
   - Info: For informational messages

2. **Keep messages concise**: Toasts should be brief and actionable

3. **Use appropriate durations**:
   - Success: 5000ms (default)
   - Error: 7000ms (longer for users to read)
   - Warning: 7000ms
   - Info: 5000ms

4. **Provide context**: Include relevant details in the message

5. **Use error handler integration**: For consistent error display across the app

6. **Don't overuse**: Toasts should be for important feedback only

7. **Test accessibility**: Ensure screen readers can announce toasts

## Examples

### Form Submission
```typescript
const handleSubmit = async (data) => {
  try {
    await submitForm(data);
    toast.success('Data Tersimpan', 'Form berhasil disubmit');
  } catch (error) {
    showErrorToast(error, toast);
  }
};
```

### Validation
```typescript
const validate = (data) => {
  if (!data.name) {
    toast.warning('Validasi Gagal', 'Nama harus diisi');
    return false;
  }
  return true;
};
```

### API Call with Retry
```typescript
import { withRetry } from '@/lib/accounting-period-error-handler';

const fetchData = async () => {
  try {
    const data = await withRetry(
      () => fetch('/api/data').then(r => r.json()),
      {
        onRetry: (attempt) => {
          toast.info('Mencoba Ulang', `Percobaan ke-${attempt}`);
        }
      }
    );
    toast.success('Data Berhasil Dimuat');
    return data;
  } catch (error) {
    showErrorToast(error, toast);
  }
};
```

## Troubleshooting

### Toasts not appearing
- Ensure `ToastProvider` wraps your component tree
- Check that `ToastContainer` is rendered in the layout
- Verify you're using the `useToast` hook correctly

### TypeScript errors
- Ensure you're importing from the correct paths
- Check that all required props are provided
- Verify the toast context is available

### Styling issues
- Ensure Tailwind CSS is properly configured
- Check that the `z-50` class is not being overridden
- Verify the fixed positioning is working

## Future Enhancements

Potential improvements for future versions:

- [ ] Toast positioning options (top-left, bottom-right, etc.)
- [ ] Custom icons
- [ ] Action buttons in toasts
- [ ] Progress bars for long operations
- [ ] Sound notifications
- [ ] Persistent toasts (saved to localStorage)
- [ ] Toast history/log
- [ ] Grouped toasts
- [ ] Rich content support (HTML, components)

## Related Files

- `lib/toast-context.tsx` - Context and provider
- `components/ToastContainer.tsx` - Toast rendering
- `lib/toast-error-handler.ts` - Error handler integration
- `lib/accounting-period-error-handler.ts` - Centralized error handler
- `app/layout.tsx` - Root layout with provider
- `lib/TOAST_USAGE_EXAMPLES.md` - Detailed usage examples
- `app/accounting-period/components/ToastExample.tsx` - Demo component
