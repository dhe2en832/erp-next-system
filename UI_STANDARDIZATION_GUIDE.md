# ERPNext UI Standardization Guide

## 🎯 Overview
This guide establishes the standard UI/UX patterns based on the Purchase Order (PO) module. All ERP modules should follow these patterns for consistency, usability, and maintainability.

## �️ API Route Standards (Next.js 14+ App Router)

### Dynamic Route Pattern
```typescript
// File structure: app/api/[module]/[id]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // IMPORTANT: params is now a Promise in Next.js 14+
  const { id } = await params;
  
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  
  console.log('Document ID:', id);
  console.log('Company:', company);
  
  // ... rest of the logic
}
```

### Key Points for Next.js 14+:
- ✅ `params` is now a Promise - must be awaited
- ✅ Use proper typing: `Promise<{ id: string }>`
- ✅ Always await params before using
- ❌ Don't use old pattern: `{ params }: { params: { id: string } }`

### Standard API Response Pattern
```typescript
// Success response
return NextResponse.json({
  success: true,
  data: result,
});

// Error response
return NextResponse.json(
  { success: false, message: 'Error description' },
  { status: 400 }
);
```

## �📋 Module Structure Standard

### File Organization
```
app/[module-name]/
├── page.tsx                    # Main module page (list view)
├── [module-name]Main/
│   └── component.tsx          # Create/Edit form
├── [module-name]List/
│   └── component.tsx          # List view (if separate from page.tsx)
└── api/
    ├── route.ts               # Main API endpoints
    └── [name]/
        └── route.ts           # Detail API endpoints
```

## 🎨 Design System Standards

### Color Palette
```css
/* Primary Colors */
--indigo-600: #4F46E5    /* Primary actions, buttons */
--indigo-700: #4338CA    /* Primary hover states */

/* Status Colors */
--green-600: #16A34A     /* Success, Submit actions */
--green-700: #15803D     /* Success hover */
--yellow-600: #CA8A04    /* Warning, Edit actions */
--yellow-700: #A16207    /* Warning hover */
--orange-600: #EA580C    /* Secondary actions */
--orange-700: #C2410C    /* Secondary hover */
--blue-600: #2563EB      /* Information, View actions */
--blue-700: #1D4ED8      /* Information hover */
--red-600: #DC2626       /* Danger, Delete actions */
--red-700: #B91C1C       /* Danger hover */

/* Neutral Colors */
--gray-50: #F9FAFB
--gray-100: #F3F4F6
--gray-500: #6B7280
--gray-900: #111827
```

### Typography
```css
/* Headers */
.text-3xl.font-bold.text-gray-900    /* Page titles */
.text-lg.font-medium.text-gray-900    /* Section headers */
.text-sm.font-medium.text-gray-700     /* Form labels */

/* Body */
.text-sm.text-gray-600                /* Descriptions */
.text-sm.text-gray-500                /* Secondary info */
.text-xs.font-semibold                /* Status badges */
```

## 📝 Form Standards

### Form Layout Structure
```jsx
<div className="min-h-screen bg-gray-50">
  {/* Header */}
  <div className="bg-white shadow">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">[Module Name]</h1>
          <p className="mt-1 text-sm text-gray-600">[Module description]</p>
        </div>
        <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
          Kembali ke Daftar
        </button>
      </div>
    </div>
  </div>

  {/* Alerts */}
  {error && <ErrorAlert message={error} />}
  {success && <SuccessAlert message={success} />}

  {/* Form */}
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
    <form onSubmit={saveDoc} className="space-y-6">
      {/* Form sections */}
    </form>
  </div>
</div>
```

### Form Sections
```jsx
{/* Basic Information */}
<div className="bg-white shadow rounded-lg p-6">
  <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Dasar</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Form fields */}
  </div>
</div>
```

### Input Field Standards
```jsx
{/* Text Input */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Field Name *
  </label>
  <input
    type="text"
    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    value={value}
    onChange={handleChange}
    required
  />
</div>

{/* Select Input */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Select Field
  </label>
  <select
    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    value={value}
    onChange={handleChange}
  >
    <option value="">Pilih opsi</option>
    {/* Options */}
  </select>
</div>
```

