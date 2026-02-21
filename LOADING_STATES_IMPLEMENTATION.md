# Loading States Implementation Summary

## Overview

Implementasi sistem loading states yang komprehensif untuk fitur Accounting Period Closing. Sistem ini menyediakan feedback visual yang jelas kepada user selama operasi async, mencegah multiple submissions, dan meningkatkan user experience.

## Components Implemented

### 1. Core Components

#### LoadingSpinner (`components/LoadingSpinner.tsx`)
- Spinner animasi dengan 3 sizes (sm, md, lg, xl)
- 3 variants (primary, secondary, white)
- Accessible dengan role="status" dan aria-label
- Dapat digunakan inline atau standalone

#### LoadingButton (`components/LoadingButton.tsx`)
- Button dengan loading state built-in
- Automatically disables saat loading
- Menampilkan spinner dan optional loading text
- 4 variants (primary, secondary, danger, success)
- 3 sizes (sm, md, lg)

#### LoadingOverlay (`components/LoadingOverlay.tsx`)
- Overlay untuk container atau full screen
- Backdrop blur effect
- Custom loading message
- Prevents user interaction saat loading

#### SkeletonLoader (`components/SkeletonLoader.tsx`)
- Base Skeleton component
- SkeletonText - untuk text lines
- SkeletonCard - untuk card layouts
- SkeletonTable - untuk table layouts
- SkeletonList - untuk list items
- SkeletonPeriodDashboard - specific untuk period dashboard
- SkeletonPeriodDetail - specific untuk period detail

### 2. Hooks

#### useLoading (`lib/use-loading.ts`)
Hook untuk manage single loading state dengan utilities:
- `isLoading`: boolean state
- `startLoading()`: manual start
- `stopLoading()`: manual stop
- `withLoading(fn)`: automatic wrapper untuk async functions

#### useMultipleLoading (`lib/use-loading.ts`)
Hook untuk manage multiple loading states dengan keys:
- `isLoading(key)`: check specific loading state
- `isAnyLoading`: check if any operation is loading
- `startLoading(key)`: start specific loading
- `stopLoading(key)`: stop specific loading
- `withLoading(key, fn)`: automatic wrapper dengan key

## File Structure

```
erp-next-system/
├── components/
│   ├── LoadingSpinner.tsx          # Spinner component
│   ├── LoadingButton.tsx           # Button with loading state
│   ├── LoadingOverlay.tsx          # Overlay component
│   ├── SkeletonLoader.tsx          # Skeleton components
│   └── loading/
│       ├── index.ts                # Central exports
│       ├── README.md               # Documentation
│       └── INTEGRATION_EXAMPLES.md # Usage examples
├── lib/
│   └── use-loading.ts              # Loading hooks
├── app/accounting-period/
│   ├── components/
│   │   └── LoadingExample.tsx      # Demo component
│   └── loading-demo/
│       └── page.tsx                # Demo page
└── LOADING_STATES_IMPLEMENTATION.md # This file
```

## Key Features

### 1. Comprehensive Loading Indicators
- Spinners untuk inline loading
- Buttons dengan loading state
- Overlays untuk blocking operations
- Skeleton screens untuk data loading

### 2. Automatic State Management
- `withLoading` helper untuk automatic loading state
- Error handling built-in
- Prevents memory leaks dengan proper cleanup

### 3. Accessibility
- Proper ARIA attributes (role, aria-label, aria-live, aria-busy)
- Screen reader support
- Keyboard navigation support
- Semantic HTML

### 4. Flexible Styling
- Tailwind CSS based
- Customizable via className prop
- Multiple variants dan sizes
- Responsive design

### 5. Developer Experience
- TypeScript support
- Clear API
- Comprehensive documentation
- Integration examples

## Usage Patterns

### Pattern 1: Simple Button Loading
```tsx
const { isLoading, withLoading } = useLoading();

const handleSubmit = async () => {
  await withLoading(async () => {
    await submitData();
  });
};

return (
  <LoadingButton loading={isLoading} onClick={handleSubmit}>
    Submit
  </LoadingButton>
);
```

### Pattern 2: Multiple Actions
```tsx
const { isLoading, withLoading } = useMultipleLoading();

return (
  <>
    <LoadingButton 
      loading={isLoading('close')} 
      onClick={() => withLoading('close', closePeriod)}
    >
      Close
    </LoadingButton>
    <LoadingButton 
      loading={isLoading('reopen')} 
      onClick={() => withLoading('reopen', reopenPeriod)}
    >
      Reopen
    </LoadingButton>
  </>
);
```

