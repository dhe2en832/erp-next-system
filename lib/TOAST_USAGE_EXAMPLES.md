# Toast Notification System - Usage Examples

## Overview

The toast notification system provides a centralized way to display user feedback for various actions in the application. It supports four types of notifications: success, error, warning, and info.

## Basic Usage

### 1. Import the Hook

```typescript
'use client';

import { useToast } from '@/lib/toast-context';
```

### 2. Use in Component

```typescript
function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      // Perform action
      await someApiCall();
      
      // Show success toast
      toast.success('Operasi Berhasil', 'Data telah disimpan');
    } catch (error) {
      // Show error toast
      toast.error('Operasi Gagal', 'Terjadi kesalahan saat menyimpan data');
    }
  };

  return (
    <button onClick={handleAction}>
      Simpan
    </button>
  );
}
```

## Toast Types

### Success Toast

```typescript
// Simple success
toast.success('Berhasil!');

// With message
toast.success('Data Tersimpan', 'Periode akuntansi telah dibuat');

// With custom duration (in milliseconds)
toast.success('Berhasil!', 'Operasi selesai', 3000);
```

### Error Toast

```typescript
// Simple error
toast.error('Gagal!');

// With message
toast.error('Kesalahan', 'Tidak dapat menyimpan data');

// With custom duration
toast.error('Kesalahan', 'Koneksi terputus', 10000);
```

### Warning Toast

```typescript
// Simple warning
toast.warning('Perhatian!');

// With message
toast.warning('Validasi Gagal', 'Beberapa field belum diisi');

// With custom duration
toast.warning('Perhatian!', 'Data akan dihapus', 7000);
```

### Info Toast

```typescript
// Simple info
toast.info('Informasi');

// With message
toast.info('Proses Berjalan', 'Sedang memproses data...');

// With custom duration
toast.info('Informasi', 'Proses akan memakan waktu', 5000);
```

## Integration with Error Handler

### Using the Error Handler Integration

```typescript
'use client';

import { useToast } from '@/lib/toast-context';
import { 
  showErrorToast, 
  showPeriodCreatedToast,
  showPeriodClosedToast 
} from '@/lib/toast-error-handler';

function PeriodManagement() {
  const toast = useToast();

  const createPeriod = async (data: any) => {
    try {
      const response = await fetch('/api/accounting-period/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const closePeriod = async (periodName: string) => {
    try {
      const response = await fetch('/api/accounting-period/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_name: periodName }),
      });

      if (!response.ok) {
        const error = await response.json();
        showErrorToast(error, toast);
        return;
      }

      showPeriodClosedToast(periodName, toast);
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  return (
    <div>
      {/* Your component UI */}
    </div>
  );
}
```

## Advanced Usage

### Custom Toast with All Options

```typescript
const toastId = toast.showToast({
  type: 'success',
  title: 'Custom Toast',
  message: 'This is a custom toast with all options',
  duration: 5000,
  dismissible: true,
});

// Manually dismiss the toast later
toast.dismissToast(toastId);
```

### Non-Dismissible Toast

```typescript
toast.showToast({
  type: 'info',
  title: 'Processing...',
  message: 'Please wait while we process your request',
  duration: 0, // Won't auto-dismiss
  dismissible: false, // Can't be manually dismissed
});
```

### Multiple Toasts

The system automatically handles multiple toasts and limits them to a maximum of 5 (configurable in ToastProvider).

```typescript
toast.success('First action completed');
toast.success('Second action completed');
toast.success('Third action completed');
// All will be displayed simultaneously
```

## Integration Examples

### Form Submission

```typescript
const handleSubmit = async (formData: any) => {
  try {
    // Validate
    const validation = await validateData(formData);
    if (!validation.passed) {
      toast.warning(
        'Validasi Gagal', 
        `${validation.errors.length} kesalahan ditemukan`
      );
      return;
    }

    // Submit
    const response = await submitData(formData);
    toast.success('Data Tersimpan', 'Form berhasil disubmit');
    
  } catch (error) {
    showErrorToast(error, toast);
  }
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
        maxRetries: 3,
        onRetry: (attempt) => {
          toast.info('Mencoba Ulang', `Percobaan ke-${attempt}`);
        }
      }
    );
    
    toast.success('Data Berhasil Dimuat');
    return data;
  } catch (error) {
    showErrorToast(error, toast, 'Gagal Memuat Data');
  }
};
```

### Validation Results

```typescript
import { showValidationResultsToast } from '@/lib/toast-error-handler';

const validatePeriod = async (periodName: string) => {
  const response = await fetch('/api/accounting-period/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period_name: periodName }),
  });

  const result = await response.json();
  
  const failedCount = result.validations.filter(v => !v.passed).length;
  showValidationResultsToast(result.all_passed, failedCount, toast);
};
```

## Configuration

### ToastProvider Props

```typescript
<ToastProvider
  maxToasts={5}        // Maximum number of toasts to display (default: 5)
  defaultDuration={5000} // Default duration in ms (default: 5000)
>
  {children}
</ToastProvider>
```

## Styling

The toast system uses Tailwind CSS classes and supports the following color schemes:

- Success: Green
- Error: Red
- Warning: Yellow
- Info: Blue

Each toast includes:
- Icon based on type
- Title (required)
- Message (optional)
- Dismiss button (if dismissible)
- Auto-dismiss after duration

## Accessibility

The toast system includes proper ARIA attributes:
- `role="alert"` on each toast
- `aria-live="polite"` on the container
- `aria-atomic="true"` on the container
- `aria-label` on dismiss buttons

## Best Practices

1. Use appropriate toast types:
   - Success: For completed actions
   - Error: For failures and critical issues
   - Warning: For validation issues and non-critical problems
   - Info: For informational messages

2. Keep messages concise and actionable

3. Use longer durations for errors (7000ms) and shorter for success (5000ms)

4. Provide context in the message when possible

5. Use the error handler integration for consistent error display

6. Don't overuse toasts - they should be for important feedback only