### Currency Input (Advanced Pattern)
```jsx
// State for currency inputs
const [rateInputValues, setRateInputValues] = useState<{[key: number]: string}>({});

// Currency input component
<input
  type="text"
  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  value={rateInputValues[index] || (item.rate ? item.rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
  onChange={(e) => {
    const inputValue = e.target.value;
    setRateInputValues(prev => ({ ...prev, [index]: inputValue }));
    
    let value = inputValue.replace(/[^\d,]/g, '');
    value = value.replace(',', '.');
    const newRate = parseFloat(value) || 0;
    
    // Update actual data
    const newItems = [...selectedItems];
    newItems[index].rate = newRate;
    newItems[index].amount = newItems[index].qty * newRate;
    setSelectedItems(newItems);
  }}
  onFocus={(e) => {
    const rawValue = item.rate ? item.rate.toString() : '';
    setRateInputValues(prev => ({ ...prev, [index]: rawValue }));
    setTimeout(() => {
      e.target.value = rawValue;
      e.target.setSelectionRange(rawValue.length, rawValue.length);
    }, 0);
  }}
  onBlur={(e) => {
    const newRate = parseFloat(e.target.value.replace(',', '.')) || 0;
    const formattedValue = newRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setRateInputValues(prev => ({ ...prev, [index]: formattedValue }));
    
    // Update actual data
    const newItems = [...selectedItems];
    newItems[index].rate = newRate;
    newItems[index].amount = newItems[index].qty * newRate;
    setSelectedItems(newItems);
  }}
  placeholder="0,00"
/>
```

## 🔔 Alert Standards

### Modal Alert Pattern
```jsx
// State
const [showValidationAlert, setShowValidationAlert] = useState(false);
const [validationMessage, setValidationMessage] = useState('');

// Validation Alert Component
{showValidationAlert && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          {/* Warning Icon */}
          <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-gray-900">Validasi Diperlukan</h3>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">{validationMessage}</p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => setShowValidationAlert(false)}
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Mengerti
        </button>
      </div>
    </div>
  </div>
)}
```

### Success Alert with Countdown
```jsx
// State
const [redirectCountdown, setRedirectCountdown] = useState(0);

// Success Alert Component
{success && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          {/* Success Icon */}
          <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-gray-900">Berhasil!</h3>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">{success}</p>
        <p className="text-sm text-gray-600 mt-2">
          [Module] telah berhasil dibuat dan akan segera dialihkan ke daftar.
        </p>
        {redirectCountdown > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mengalihkan dalam <span className="font-bold text-green-600">{redirectCountdown}</span> detik...
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => router.push('/[module-path]')}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {redirectCountdown > 0 ? 'Langsung ke Daftar' : 'Ke Daftar [Module]'}
        </button>
      </div>
    </div>
  </div>
)}
```

## 📋 List View Standards

### List Layout Structure
```jsx
<div className="bg-white shadow overflow-hidden sm:rounded-md">
  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
    <h3 className="text-sm font-medium text-gray-900">
      [Module Name] ({items.length} items)
    </h3>
  </div>
  <ul className="divide-y divide-gray-200">
    {items.map((item, index) => (
      <li 
        key={item.name}
        onClick={() => handleItemClick(item.name)}
        className="cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-600 truncate">
                {item.name}
              </p>
              <p className="mt-1 text-sm text-gray-900">
                [Primary Field]: {item.primaryField}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-gray-500">
                [Date Field 1]: {item.date1}
              </p>
              <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                [Date Field 2]: {item.date2}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between sm:mt-0">
              <span className="font-medium text-sm text-gray-500">
                [Amount]: {item.currency} {item.amount.toLocaleString('id-ID')}
              </span>
              
              {/* Action buttons based on status */}
              <div className="ml-4 flex space-x-2">
                {/* View button - always available */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(item.name);
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                >
                  View
                </button>
                
                {/* Status-specific actions */}
                {item.status === 'Draft' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item.name);
                      }}
                      className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit(item.name);
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Submit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </li>
    ))}
  </ul>
  {items.length === 0 && (
    <div className="text-center py-12">
      <p className="text-gray-500">Tidak ada [module] ditemukan</p>
    </div>
  )}
</div>
```

