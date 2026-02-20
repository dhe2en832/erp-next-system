# Invoice Components

Reusable UI components for discount and tax implementation in the ERP system.

## Components

### 1. DiscountInput

Component untuk input diskon dengan dukungan persentase atau jumlah rupiah.

**Features:**
- Support input discount_percentage atau discount_amount
- Auto-calculate nilai yang lain saat user input
- Real-time validation (0-100% atau 0-subtotal)
- Display error messages
- Format currency Indonesia (Rp)

**Props:**
```typescript
interface DiscountInputProps {
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  onChange: (data: { discountPercentage: number; discountAmount: number }) => void;
  type?: 'percentage' | 'amount';
}
```

**Usage:**
```tsx
import { DiscountInput } from '@/components/invoice';

<DiscountInput
  subtotal={1000000}
  discountPercentage={10}
  discountAmount={100000}
  onChange={(data) => {
    console.log('Discount:', data);
  }}
  type="percentage"
/>
```

**Validation Rules:**
- Persentase diskon: 0-100%
- Jumlah diskon: 0 - subtotal
- Negative values tidak diperbolehkan

---

### 2. TaxTemplateSelect

Component dropdown untuk memilih template pajak dari ERPNext.

**Features:**
- Fetch tax templates dari API `/api/setup/tax-templates`
- Display dropdown dengan template title dan rate
- Support filtering by type (Sales/Purchase)
- Display template details (account head, rate)
- Error handling dan retry mechanism

**Props:**
```typescript
interface TaxTemplateSelectProps {
  type: 'Sales' | 'Purchase';
  value?: string;
  onChange: (template: TaxTemplate | null) => void;
  company: string;
}

interface TaxTemplate {
  name: string;
  title: string;
  company: string;
  is_default: boolean;
  taxes: Array<{
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
  }>;
}
```

**Usage:**
```tsx
import { TaxTemplateSelect } from '@/components/invoice';

<TaxTemplateSelect
  type="Sales"
  value="PPN 11%"
  onChange={(template) => {
    console.log('Selected template:', template);
  }}
  company="BAC"
/>
```

**API Endpoint:**
- GET `/api/setup/tax-templates?type=Sales&company=BAC`

---

### 3. InvoiceSummary

Component untuk menampilkan ringkasan invoice dengan breakdown lengkap.

**Features:**
- Display breakdown: Subtotal, Diskon, Subtotal setelah Diskon, Pajak, Grand Total
- Format currency Indonesia: "Rp" prefix, thousand separator (.), 2 decimal places
- Update real-time saat ada perubahan items/discount/tax
- Support multiple taxes dengan add/deduct
- Display total items dan quantity

**Props:**
```typescript
interface InvoiceSummaryProps {
  items: InvoiceItem[];
  discountAmount?: number;
  discountPercentage?: number;
  taxes?: TaxRow[];
}

interface InvoiceItem {
  qty: number;
  rate: number;
  amount?: number;
}

interface TaxRow {
  charge_type: string;
  account_head: string;
  description?: string;
  rate: number;
  tax_amount?: number;
  add_deduct_tax?: 'Add' | 'Deduct';
}
```

**Usage:**
```tsx
import { InvoiceSummary } from '@/components/invoice';

<InvoiceSummary
  items={[
    { qty: 10, rate: 100000 },
    { qty: 5, rate: 50000 }
  ]}
  discountPercentage={10}
  taxes={[
    {
      charge_type: 'On Net Total',
      account_head: '2210 - Hutang PPN',
      description: 'PPN 11%',
      rate: 11,
      add_deduct_tax: 'Add'
    }
  ]}
/>
```

**Calculation Logic:**
1. Subtotal = Sum of (qty × rate) for all items
2. Discount = discountAmount OR (discountPercentage / 100) × subtotal
3. Net Total = Subtotal - Discount
4. Tax Amount = (rate / 100) × Net Total (for each tax)
5. Grand Total = Net Total + Total Tax Amount

---

## Testing

All components have comprehensive test coverage:

```bash
# Test DiscountInput
npm run test:discount-input

# Test TaxTemplateSelect
npm run test:tax-template-select

# Test InvoiceSummary
npm run test:invoice-summary
```

**Test Coverage:**
- ✓ Input validation
- ✓ Calculation accuracy
- ✓ Error handling
- ✓ Currency formatting
- ✓ Real-time updates

---

## Requirements Validation

These components validate the following requirements:

- **Requirement 4.1**: Discount input section in invoice form
- **Requirement 4.2**: Tax template selection dropdown
- **Requirement 4.3**: Auto-calculate discount_amount from percentage
- **Requirement 4.4**: Auto-calculate discount_percentage from amount
- **Requirement 4.5**: Auto-calculate tax amount from template
- **Requirement 4.6**: Display invoice summary breakdown
- **Requirement 4.7**: Real-time calculation updates
- **Requirement 5.1**: Validate discount_percentage (0-100)
- **Requirement 5.2**: Validate discount_amount (0-subtotal)

---

## Integration

These components are designed to be used in:
- Sales Invoice Form (`app/sales/invoices/[id]/page.tsx`)
- Purchase Invoice Form (`app/purchase/invoices/[id]/page.tsx`)

Example integration:
```tsx
import { DiscountInput, TaxTemplateSelect, InvoiceSummary } from '@/components/invoice';

function InvoiceForm() {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ percentage: 0, amount: 0 });
  const [taxes, setTaxes] = useState([]);

  return (
    <div>
      {/* Items section */}
      <ItemsTable items={items} onChange={setItems} />

      {/* Discount section */}
      <DiscountInput
        subtotal={calculateSubtotal(items)}
        discountPercentage={discount.percentage}
        discountAmount={discount.amount}
        onChange={setDiscount}
      />

      {/* Tax section */}
      <TaxTemplateSelect
        type="Sales"
        company="BAC"
        onChange={(template) => setTaxes(template?.taxes || [])}
      />

      {/* Summary section */}
      <InvoiceSummary
        items={items}
        discountAmount={discount.amount}
        discountPercentage={discount.percentage}
        taxes={taxes}
      />
    </div>
  );
}
```

---

## Notes

- All components use Indonesian language for labels and messages
- Currency formatting follows Indonesian standard (Rp with thousand separator)
- Components are fully typed with TypeScript
- All calculations use 2 decimal places for accuracy
- Error messages are user-friendly and descriptive

---

**Created**: 2024-01-15  
**Task**: 8. Buat Reusable UI Components  
**Spec**: discount-and-tax-implementation
