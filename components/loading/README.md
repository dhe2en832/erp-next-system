# Loading States System

Sistem loading states yang komprehensif untuk memberikan feedback visual kepada user selama operasi async.

## Komponen

### 1. LoadingSpinner

Spinner animasi untuk indikasi loading.

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `variant`: 'primary' | 'secondary' | 'white' (default: 'primary')
- `className`: string (optional)

**Contoh Penggunaan:**

```tsx
import LoadingSpinner from '@/components/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// Custom size and variant
<LoadingSpinner size="lg" variant="white" />

// Inline with text
<div className="flex items-center">
  <LoadingSpinner size="sm" className="mr-2" />
  <span>Loading data...</span>
</div>
```

### 2. LoadingButton

Button dengan loading state built-in.

**Props:**
- `loading`: boolean (default: false)
- `loadingText`: string (optional) - Text to show when loading
- `variant`: 'primary' | 'secondary' | 'danger' | 'success' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `children`: ReactNode
- All standard button HTML attributes

**Contoh Penggunaan:**

```tsx
import LoadingButton from '@/components/LoadingButton';

function MyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoadingButton
      loading={isSubmitting}
      loadingText="Menyimpan..."
      variant="primary"
      onClick={handleSubmit}
    >
      Simpan
    </LoadingButton>
  );
}
```

### 3. LoadingOverlay

Overlay yang menutupi area atau full screen selama loading.

**Props:**
- `isLoading`: boolean (required)
- `message`: string (default: 'Loading...')
- `fullScreen`: boolean (default: false)
- `className`: string (optional)

**Contoh Penggunaan:**

```tsx
import LoadingOverlay from '@/components/LoadingOverlay';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="relative">
      <LoadingOverlay 
        isLoading={isLoading} 
        message="Memuat data periode..." 
      />
      
      {/* Your content */}
      <div>Content here</div>
    </div>
  );
}

// Full screen overlay
<LoadingOverlay 
  isLoading={isProcessing} 
  message="Memproses penutupan periode..."
  fullScreen 
/>
```

### 4. Skeleton Loaders

Skeleton screens untuk berbagai jenis konten.

**Komponen:**
- `Skeleton` - Base skeleton
- `SkeletonText` - Text lines
- `SkeletonCard` - Card layout
- `SkeletonTable` - Table layout
- `SkeletonList` - List items
- `SkeletonPeriodDashboard` - Period dashboard specific
- `SkeletonPeriodDetail` - Period detail specific

**Contoh Penggunaan:**

```tsx
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonPeriodDashboard 
} from '@/components/SkeletonLoader';

function PeriodList() {
  const { data, isLoading } = usePeriods();

  if (isLoading) {
    return <SkeletonTable rows={5} columns={4} />;
  }

  return <table>{/* actual data */}</table>;
}

function PeriodDashboard() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <SkeletonPeriodDashboard />;
  }

  return <div>{/* actual dashboard */}</div>;
}
```

## Hooks

### useLoading

Hook untuk manage single loading state.

**Returns:**
- `isLoading`: boolean
- `startLoading`: () => void
- `stopLoading`: () => void
- `withLoading`: <T>(fn: () => Promise<T>) => Promise<T>

**Contoh Penggunaan:**

```tsx
import { useLoading } from '@/lib/use-loading';

function MyComponent() {
  const { isLoading, withLoading } = useLoading();

  const handleAction = async () => {
    await withLoading(async () => {
      await performAsyncOperation();
    });
  };

  return (
    <LoadingButton loading={isLoading} onClick={handleAction}>
      Execute
    </LoadingButton>
  );
}
```

### useMultipleLoading

Hook untuk manage multiple loading states dengan keys.

**Returns:**
- `isLoading`: (key: string) => boolean
- `isAnyLoading`: boolean
- `startLoading`: (key: string) => void
- `stopLoading`: (key: string) => void
- `withLoading`: <T>(key: string, fn: () => Promise<T>) => Promise<T>

**Contoh Penggunaan:**

```tsx
import { useMultipleLoading } from '@/lib/use-loading';

function PeriodActions() {
  const { isLoading, withLoading } = useMultipleLoading();

  const handleClose = async () => {
    await withLoading('close', async () => {
      await closePeriod();
    });
  };

  const handleReopen = async () => {
    await withLoading('reopen', async () => {
      await reopenPeriod();
    });
  };

  return (
    <div>
      <LoadingButton 
        loading={isLoading('close')} 
        onClick={handleClose}
      >
        Close Period
      </LoadingButton>
      
      <LoadingButton 
        loading={isLoading('reopen')} 
        onClick={handleReopen}
      >
        Reopen Period
      </LoadingButton>
    </div>
  );
}
```

## Best Practices

### 1. Gunakan Skeleton untuk Data Loading

Gunakan skeleton screens untuk initial data loading, bukan spinner:

```tsx
// ✅ Good - Skeleton shows structure
if (isLoading) {
  return <SkeletonTable rows={5} columns={4} />;
}

// ❌ Avoid - Spinner doesn't show structure
if (isLoading) {
  return <LoadingSpinner />;
}
```

### 2. Disable Buttons During Processing

Selalu disable buttons saat processing:

```tsx
// ✅ Good - Button disabled automatically
<LoadingButton loading={isSubmitting} onClick={handleSubmit}>
  Submit
</LoadingButton>

// ❌ Avoid - Button can be clicked multiple times
<button onClick={handleSubmit}>Submit</button>
```

### 3. Provide Meaningful Loading Messages

Berikan pesan yang jelas tentang apa yang sedang terjadi:

```tsx
// ✅ Good - Specific message
<LoadingOverlay 
  isLoading={isClosing} 
  message="Menutup periode dan membuat jurnal penutup..." 
/>

// ❌ Avoid - Generic message
<LoadingOverlay isLoading={isClosing} message="Loading..." />
```

### 4. Use withLoading Helper

Gunakan `withLoading` untuk automatic loading state management:

```tsx
// ✅ Good - Automatic state management
const { withLoading } = useLoading();

const handleSubmit = async () => {
  await withLoading(async () => {
    await submitData();
  });
};

// ❌ Avoid - Manual state management (error-prone)
const handleSubmit = async () => {
  setIsLoading(true);
  await submitData();
  setIsLoading(false); // Might not run if error occurs
};
```

### 5. Prevent Multiple Submissions

Disable form elements saat processing:

```tsx
function MyForm() {
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
}
```

## Integration dengan Toast

Kombinasikan loading states dengan toast notifications:

```tsx
import { useToast } from '@/lib/toast-context';
import { useLoading } from '@/lib/use-loading';

function PeriodClosing() {
  const { success, error } = useToast();
  const { isLoading, withLoading } = useLoading();

  const handleClose = async () => {
    try {
      await withLoading(async () => {
        await closePeriod();
      });
      success('Periode berhasil ditutup');
    } catch (err) {
      error('Gagal menutup periode', err.message);
    }
  };

  return (
    <LoadingButton loading={isLoading} onClick={handleClose}>
      Close Period
    </LoadingButton>
  );
}
```

## Accessibility

Semua loading components sudah include accessibility features:

- `role="status"` untuk screen readers
- `aria-label` dan `aria-live` attributes
- `aria-busy` untuk loading overlays
- Semantic HTML dan keyboard navigation support

## Styling

Semua components menggunakan Tailwind CSS dan mendukung custom className untuk styling tambahan:

```tsx
<LoadingSpinner className="text-red-500" />
<LoadingButton className="w-full" loading={isLoading}>
  Full Width Button
</LoadingButton>
```