### Pattern 3: Data Loading with Skeleton
```tsx
if (isLoading) {
  return <SkeletonTable rows={5} columns={4} />;
}

return <table>{/* actual data */}</table>;
```

### Pattern 4: Form with Disabled State
```tsx
const { isLoading, withLoading } = useLoading();

return (
  <form>
    <input disabled={isLoading} />
    <select disabled={isLoading}>...</select>
    <LoadingButton loading={isLoading} type="submit">
      Submit
    </LoadingButton>
  </form>
);
```

### Pattern 5: Overlay for Long Operations
```tsx
const [isProcessing, setIsProcessing] = useState(false);

return (
  <div className="relative">
    <LoadingOverlay 
      isLoading={isProcessing} 
      message="Menutup periode dan membuat jurnal penutup..."
    />
    {/* content */}
  </div>
);
```

## Integration with Existing Systems

### Toast Notifications
Loading states bekerja seamlessly dengan toast notification system:

```tsx
const { success, error } = useToast();
const { isLoading, withLoading } = useLoading();

const handleAction = async () => {
  try {
    await withLoading(async () => {
      await performAction();
    });
    success('Action completed!');
  } catch (err) {
    error('Action failed', err.message);
  }
};
```

### Error Handler
Compatible dengan centralized error handler:

```tsx
import { handleAccountingPeriodError } from '@/lib/accounting-period-error-handler';

const handleAction = async () => {
  try {
    await withLoading(async () => {
      await performAction();
    });
  } catch (err) {
    handleAccountingPeriodError(err, toast);
  }
};
```

## Best Practices

1. **Use Skeleton for Initial Load**: Skeleton screens lebih baik daripada spinners untuk initial data loading karena menunjukkan struktur konten

2. **Disable During Processing**: Selalu disable buttons dan form elements saat processing untuk prevent multiple submissions

3. **Specific Messages**: Berikan loading messages yang spesifik dan deskriptif

4. **Use withLoading Helper**: Gunakan `withLoading` untuk automatic state management dan error handling

5. **Multiple States**: Gunakan `useMultipleLoading` untuk track multiple independent operations

6. **Combine with Toast**: Gunakan toast notifications untuk feedback setelah operasi selesai

7. **Accessibility**: Semua components sudah include accessibility features, jangan override tanpa alasan kuat

## Testing

Components dapat di-test dengan:

```tsx
import { render, screen } from '@testing-library/react';
import LoadingButton from '@/components/LoadingButton';

test('shows loading state', () => {
  render(<LoadingButton loading={true}>Submit</LoadingButton>);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

## Demo

Demo lengkap tersedia di:
- URL: `/accounting-period/loading-demo`
- Component: `app/accounting-period/components/LoadingExample.tsx`

Demo menunjukkan:
- Semua loading components
- Different sizes dan variants
- Integration patterns
- Best practices

## Documentation

Dokumentasi lengkap tersedia di:
- `components/loading/README.md` - Component documentation
- `components/loading/INTEGRATION_EXAMPLES.md` - Integration examples

## Requirements Validation

Task 21.3 requirements:
- ✅ Loading indicators untuk async operations
- ✅ Skeleton screens untuk data loading
- ✅ Disable buttons during processing
- ✅ Menggunakan Tailwind CSS untuk styling
- ✅ Comprehensive documentation
- ✅ Integration examples

## Next Steps

1. Integrate loading states ke existing components:
   - PeriodDashboard
   - PeriodDetail
   - ClosingWizard
   - Configuration pages

2. Add loading states ke API calls:
   - Period CRUD operations
   - Validation checks
   - Closing/reopening operations
   - Report generation

3. Test dengan real data dan operations

4. Collect user feedback dan iterate

## Conclusion

Sistem loading states yang komprehensif telah diimplementasikan dengan:
- 4 core components (Spinner, Button, Overlay, Skeleton)
- 2 custom hooks (useLoading, useMultipleLoading)
- Comprehensive documentation
- Integration examples
- Demo page
- Accessibility support
- TypeScript support

Sistem ini siap digunakan di seluruh aplikasi Accounting Period Closing dan dapat di-extend untuk fitur lain.
