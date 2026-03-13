# Responsive Grid Layout Reference

Quick reference for responsive breakpoints used in Dashboard Analytics Enhancement.

## Tailwind CSS Breakpoints

| Breakpoint | Min Width | Description |
|------------|-----------|-------------|
| (default)  | 0px       | Mobile-first (all devices) |
| `md:`      | 768px     | Tablet and above |
| `lg:`      | 1024px    | Desktop and above |

## Grid Patterns by Section

### Pattern A: 3-Column Grid (Most Sections)
**Used by:** CustomerBehaviorSection, SalesPerformanceSection, InventoryAnalyticsSection, SupplierAnalyticsSection

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 3 child components */}
</div>
```

**Behavior:**
- **Mobile (< 768px):** 1 column (stacked vertically)
- **Tablet (768px - 1023px):** 2 columns (2 items per row)
- **Desktop (≥ 1024px):** 3 columns (3 items per row)

**Visual Layout:**

```
Mobile (< 768px):
┌─────────────┐
│   Item 1    │
├─────────────┤
│   Item 2    │
├─────────────┤
│   Item 3    │
└─────────────┘

Tablet (768px - 1023px):
┌──────────┬──────────┐
│  Item 1  │  Item 2  │
├──────────┴──────────┤
│      Item 3         │
└─────────────────────┘

Desktop (≥ 1024px):
┌────────┬────────┬────────┐
│ Item 1 │ Item 2 │ Item 3 │
└────────┴────────┴────────┘
```

### Pattern B: 2-Column Grid
**Used by:** CommissionTrackerSection

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 2 child components */}
</div>
```

**Behavior:**
- **Mobile (< 768px):** 1 column (stacked vertically)
- **Tablet (768px - 1023px):** 1 column (stacked vertically)
- **Desktop (≥ 1024px):** 2 columns (2 items per row)

**Visual Layout:**

```
Mobile & Tablet (< 1024px):
┌─────────────┐
│   Item 1    │
├─────────────┤
│   Item 2    │
└─────────────┘

Desktop (≥ 1024px):
┌──────────┬──────────┐
│  Item 1  │  Item 2  │
└──────────┴──────────┘
```

### Pattern C: Single Component
**Used by:** TopProductsChart

```tsx
<div className="bg-white rounded-lg shadow p-6">
  <ResponsiveContainer width="100%" height={300}>
    {/* Chart content */}
  </ResponsiveContainer>
</div>
```

**Behavior:**
- **All viewports:** Full width of container
- Chart scales responsively using `ResponsiveContainer`

## Implementation Examples

### Example 1: CustomerBehaviorSection

```tsx
export default function CustomerBehaviorSection({ companyFilter }: Props) {
  return (
    <section className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Perilaku Pelanggan
        </h2>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BestCustomersChart companyFilter={companyFilter} />
        <WorstCustomersChart companyFilter={companyFilter} />
        <BadDebtCustomersChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
```

### Example 2: CommissionTrackerSection

```tsx
export default function CommissionTrackerSection({ companyFilter }: Props) {
  return (
    <section className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tracking Komisi Sales
        </h2>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutstandingCommissionCard companyFilter={companyFilter} />
        <PaidCommissionTrendChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
```

## Gap Spacing

All grids use `gap-6` which translates to:
- **Gap size:** 1.5rem (24px)
- **Consistent spacing** between grid items at all breakpoints

## Chart Responsiveness

All individual chart components use recharts `ResponsiveContainer`:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    {/* Chart configuration */}
  </BarChart>
</ResponsiveContainer>
```

This ensures:
- Charts scale to fit their container width
- Fixed height of 300px for consistency
- Proper rendering at all viewport sizes

## Testing Viewports

Recommended viewport sizes for testing:

| Device Type | Width | Height | Notes |
|-------------|-------|--------|-------|
| Mobile Small | 375px | 667px | iPhone SE |
| Mobile Large | 414px | 896px | iPhone 11 Pro Max |
| Tablet Portrait | 768px | 1024px | iPad |
| Tablet Landscape | 1024px | 768px | iPad Landscape |
| Desktop Small | 1280px | 720px | Laptop |
| Desktop Large | 1920px | 1080px | Full HD |

## Browser DevTools Testing

### Chrome DevTools
1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device or enter custom dimensions
4. Test responsive breakpoints

### Firefox DevTools
1. Open DevTools (F12)
2. Click "Responsive Design Mode" (Ctrl+Shift+M)
3. Select device or enter custom dimensions
4. Test responsive breakpoints

## Accessibility Considerations

- **Touch targets:** Minimum 44x44px on mobile (verified in individual chart components)
- **Text readability:** Font sizes scale appropriately at all breakpoints
- **Color contrast:** Minimum 4.5:1 ratio maintained (using Tailwind color palette)
- **Keyboard navigation:** All interactive elements are keyboard accessible

## Performance Notes

- **Mobile-first approach:** Base styles apply to mobile, overridden at larger breakpoints
- **CSS Grid:** Hardware-accelerated, performant layout system
- **No JavaScript layout calculations:** Pure CSS responsive design
- **Lazy loading:** Components can be lazy-loaded if below the fold

## Summary

✅ All analytics sections implement proper responsive breakpoints  
✅ Mobile-first design approach  
✅ Consistent gap spacing (24px)  
✅ Charts use ResponsiveContainer for fluid scaling  
✅ Follows Tailwind CSS best practices  
