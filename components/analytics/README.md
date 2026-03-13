# Analytics Shared Components

This directory contains shared utilities and components used across all analytics charts in the Dashboard Analytics Enhancement feature.

## Components

### ChartLoadingSkeleton
Loading skeleton for chart components with animated pulse effect.

**Props:**
- `height?: number` - Height of skeleton in pixels (default: 300)
- `showTitle?: boolean` - Show title skeleton (default: true)
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { ChartLoadingSkeleton } from '@/components/analytics';

<ChartLoadingSkeleton height={300} showTitle={true} />
```

### CardLoadingSkeleton
Loading skeleton for card-based analytics components.

**Props:**
- `showStats?: boolean` - Show stat rows (default: true)
- `statCount?: number` - Number of stat rows (default: 3)
- `showAction?: boolean` - Show action button skeleton (default: false)
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { CardLoadingSkeleton } from '@/components/analytics';

<CardLoadingSkeleton statCount={3} showAction={false} />
```

### EmptyState
Friendly empty state display when no data is available.

**Props:**
- `title?: string` - Title message (default: "Tidak Ada Data")
- `message: string` - Description message (required)
- `icon?: 'chart' | 'trending' | 'package' | 'users'` - Icon type (default: 'chart')
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { EmptyState } from '@/components/analytics';

<EmptyState 
  message="Tidak ada data produk terlaris"
  icon="chart"
/>
```

### ErrorState
Error state display with retry functionality.

**Props:**
- `message: string` - Error message (required)
- `onRetry?: () => void` - Retry callback function
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { ErrorState } from '@/components/analytics';

<ErrorState 
  message="Gagal memuat data. Silakan coba lagi."
  onRetry={() => fetchData()}
/>
```

## Utilities (lib/chart-utils.ts)

### Color Constants

```typescript
import { CHART_COLORS } from '@/lib/chart-utils';

// Available colors:
CHART_COLORS.indigo      // Primary brand color
CHART_COLORS.green       // Success/positive
CHART_COLORS.orange      // Warning
CHART_COLORS.red         // Danger/critical
CHART_COLORS.gray        // Neutral
```

### Formatting Functions

#### formatChartCurrency(amount: number): string
Formats currency in Indonesian Rupiah format.
```typescript
formatChartCurrency(1000000) // "Rp 1.000.000,00"
```

#### formatChartCurrencyShort(amount: number): string
Formats currency with K/M/B suffixes for space-constrained displays.
```typescript
formatChartCurrencyShort(1500000) // "Rp 1,5M"
```

#### formatMonthYear(monthString: string): string
Formats month-year for chart labels.
```typescript
formatMonthYear('2024-01') // "Jan 2024"
```

#### formatChartDate(dateString: string | Date): string
Formats date for chart tooltips.
```typescript
formatChartDate('2024-01-15') // "15 Januari 2024"
```

#### formatChartNumber(value: number): string
Formats numbers with Indonesian locale.
```typescript
formatChartNumber(1234567) // "1.234.567"
```

#### formatPercentage(value: number): string
Formats percentage values.
```typescript
formatPercentage(75.5) // "75.5%"
```

### Tooltip Formatters

```typescript
import { currencyTooltipFormatter } from '@/lib/chart-utils';

// Use in Recharts components:
<Bar dataKey="amount" formatter={currencyTooltipFormatter} />
```

### Helper Functions

#### truncateLabel(label: string, maxLength?: number): string
Truncates long labels for chart display.
```typescript
truncateLabel('Very Long Product Name', 10) // "Very Long ..."
```

#### getResponsiveChartHeight(isMobile: boolean): number
Returns appropriate chart height based on viewport.

#### getChartMargin()
Returns standard margin configuration for Recharts.

## Requirements Fulfilled

- **Requirement 10.5**: Color palette constants following design system
- **Requirement 11.1**: Currency and date formatting utilities
- **Requirement 11.6**: Loading skeleton components
- **Requirements 1.4, 4.5, 14.2**: Empty state components
- **Requirements 14.3, 14.5**: Error state components with retry

## Design Principles

1. **Consistency**: All components follow the same design language
2. **Accessibility**: Proper ARIA labels and semantic HTML
3. **Responsiveness**: Components adapt to different screen sizes
4. **Reusability**: Highly configurable through props
5. **Indonesian Locale**: All text and formatting use Indonesian standards