### Status Color Function
```jsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Submitted': return 'bg-blue-100 text-blue-800';
    case 'Draft': return 'bg-yellow-100 text-yellow-800';
    case 'To Receive': return 'bg-orange-100 text-orange-800';
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'Cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

## 🔍 Filter & Search Standards

### Filter Section
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
  <div className="bg-white shadow rounded-lg p-4">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
        <input
          type="text"
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Cari berdasarkan nama atau [field]..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="To Receive">To Receive</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
      
      {/* Additional filters... */}
    </div>
    
    {/* Filter Actions */}
    <div className="mt-4 flex justify-end space-x-2">
      <button
        onClick={() => {
          // Reset all filters
          setSearchTerm('');
          setStatusFilter('');
          // ... reset other filters
        }}
        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
      >
        Hapus Filter
      </button>
      <button
        onClick={fetchData}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Terapkan Filter
      </button>
    </div>
  </div>
</div>
```

## 🎯 Button Standards

### Primary Actions
```jsx
<button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  Buat [Module]
</button>
```

### Secondary Actions
```jsx
<button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">
  Batal
</button>
```

### Form Submit with Loading
```jsx
<button
  type="submit"
  disabled={loading || !isValid}
  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
>
  {loading ? (
    <>
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Menyimpan...
    </>
  ) : (
    'Buat [Module]'
  )}
</button>
```

## 🔄 Loading States

### Page Loading
```jsx
if (loading) {
  return <LoadingSpinner message="Memuat [Module]..." />;
}
```

### Form Loading
```jsx
const [loading, setLoading] = useState(false);

// In form submit
setLoading(true);
try {
  // API call
} finally {
  setLoading(false);
}
```

## 📱 Responsive Design

### Grid Layouts
```jsx
<!-- Responsive grid -->
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <!-- Form fields -->
</div>

<!-- Responsive flex -->
<div className="flex flex-col sm:flex-row sm:justify-between">
  <!-- Content -->
</div>
```

## 🧪 Validation Standards

### Form Validation
```jsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Basic validation
  if (!requiredField || items.length === 0) {
    setError('Silakan lengkapi semua field yang wajib diisi');
    return;
  }
  
  setLoading(true);
  setError('');
  setSuccess('');
  
  try {
    // API call
  } catch (err) {
    setError('Gagal menyimpan data');
  } finally {
    setLoading(false);
  }
};
```

### Field Validation with Modal Alert
```jsx
const openItemDialog = (index: number) => {
  // Validate prerequisites
  if (!requiredField) {
    setValidationMessage('Silakan pilih [field] terlebih dahulu');
    setShowValidationAlert(true);
    return;
  }
  
  // Proceed with action
  setCurrentItemIndex(index);
  setShowItemDialog(true);
};
```

## 🎯 Implementation Checklist

For each new module, ensure:

- [ ] Follow file structure standard
- [ ] Use consistent color palette
- [ ] Implement modal alerts for validation
- [ ] Add success alerts with countdown
- [ ] Use list layout for data display
- [ ] Include search and filter functionality
- [ ] Add proper loading states
- [ ] Implement responsive design
- [ ] Use standard button styles
- [ ] Add form validation
- [ ] Include pagination for large datasets
- [ ] Use currency input pattern for monetary fields

## 📚 Reference Implementation

See the Purchase Order module for complete implementation:
- `app/purchase-orders/poMain/component.tsx` - Form implementation
- `app/purchase-orders/poList/component.tsx` - List implementation
- `app/api/purchase-orders/route.ts` - API implementation

This serves as the template for all other ERP modules.
