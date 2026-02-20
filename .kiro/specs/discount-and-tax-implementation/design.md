# Design Document: Implementasi Fitur Diskon dan Pajak

## Overview

### Tujuan

Dokumen design ini menjelaskan arsitektur, komponen, algoritma, dan strategi implementasi untuk fitur diskon dan pajak pada sistem ERP berbasis ERPNext. Implementasi ini bertujuan untuk:

1. Mengaktifkan fitur diskon dan pajak yang sudah tersedia di ERPNext DocType
2. Menyediakan API endpoint yang mendukung field diskon dan pajak
3. Membangun UI yang user-friendly untuk input diskon dan pajak
4. Memastikan GL Entry posting yang akurat untuk diskon dan pajak
5. Memperbarui laporan keuangan untuk menampilkan diskon dan pajak
6. Menjaga backward compatibility dengan invoice yang sudah ada

### Konteks Sistem

Sistem ERP saat ini sudah berjalan di production dengan karakteristik:

- **Platform**: ERPNext v13+ dengan Next.js frontend
- **Database**: MariaDB/MySQL dengan 221 akun di Chart of Accounts
- **Status**: Sales Invoice dan Purchase Invoice sudah berfungsi dengan GL Entry auto-posting
- **Fitur Native**: ERPNext sudah support diskon dan pajak di DocType dengan default value 0
- **Backward Compatibility**: Field diskon/pajak sudah ada, sehingga invoice lama otomatis compatible

### Prinsip Design

1. **Non-Breaking Changes**: Semua perubahan bersifat additive, tidak mengubah struktur data existing
2. **Leverage ERPNext Native**: Menggunakan fitur built-in ERPNext untuk calculation dan GL posting
3. **API-First**: API design yang clean dan RESTful dengan backward compatibility
4. **User-Centric UI**: Interface yang intuitif dengan real-time calculation
5. **Audit Trail**: Semua transaksi diskon dan pajak tercatat di GL Entry remarks
6. **Balanced Accounting**: Setiap GL Entry harus balanced (total debit = total credit)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sales Invoice│  │Purchase Invoice│ │  Reports     │      │
│  │     Form     │  │     Form      │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘      │
│         │                  │                   │              │
└─────────┼──────────────────┼───────────────────┼──────────────┘
          │                  │                   │
          │ HTTP/REST API    │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/sales/invoices     (GET, POST, PUT, DELETE)    │   │
│  │  /api/purchase/invoices  (GET, POST, PUT, DELETE)    │   │
│  │  /api/setup/tax-templates (GET)                      │   │
│  │  /api/reports/profit-loss (GET)                      │   │
│  │  /api/reports/balance-sheet (GET)                    │   │
│  │  /api/reports/vat-report (GET)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ ERPNext REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ERPNext Backend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DocType: Sales Invoice                              │   │
│  │  DocType: Purchase Invoice                           │   │
│  │  DocType: Sales Taxes and Charges Template           │   │
│  │  DocType: Purchase Taxes and Charges Template        │   │
│  │  DocType: GL Entry                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                                │   │
│  │  - Discount Calculation                              │   │
│  │  - Tax Calculation                                   │   │
│  │  - GL Entry Posting                                  │   │
│  │  - Validation Rules                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MariaDB/MySQL                                       │   │
│  │  - tabSales Invoice                                  │   │
│  │  │  - discount_amount, discount_percentage          │   │
│  │  │  - taxes (child table)                           │   │
│  │  - tabPurchase Invoice                               │   │
│  │  - tabGL Entry                                       │   │
│  │  - tabAccount (COA)                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```


### Component Architecture

#### 1. Frontend Components

**InvoiceForm Component**
- Menampilkan form input untuk Sales/Purchase Invoice
- Menangani input diskon (percentage atau amount)
- Menampilkan dropdown Tax Template
- Real-time calculation untuk subtotal, diskon, pajak, dan grand total
- Validasi input sebelum submit

**DiscountInput Component**
- Reusable component untuk input diskon
- Support input percentage atau amount
- Auto-calculate nilai yang lain
- Validasi range (0-100% atau 0-subtotal)

**TaxTemplateSelect Component**
- Dropdown untuk memilih Tax Template
- Fetch data dari API `/api/setup/tax-templates`
- Display tax rate dan description

**InvoiceSummary Component**
- Menampilkan breakdown: Subtotal, Diskon, Subtotal setelah Diskon, Pajak, Grand Total
- Format currency Indonesia (Rp dengan pemisah ribuan)
- Update real-time saat ada perubahan

#### 2. API Layer (Next.js)

**Sales Invoice API** (`/api/sales/invoices/route.ts`)
- GET: Fetch invoices dengan field diskon dan pajak
- POST: Create invoice dengan diskon dan pajak
- PUT: Update invoice
- DELETE: Cancel invoice (dengan reversal GL Entry)

**Purchase Invoice API** (`/api/purchase/invoices/route.ts`)
- Sama seperti Sales Invoice API

**Tax Template API** (`/api/setup/tax-templates/route.ts`)
- GET: Fetch semua Tax Template yang aktif
- Response: `{ name, title, rate, account_head, description }`

**Reports API**
- `/api/reports/profit-loss`: Laporan Laba Rugi dengan diskon
- `/api/reports/balance-sheet`: Laporan Neraca dengan akun pajak
- `/api/reports/vat-report`: Laporan PPN (Output vs Input)

#### 3. ERPNext Backend

**DocType: Sales Invoice**
- Field: `discount_amount`, `discount_percentage`, `additional_discount_percentage`
- Child Table: `taxes` (Sales Taxes and Charges)
- Hooks: `before_submit`, `on_submit`, `on_cancel`
- Method: `calculate_taxes_and_totals()`

**DocType: Purchase Invoice**
- Field: `discount_amount`, `discount_percentage`
- Child Table: `taxes` (Purchase Taxes and Charges)
- Hooks: `before_submit`, `on_submit`, `on_cancel`

**DocType: Sales/Purchase Taxes and Charges Template**
- Field: `title`, `company`, `is_default`
- Child Table: `taxes` dengan field:
  - `charge_type`: "On Net Total", "Actual", "On Previous Row Total"
  - `account_head`: GL Account untuk pajak
  - `rate`: Tax rate (%)
  - `tax_amount`: Calculated amount
  - `add_deduct_tax`: "Add" atau "Deduct"

**GL Entry Posting Logic**
- Triggered by `on_submit` hook
- Create balanced GL Entry (debit = credit)
- Post to correct accounts based on transaction type
- Add remarks untuk audit trail

### Data Flow

#### Flow 1: Create Sales Invoice dengan Diskon dan PPN

```
1. User Input di Frontend
   ├─ Items: Qty, Rate
   ├─ Discount: 10%
   └─ Tax: PPN 11%

2. Frontend Calculation (Real-time)
   ├─ Subtotal = Sum(Qty × Rate) = Rp 1.000.000
   ├─ Discount Amount = 10% × 1.000.000 = Rp 100.000
   ├─ Net Total = 1.000.000 - 100.000 = Rp 900.000
   ├─ PPN = 11% × 900.000 = Rp 99.000
   └─ Grand Total = 900.000 + 99.000 = Rp 999.000

3. API POST /api/sales/invoices
   └─ Payload: { items, discount_percentage: 10, taxes: [{...}] }

4. ERPNext Processing
   ├─ Validate input
   ├─ Calculate totals (verify frontend calculation)
   ├─ Create Sales Invoice doc
   └─ Submit → Trigger GL Entry posting

5. GL Entry Posting
   ├─ Debit:  1210 - Piutang Usaha         Rp 999.000
   ├─ Debit:  4300 - Potongan Penjualan    Rp 100.000
   ├─ Credit: 4100 - Pendapatan Penjualan  Rp 1.000.000
   ├─ Credit: 2210 - Hutang PPN            Rp 99.000
   └─ (Debit Total = Credit Total = Rp 1.099.000) ✓

6. Response to Frontend
   └─ { success: true, data: { name, grand_total, ... } }
```

#### Flow 2: Create Purchase Invoice dengan Diskon dan PPN Input

```
1. User Input di Frontend
   ├─ Items: Qty, Rate
   ├─ Discount: Rp 50.000
   └─ Tax: PPN Masukan 11% (PKP)

2. Frontend Calculation
   ├─ Subtotal = Rp 600.000
   ├─ Discount Amount = Rp 50.000
   ├─ Net Total = 600.000 - 50.000 = Rp 550.000
   ├─ PPN = 11% × 550.000 = Rp 60.500
   └─ Grand Total = 550.000 + 60.500 = Rp 610.500

3. API POST /api/purchase/invoices
   └─ Payload: { items, discount_amount: 50000, taxes: [{...}] }

4. ERPNext Processing
   └─ Same as Sales Invoice

5. GL Entry Posting
   ├─ Debit:  1310 - Persediaan            Rp 550.000
   ├─ Debit:  1410 - Pajak Dibayar Dimuka  Rp 60.500
   ├─ Credit: 2110 - Hutang Usaha          Rp 610.500
   └─ (Debit Total = Credit Total = Rp 610.500) ✓

6. Response to Frontend
   └─ { success: true, data: { name, grand_total, ... } }
```

## Components and Interfaces

### API Interfaces

#### Sales Invoice API

**POST /api/sales/invoices**

Request Body:
```typescript
interface CreateSalesInvoiceRequest {
  company: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date?: string;
  items: InvoiceItem[];
  
  // Discount fields (optional)
  discount_amount?: number;
  discount_percentage?: number;
  additional_discount_percentage?: number;
  apply_discount_on?: "Grand Total" | "Net Total";
  
  // Tax fields (optional)
  taxes_and_charges?: string; // Tax Template name
  taxes?: TaxRow[];
  
  // Other fields
  currency?: string;
  selling_price_list?: string;
  territory?: string;
  status?: string;
  docstatus?: 0 | 1 | 2;
}

interface InvoiceItem {
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  amount?: number;
  warehouse?: string;
  uom?: string;
}

interface TaxRow {
  charge_type: "On Net Total" | "Actual" | "On Previous Row Total";
  account_head: string;
  description?: string;
  rate?: number;
  tax_amount?: number;
  add_deduct_tax?: "Add" | "Deduct";
}
```

Response:
```typescript
interface CreateSalesInvoiceResponse {
  success: boolean;
  message?: string;
  data?: {
    name: string; // Invoice number
    customer: string;
    posting_date: string;
    total: number;
    discount_amount: number;
    net_total: number;
    total_taxes_and_charges: number;
    grand_total: number;
    outstanding_amount: number;
    status: string;
    docstatus: number;
  };
  error?: string;
}
```

**GET /api/sales/invoices**

Query Parameters:
- `company`: Filter by company
- `customer`: Filter by customer
- `status`: Filter by status (Draft, Submitted, Paid, etc.)
- `from_date`: Filter by posting date (start)
- `to_date`: Filter by posting date (end)
- `search`: Search by customer name or invoice number
- `limit`: Pagination limit (default: 100)
- `start`: Pagination offset (default: 0)

Response:
```typescript
interface GetSalesInvoicesResponse {
  success: boolean;
  data: SalesInvoice[];
}

interface SalesInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  total: number;
  discount_amount: number; // Always present, 0 for old invoices
  net_total: number;
  total_taxes_and_charges: number;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
  taxes: TaxRow[]; // Always present, empty array for old invoices
}
```

#### Purchase Invoice API

**POST /api/purchase/invoices**

Request/Response structure sama seperti Sales Invoice API, dengan perbedaan:
- `supplier` instead of `customer`
- `buying_price_list` instead of `selling_price_list`
- Tax template untuk PPN Input (1410 - Pajak Dibayar Dimuka)

#### Tax Template API

**GET /api/setup/tax-templates**

Query Parameters:
- `type`: "Sales" atau "Purchase"
- `company`: Filter by company

Response:
```typescript
interface GetTaxTemplatesResponse {
  success: boolean;
  data: TaxTemplate[];
}

interface TaxTemplate {
  name: string;
  title: string;
  company: string;
  is_default: boolean;
  taxes: {
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
  }[];
}
```


## Data Models

### ERPNext DocType Structure

#### Sales Invoice

```python
{
  # Header
  "name": "SI-2024-00001",
  "company": "BAC",
  "customer": "CUST-001",
  "customer_name": "PT ABC",
  "posting_date": "2024-01-15",
  "due_date": "2024-02-15",
  
  # Items (Child Table)
  "items": [
    {
      "item_code": "ITEM-001",
      "item_name": "Produk A",
      "qty": 10,
      "rate": 100000,
      "amount": 1000000,
      "warehouse": "Gudang Utama - BAC"
    }
  ],
  
  # Totals Before Discount
  "total": 1000000,
  "base_total": 1000000,
  
  # Discount Fields
  "discount_amount": 100000,
  "discount_percentage": 10,
  "additional_discount_percentage": 0,
  "apply_discount_on": "Net Total",
  
  # Totals After Discount
  "net_total": 900000,
  "base_net_total": 900000,
  
  # Taxes (Child Table)
  "taxes_and_charges": "PPN 11%",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN - BAC",
      "description": "PPN 11%",
      "rate": 11,
      "tax_amount": 99000,
      "total": 999000
    }
  ],
  
  # Grand Total
  "total_taxes_and_charges": 99000,
  "grand_total": 999000,
  "rounded_total": 999000,
  "outstanding_amount": 999000,
  
  # Status
  "status": "Submitted",
  "docstatus": 1,
  
  # Metadata
  "creation": "2024-01-15 10:30:00",
  "modified": "2024-01-15 10:30:00",
  "owner": "admin@example.com"
}
```

#### Purchase Invoice

```python
{
  # Header
  "name": "PI-2024-00001",
  "company": "BAC",
  "supplier": "SUPP-001",
  "supplier_name": "PT Supplier XYZ",
  "posting_date": "2024-01-15",
  "due_date": "2024-02-15",
  
  # Items (Child Table)
  "items": [
    {
      "item_code": "ITEM-001",
      "item_name": "Produk A",
      "qty": 10,
      "rate": 60000,
      "amount": 600000,
      "warehouse": "Gudang Utama - BAC"
    }
  ],
  
  # Totals Before Discount
  "total": 600000,
  
  # Discount Fields
  "discount_amount": 50000,
  "discount_percentage": 8.33,
  "apply_discount_on": "Net Total",
  
  # Totals After Discount
  "net_total": 550000,
  
  # Taxes (Child Table)
  "taxes_and_charges": "PPN Masukan 11% (PKP)",
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "1410 - Pajak Dibayar Dimuka - BAC",
      "description": "PPN Masukan 11%",
      "rate": 11,
      "tax_amount": 60500,
      "total": 610500,
      "add_deduct_tax": "Add"
    }
  ],
  
  # Grand Total
  "total_taxes_and_charges": 60500,
  "grand_total": 610500,
  "outstanding_amount": 610500,
  
  # Status
  "status": "Submitted",
  "docstatus": 1
}
```

#### Tax Template (Sales Taxes and Charges Template)

```python
{
  "name": "PPN 11%",
  "title": "PPN 11%",
  "company": "BAC",
  "is_default": 1,
  "disabled": 0,
  
  # Taxes (Child Table)
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN - BAC",
      "description": "PPN 11%",
      "rate": 11,
      "included_in_print_rate": 0
    }
  ]
}
```

```python
{
  "name": "PPN 11% + PPh 23 (2%)",
  "title": "PPN 11% + PPh 23 (2%)",
  "company": "BAC",
  "is_default": 0,
  "disabled": 0,
  
  "taxes": [
    {
      "charge_type": "On Net Total",
      "account_head": "2210 - Hutang PPN - BAC",
      "description": "PPN 11%",
      "rate": 11,
      "add_deduct_tax": "Add"
    },
    {
      "charge_type": "On Net Total",
      "account_head": "2230 - Hutang PPh 23 - BAC",
      "description": "PPh 23 (2%)",
      "rate": 2,
      "add_deduct_tax": "Deduct"
    }
  ]
}
```

#### GL Entry

```python
{
  "voucher_type": "Sales Invoice",
  "voucher_no": "SI-2024-00001",
  "posting_date": "2024-01-15",
  "company": "BAC",
  
  # GL Entry Lines
  "entries": [
    {
      "account": "1210 - Piutang Usaha - BAC",
      "debit": 999000,
      "credit": 0,
      "against": "CUST-001",
      "remarks": "Sales Invoice SI-2024-00001"
    },
    {
      "account": "4300 - Potongan Penjualan - BAC",
      "debit": 100000,
      "credit": 0,
      "remarks": "Discount 10% on SI-2024-00001"
    },
    {
      "account": "4100 - Pendapatan Penjualan - BAC",
      "debit": 0,
      "credit": 1000000,
      "against": "CUST-001",
      "remarks": "Sales Invoice SI-2024-00001"
    },
    {
      "account": "2210 - Hutang PPN - BAC",
      "debit": 0,
      "credit": 99000,
      "remarks": "PPN 11% on SI-2024-00001"
    }
  ],
  
  # Validation
  "total_debit": 1099000,
  "total_credit": 1099000,
  "is_balanced": true
}
```

### Database Schema

#### Chart of Accounts (Relevant Accounts)

| Account Code | Account Name | Root Type | Account Type | Normal Balance |
|--------------|--------------|-----------|--------------|----------------|
| 1210 | Piutang Usaha | Asset | Receivable | Debit |
| 1310 | Persediaan | Asset | Stock | Debit |
| 1410 | Pajak Dibayar Dimuka | Asset | Tax | Debit |
| 2110 | Hutang Usaha | Liability | Payable | Credit |
| 2210 | Hutang PPN | Liability | Tax | Credit |
| 2230 | Hutang PPh 23 | Liability | Tax | Credit |
| 2240 | Hutang PPh 4(2) Final | Liability | Tax | Credit |
| 4100 | Pendapatan Penjualan | Income | Income Account | Credit |
| 4300 | Potongan Penjualan | Income | Income Account | Debit (contra) |
| 5100 | HPP Barang Dagang | Expense | Cost of Goods Sold | Debit |
| 5300 | Potongan Pembelian | Expense | Cost of Goods Sold | Credit (contra) |

## Algorithms

### Algorithm 1: Discount Calculation

**Input**: 
- `subtotal`: Total sebelum diskon
- `discount_percentage`: Diskon dalam persen (optional)
- `discount_amount`: Diskon dalam rupiah (optional)

**Output**:
- `final_discount_amount`: Nilai diskon final
- `final_discount_percentage`: Persentase diskon final
- `net_total`: Subtotal setelah diskon

**Logic**:
```python
def calculate_discount(subtotal, discount_percentage=0, discount_amount=0):
    """
    Calculate discount amount and percentage.
    Priority: discount_amount > discount_percentage
    """
    
    # Validation
    if subtotal <= 0:
        raise ValueError("Subtotal must be greater than 0")
    
    if discount_percentage < 0 or discount_percentage > 100:
        raise ValueError("Discount percentage must be between 0 and 100")
    
    if discount_amount < 0 or discount_amount > subtotal:
        raise ValueError("Discount amount must be between 0 and subtotal")
    
    # Calculate based on priority
    if discount_amount > 0:
        # Use discount_amount as primary
        final_discount_amount = discount_amount
        final_discount_percentage = (discount_amount / subtotal) * 100
    elif discount_percentage > 0:
        # Use discount_percentage
        final_discount_amount = (discount_percentage / 100) * subtotal
        final_discount_percentage = discount_percentage
    else:
        # No discount
        final_discount_amount = 0
        final_discount_percentage = 0
    
    # Calculate net total
    net_total = subtotal - final_discount_amount
    
    return {
        "discount_amount": round(final_discount_amount, 2),
        "discount_percentage": round(final_discount_percentage, 2),
        "net_total": round(net_total, 2)
    }
```

**Example**:
```python
# Case 1: Discount percentage
result = calculate_discount(1000000, discount_percentage=10)
# Output: { discount_amount: 100000, discount_percentage: 10, net_total: 900000 }

# Case 2: Discount amount
result = calculate_discount(1000000, discount_amount=150000)
# Output: { discount_amount: 150000, discount_percentage: 15, net_total: 850000 }

# Case 3: Both provided (amount takes priority)
result = calculate_discount(1000000, discount_percentage=10, discount_amount=150000)
# Output: { discount_amount: 150000, discount_percentage: 15, net_total: 850000 }
```

### Algorithm 2: Tax Calculation

**Input**:
- `net_total`: Subtotal setelah diskon
- `tax_template`: Tax template object dengan array of taxes
- `tax_type`: "Sales" atau "Purchase"

**Output**:
- `taxes`: Array of calculated tax rows
- `total_taxes`: Total nilai pajak
- `grand_total`: Net total + taxes

**Logic**:
```python
def calculate_taxes(net_total, tax_template, tax_type="Sales"):
    """
    Calculate taxes based on tax template.
    Support multiple tax rows with different charge types.
    """
    
    if net_total <= 0:
        raise ValueError("Net total must be greater than 0")
    
    if not tax_template or not tax_template.get("taxes"):
        return {
            "taxes": [],
            "total_taxes": 0,
            "grand_total": net_total
        }
    
    calculated_taxes = []
    running_total = net_total
    total_tax_amount = 0
    
    for tax_row in tax_template["taxes"]:
        charge_type = tax_row["charge_type"]
        rate = tax_row.get("rate", 0)
        add_deduct = tax_row.get("add_deduct_tax", "Add")
        
        # Calculate tax amount based on charge type
        if charge_type == "On Net Total":
            tax_amount = (rate / 100) * net_total
        elif charge_type == "On Previous Row Total":
            tax_amount = (rate / 100) * running_total
        elif charge_type == "Actual":
            tax_amount = tax_row.get("tax_amount", 0)
        else:
            tax_amount = 0
        
        # Apply add/deduct
        if add_deduct == "Deduct":
            tax_amount = -abs(tax_amount)
        
        # Update running total
        running_total += tax_amount
        total_tax_amount += tax_amount
        
        # Add to result
        calculated_taxes.append({
            "charge_type": charge_type,
            "account_head": tax_row["account_head"],
            "description": tax_row.get("description", ""),
            "rate": rate,
            "tax_amount": round(tax_amount, 2),
            "total": round(running_total, 2)
        })
    
    return {
        "taxes": calculated_taxes,
        "total_taxes": round(total_tax_amount, 2),
        "grand_total": round(running_total, 2)
    }
```

**Example**:
```python
# Case 1: PPN 11% only
tax_template = {
    "taxes": [
        {
            "charge_type": "On Net Total",
            "account_head": "2210 - Hutang PPN",
            "description": "PPN 11%",
            "rate": 11
        }
    ]
}
result = calculate_taxes(900000, tax_template)
# Output: {
#   taxes: [{ ..., tax_amount: 99000, total: 999000 }],
#   total_taxes: 99000,
#   grand_total: 999000
# }

# Case 2: PPN 11% + PPh 23 (2%)
tax_template = {
    "taxes": [
        {
            "charge_type": "On Net Total",
            "account_head": "2210 - Hutang PPN",
            "rate": 11,
            "add_deduct_tax": "Add"
        },
        {
            "charge_type": "On Net Total",
            "account_head": "2230 - Hutang PPh 23",
            "rate": 2,
            "add_deduct_tax": "Deduct"
        }
    ]
}
result = calculate_taxes(900000, tax_template)
# Output: {
#   taxes: [
#     { tax_amount: 99000, total: 999000 },
#     { tax_amount: -18000, total: 981000 }
#   ],
#   total_taxes: 81000,
#   grand_total: 981000
# }
```


### Algorithm 3: GL Entry Posting for Sales Invoice with Discount and Tax

**Input**:
- `invoice`: Sales Invoice object
- `posting_date`: Tanggal posting

**Output**:
- `gl_entries`: Array of GL Entry lines
- `is_balanced`: Boolean (total debit == total credit)

**Logic**:
```python
def post_sales_invoice_gl_entry(invoice, posting_date):
    """
    Post GL Entry for Sales Invoice with discount and tax.
    
    Journal Entry:
    Debit:  Piutang Usaha (grand_total)
    Debit:  Potongan Penjualan (discount_amount)
    Credit: Pendapatan Penjualan (total before discount)
    Credit: Hutang PPN (tax_amount)
    """
    
    gl_entries = []
    
    # 1. Debit: Piutang Usaha (Receivable)
    gl_entries.append({
        "account": "1210 - Piutang Usaha",
        "debit": invoice["grand_total"],
        "credit": 0,
        "against": invoice["customer"],
        "remarks": f"Sales Invoice {invoice['name']}"
    })
    
    # 2. Debit: Potongan Penjualan (if discount exists)
    if invoice.get("discount_amount", 0) > 0:
        gl_entries.append({
            "account": "4300 - Potongan Penjualan",
            "debit": invoice["discount_amount"],
            "credit": 0,
            "remarks": f"Discount {invoice['discount_percentage']}% on {invoice['name']}"
        })
    
    # 3. Credit: Pendapatan Penjualan (Income)
    gl_entries.append({
        "account": "4100 - Pendapatan Penjualan",
        "debit": 0,
        "credit": invoice["total"],  # Total before discount
        "against": invoice["customer"],
        "remarks": f"Sales Invoice {invoice['name']}"
    })
    
    # 4. Credit: Hutang PPN (Tax Liability)
    for tax_row in invoice.get("taxes", []):
        if tax_row["tax_amount"] > 0:
            gl_entries.append({
                "account": tax_row["account_head"],
                "debit": 0,
                "credit": tax_row["tax_amount"],
                "remarks": f"{tax_row['description']} on {invoice['name']}"
            })
        elif tax_row["tax_amount"] < 0:
            # Deduct tax (e.g., PPh 23)
            gl_entries.append({
                "account": tax_row["account_head"],
                "debit": abs(tax_row["tax_amount"]),
                "credit": 0,
                "remarks": f"{tax_row['description']} on {invoice['name']}"
            })
    
    # 5. Post HPP (Cost of Goods Sold)
    # This is handled separately by ERPNext stock ledger
    
    # Validate balanced entry
    total_debit = sum(entry["debit"] for entry in gl_entries)
    total_credit = sum(entry["credit"] for entry in gl_entries)
    is_balanced = abs(total_debit - total_credit) < 0.01  # Allow rounding error
    
    if not is_balanced:
        raise ValueError(f"GL Entry not balanced: Debit={total_debit}, Credit={total_credit}")
    
    return {
        "gl_entries": gl_entries,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced
    }
```

**Example**:
```python
invoice = {
    "name": "SI-2024-00001",
    "customer": "CUST-001",
    "total": 1000000,
    "discount_amount": 100000,
    "discount_percentage": 10,
    "net_total": 900000,
    "taxes": [
        {
            "account_head": "2210 - Hutang PPN",
            "description": "PPN 11%",
            "tax_amount": 99000
        }
    ],
    "grand_total": 999000
}

result = post_sales_invoice_gl_entry(invoice, "2024-01-15")
# Output:
# {
#   gl_entries: [
#     { account: "1210 - Piutang Usaha", debit: 999000, credit: 0 },
#     { account: "4300 - Potongan Penjualan", debit: 100000, credit: 0 },
#     { account: "4100 - Pendapatan Penjualan", debit: 0, credit: 1000000 },
#     { account: "2210 - Hutang PPN", debit: 0, credit: 99000 }
#   ],
#   total_debit: 1099000,
#   total_credit: 1099000,
#   is_balanced: true
# }
```

### Algorithm 4: GL Entry Posting for Purchase Invoice with Discount and Tax

**Input**:
- `invoice`: Purchase Invoice object
- `posting_date`: Tanggal posting

**Output**:
- `gl_entries`: Array of GL Entry lines
- `is_balanced`: Boolean

**Logic**:
```python
def post_purchase_invoice_gl_entry(invoice, posting_date):
    """
    Post GL Entry for Purchase Invoice with discount and tax.
    
    Journal Entry:
    Debit:  Persediaan (net_total after discount)
    Debit:  Pajak Dibayar Dimuka (PPN Input)
    Credit: Hutang Usaha (grand_total)
    """
    
    gl_entries = []
    
    # 1. Debit: Persediaan (Stock)
    gl_entries.append({
        "account": "1310 - Persediaan",
        "debit": invoice["net_total"],
        "credit": 0,
        "remarks": f"Purchase Invoice {invoice['name']}"
    })
    
    # 2. Debit: Pajak Dibayar Dimuka (PPN Input)
    for tax_row in invoice.get("taxes", []):
        if tax_row["tax_amount"] > 0:
            gl_entries.append({
                "account": tax_row["account_head"],
                "debit": tax_row["tax_amount"],
                "credit": 0,
                "remarks": f"{tax_row['description']} on {invoice['name']}"
            })
    
    # 3. Credit: Hutang Usaha (Payable)
    gl_entries.append({
        "account": "2110 - Hutang Usaha",
        "debit": 0,
        "credit": invoice["grand_total"],
        "against": invoice["supplier"],
        "remarks": f"Purchase Invoice {invoice['name']}"
    })
    
    # Note: Discount is already reflected in net_total
    # No separate GL Entry for purchase discount
    
    # Validate balanced entry
    total_debit = sum(entry["debit"] for entry in gl_entries)
    total_credit = sum(entry["credit"] for entry in gl_entries)
    is_balanced = abs(total_debit - total_credit) < 0.01
    
    if not is_balanced:
        raise ValueError(f"GL Entry not balanced: Debit={total_debit}, Credit={total_credit}")
    
    return {
        "gl_entries": gl_entries,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced
    }
```

### Algorithm 5: Invoice Cancellation (Reversal GL Entry)

**Input**:
- `original_gl_entries`: GL Entry dari invoice yang akan dibatalkan

**Output**:
- `reversal_gl_entries`: GL Entry reversal (debit ↔ credit)

**Logic**:
```python
def create_reversal_gl_entry(original_gl_entries):
    """
    Create reversal GL Entry for invoice cancellation.
    Swap debit and credit amounts.
    """
    
    reversal_entries = []
    
    for entry in original_gl_entries:
        reversal_entries.append({
            "account": entry["account"],
            "debit": entry["credit"],  # Swap
            "credit": entry["debit"],  # Swap
            "against": entry.get("against", ""),
            "remarks": f"Reversal: {entry['remarks']}"
        })
    
    # Validate balanced
    total_debit = sum(entry["debit"] for entry in reversal_entries)
    total_credit = sum(entry["credit"] for entry in reversal_entries)
    is_balanced = abs(total_debit - total_credit) < 0.01
    
    return {
        "gl_entries": reversal_entries,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": is_balanced
    }
```

### Algorithm 6: Real-time Calculation (Frontend)

**Input**:
- `items`: Array of invoice items
- `discount_percentage`: Diskon persen (optional)
- `discount_amount`: Diskon rupiah (optional)
- `tax_template`: Tax template object (optional)

**Output**:
- `summary`: Object dengan breakdown lengkap

**Logic**:
```typescript
function calculateInvoiceSummary(
  items: InvoiceItem[],
  discountPercentage: number = 0,
  discountAmount: number = 0,
  taxTemplate: TaxTemplate | null = null
): InvoiceSummary {
  
  // 1. Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.qty * item.rate);
  }, 0);
  
  // 2. Calculate discount
  let finalDiscountAmount = 0;
  let finalDiscountPercentage = 0;
  
  if (discountAmount > 0) {
    finalDiscountAmount = discountAmount;
    finalDiscountPercentage = (discountAmount / subtotal) * 100;
  } else if (discountPercentage > 0) {
    finalDiscountAmount = (discountPercentage / 100) * subtotal;
    finalDiscountPercentage = discountPercentage;
  }
  
  // 3. Calculate net total
  const netTotal = subtotal - finalDiscountAmount;
  
  // 4. Calculate taxes
  let totalTaxes = 0;
  const taxBreakdown: TaxRow[] = [];
  
  if (taxTemplate && taxTemplate.taxes) {
    let runningTotal = netTotal;
    
    for (const taxRow of taxTemplate.taxes) {
      const rate = taxRow.rate || 0;
      let taxAmount = 0;
      
      if (taxRow.charge_type === "On Net Total") {
        taxAmount = (rate / 100) * netTotal;
      } else if (taxRow.charge_type === "On Previous Row Total") {
        taxAmount = (rate / 100) * runningTotal;
      }
      
      if (taxRow.add_deduct_tax === "Deduct") {
        taxAmount = -Math.abs(taxAmount);
      }
      
      runningTotal += taxAmount;
      totalTaxes += taxAmount;
      
      taxBreakdown.push({
        description: taxRow.description,
        rate: rate,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round(runningTotal * 100) / 100
      });
    }
  }
  
  // 5. Calculate grand total
  const grandTotal = netTotal + totalTaxes;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(finalDiscountAmount * 100) / 100,
    discount_percentage: Math.round(finalDiscountPercentage * 100) / 100,
    net_total: Math.round(netTotal * 100) / 100,
    taxes: taxBreakdown,
    total_taxes: Math.round(totalTaxes * 100) / 100,
    grand_total: Math.round(grandTotal * 100) / 100
  };
}
```

**Usage in React Component**:
```typescript
const [items, setItems] = useState<InvoiceItem[]>([]);
const [discountPercentage, setDiscountPercentage] = useState(0);
const [discountAmount, setDiscountAmount] = useState(0);
const [taxTemplate, setTaxTemplate] = useState<TaxTemplate | null>(null);

// Real-time calculation
const summary = useMemo(() => {
  return calculateInvoiceSummary(
    items,
    discountPercentage,
    discountAmount,
    taxTemplate
  );
}, [items, discountPercentage, discountAmount, taxTemplate]);

// Display summary
<InvoiceSummary summary={summary} />
```


## Error Handling

### Validation Rules

#### 1. Discount Validation

**Rule**: Discount percentage harus antara 0 dan 100
```python
if discount_percentage < 0 or discount_percentage > 100:
    raise ValidationError("Discount percentage must be between 0 and 100")
```

**Rule**: Discount amount tidak boleh melebihi subtotal
```python
if discount_amount > subtotal:
    raise ValidationError(f"Discount amount ({discount_amount}) cannot exceed subtotal ({subtotal})")
```

**Rule**: Jika kedua field diisi, discount_amount yang digunakan
```python
if discount_amount > 0 and discount_percentage > 0:
    # Use discount_amount, ignore discount_percentage
    final_discount = discount_amount
    warning = "Both discount amount and percentage provided. Using discount amount."
```

#### 2. Tax Validation

**Rule**: Tax template harus aktif dan valid
```python
tax_template = frappe.get_doc("Sales Taxes and Charges Template", template_name)
if tax_template.disabled:
    raise ValidationError(f"Tax template '{template_name}' is disabled")
```

**Rule**: Account head di tax template harus ada di COA
```python
for tax_row in tax_template.taxes:
    if not frappe.db.exists("Account", tax_row.account_head):
        raise ValidationError(f"Account '{tax_row.account_head}' not found in Chart of Accounts")
```

**Rule**: Tax rate harus valid
```python
if tax_row.rate < 0 or tax_row.rate > 100:
    raise ValidationError(f"Tax rate must be between 0 and 100, got {tax_row.rate}")
```

#### 3. Grand Total Validation

**Rule**: Grand total harus sama dengan subtotal - discount + taxes
```python
calculated_grand_total = subtotal - discount_amount + total_taxes
if abs(grand_total - calculated_grand_total) > 0.01:  # Allow rounding error
    raise ValidationError(
        f"Grand total mismatch. Expected: {calculated_grand_total}, Got: {grand_total}"
    )
```

#### 4. GL Entry Validation

**Rule**: Total debit harus sama dengan total credit
```python
total_debit = sum(entry.debit for entry in gl_entries)
total_credit = sum(entry.credit for entry in gl_entries)
if abs(total_debit - total_credit) > 0.01:
    raise ValidationError(
        f"GL Entry not balanced. Debit: {total_debit}, Credit: {total_credit}"
    )
```

**Rule**: Account harus ada di COA
```python
for entry in gl_entries:
    if not frappe.db.exists("Account", entry.account):
        raise ValidationError(f"Account '{entry.account}' not found")
```

### Error Response Format

#### API Error Response

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: {
    field?: string;
    value?: any;
    constraint?: string;
  };
  status: number;
}
```

**Example**:
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Discount amount cannot exceed subtotal",
  "details": {
    "field": "discount_amount",
    "value": 1500000,
    "constraint": "max: 1000000"
  },
  "status": 400
}
```

### Error Handling Strategy

#### 1. Frontend Validation (Immediate Feedback)

```typescript
// Validate discount percentage
const validateDiscountPercentage = (value: number): string | null => {
  if (value < 0) return "Discount percentage cannot be negative";
  if (value > 100) return "Discount percentage cannot exceed 100%";
  return null;
};

// Validate discount amount
const validateDiscountAmount = (value: number, subtotal: number): string | null => {
  if (value < 0) return "Discount amount cannot be negative";
  if (value > subtotal) return `Discount amount cannot exceed subtotal (Rp ${formatCurrency(subtotal)})`;
  return null;
};

// Display error
{error && (
  <div className="alert alert-danger">
    {error}
  </div>
)}
```

#### 2. API Validation (Server-side)

```typescript
// In API route
try {
  // Validate input
  if (!invoiceData.company) {
    return NextResponse.json({
      success: false,
      message: "Company is required",
      status: 400
    }, { status: 400 });
  }
  
  // Validate discount
  if (invoiceData.discount_percentage > 100) {
    return NextResponse.json({
      success: false,
      message: "Discount percentage cannot exceed 100%",
      details: {
        field: "discount_percentage",
        value: invoiceData.discount_percentage,
        constraint: "max: 100"
      },
      status: 400
    }, { status: 400 });
  }
  
  // Process invoice
  const result = await createInvoice(invoiceData);
  
  return NextResponse.json({
    success: true,
    data: result
  });
  
} catch (error) {
  console.error("API Error:", error);
  return NextResponse.json({
    success: false,
    message: "Internal server error",
    error: error.message,
    status: 500
  }, { status: 500 });
}
```

#### 3. ERPNext Validation (Business Logic)

```python
# In ERPNext custom script or server script
def validate(self, method):
    """Validate Sales Invoice before submit"""
    
    # Validate discount
    if self.discount_amount > self.total:
        frappe.throw(f"Discount amount ({self.discount_amount}) cannot exceed total ({self.total})")
    
    # Validate grand total
    calculated_grand_total = self.net_total + self.total_taxes_and_charges
    if abs(self.grand_total - calculated_grand_total) > 0.01:
        frappe.throw(f"Grand total mismatch. Expected: {calculated_grand_total}, Got: {self.grand_total}")
    
    # Validate tax accounts
    for tax_row in self.taxes:
        if not frappe.db.exists("Account", tax_row.account_head):
            frappe.throw(f"Account '{tax_row.account_head}' not found in Chart of Accounts")
```

### Rollback Strategy

#### Invoice Cancellation

```python
def cancel_invoice_with_rollback(invoice_name):
    """
    Cancel invoice and create reversal GL Entry.
    If any error occurs, rollback the entire transaction.
    """
    
    try:
        # Start transaction
        frappe.db.begin()
        
        # Get invoice
        invoice = frappe.get_doc("Sales Invoice", invoice_name)
        
        # Validate can cancel
        if invoice.docstatus != 1:
            raise ValidationError("Only submitted invoices can be cancelled")
        
        # Create reversal GL Entry
        original_gl_entries = frappe.get_all(
            "GL Entry",
            filters={"voucher_no": invoice_name},
            fields=["*"]
        )
        
        for entry in original_gl_entries:
            reversal_entry = frappe.get_doc({
                "doctype": "GL Entry",
                "account": entry.account,
                "debit": entry.credit,  # Swap
                "credit": entry.debit,  # Swap
                "against": entry.against,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice_name,
                "posting_date": today(),
                "remarks": f"Reversal: {entry.remarks}",
                "is_cancelled": 1
            })
            reversal_entry.insert()
        
        # Cancel invoice
        invoice.cancel()
        
        # Commit transaction
        frappe.db.commit()
        
        return {"success": True, "message": "Invoice cancelled successfully"}
        
    except Exception as e:
        # Rollback on error
        frappe.db.rollback()
        frappe.log_error(f"Error cancelling invoice: {str(e)}")
        raise
```


## Correctness Properties

*Property adalah karakteristik atau perilaku yang harus berlaku untuk semua eksekusi sistem yang valid - pada dasarnya, pernyataan formal tentang apa yang harus dilakukan sistem. Properties berfungsi sebagai jembatan antara spesifikasi yang dapat dibaca manusia dan jaminan correctness yang dapat diverifikasi mesin.*

### Property Reflection

Sebelum mendefinisikan properties, saya melakukan analisis untuk mengeliminasi redundancy:

**Redundancy yang Ditemukan:**

1. **GL Entry Balanced Property**: Requirements 6.5, 7.5, 8.5, 9.5, dan 10.6 semuanya menyatakan hal yang sama - "total debit = total credit". Ini dapat digabung menjadi satu property universal.

2. **Posting Date Property**: Requirements 6.6, 7.6, 8.6, dan 9.6 semuanya menyatakan "posting_date sama dengan invoice date". Ini dapat digabung menjadi satu property.

3. **API Backward Compatibility**: Requirements 2.8 dan 3.8 menyatakan hal yang sama untuk Sales dan Purchase Invoice. Dapat digabung dengan parameter invoice_type.

4. **Discount Calculation**: Requirements 4.3 dan 4.4 adalah inverse operations. Dapat digabung menjadi satu property tentang consistency antara percentage dan amount.

5. **Tax Calculation**: Requirements 4.5, 8.1, dan 9.1 semuanya tentang tax calculation. Dapat digabung menjadi satu property dengan parameter tax_type.

6. **Reversal Properties**: Requirements 6.4, 7.4, 8.4, 9.4, dan 10.5 semuanya tentang reversal. Ini adalah round-trip property yang dapat digabung.

**Properties Setelah Eliminasi Redundancy:**

Dari 100+ acceptance criteria, setelah eliminasi redundancy dan filtering (test requirements, documentation requirements, deployment requirements), tersisa sekitar 30 testable properties yang unique.

### Property 1: GL Entry Balanced (Fundamental Invariant)

*For any* invoice (Sales atau Purchase) yang disubmit dengan diskon dan/atau pajak, total debit harus sama dengan total credit di GL Entry yang diposting (dengan toleransi rounding error 0.01).

**Validates: Requirements 6.5, 7.5, 8.5, 9.5, 10.6**

**Rationale**: Ini adalah fundamental accounting invariant. Setiap transaksi akuntansi harus balanced. Jika tidak balanced, laporan keuangan akan corrupt.

**Test Strategy**: Property-based test dengan generator untuk random invoice data (items, discount, taxes), submit invoice, lalu verify total debit = total credit.

### Property 2: Grand Total Calculation Accuracy

*For any* invoice dengan items, diskon, dan pajak, grand_total harus sama dengan (subtotal - discount_amount + total_taxes) dengan toleransi rounding error 0.01.

**Validates: Requirements 5.5**

**Rationale**: Grand total adalah nilai final yang harus dibayar customer/supplier. Calculation error akan menyebabkan piutang/hutang tidak akurat.

**Test Strategy**: Property-based test dengan random items, discount, dan taxes. Calculate expected grand_total, lalu verify dengan actual grand_total dari sistem.

### Property 3: Discount Calculation Consistency

*For any* subtotal dan discount input (percentage atau amount), jika discount_percentage diisi maka discount_amount = (discount_percentage / 100) × subtotal, dan sebaliknya jika discount_amount diisi maka discount_percentage = (discount_amount / subtotal) × 100.

**Validates: Requirements 4.3, 4.4**

**Rationale**: Discount percentage dan amount harus konsisten. User bisa input salah satu, sistem harus calculate yang lain dengan benar.

**Test Strategy**: Property-based test dengan random subtotal dan discount. Test kedua arah: percentage → amount dan amount → percentage.

### Property 4: Discount Validation Range

*For any* discount input, discount_percentage harus antara 0 dan 100, dan discount_amount harus antara 0 dan subtotal. Input di luar range harus ditolak dengan error message.

**Validates: Requirements 5.1, 5.2**

**Rationale**: Discount tidak boleh negatif atau melebihi nilai invoice. Validasi ini mencegah data corruption.

**Test Strategy**: Property-based test dengan random invalid values (negative, > 100%, > subtotal). Verify sistem reject dengan error.

### Property 5: Tax Calculation Accuracy

*For any* net_total (subtotal setelah diskon) dan tax_template dengan rate tertentu, tax_amount harus sama dengan (rate / 100) × net_total untuk charge_type "On Net Total".

**Validates: Requirements 4.5, 8.1, 9.1**

**Rationale**: Tax calculation harus akurat sesuai rate yang ditentukan. Error calculation akan menyebabkan kewajiban pajak salah.

**Test Strategy**: Property-based test dengan random net_total dan tax_rate. Calculate expected tax_amount, verify dengan actual.

### Property 6: Tax Template Validation

*For any* tax_template yang dipilih, semua account_head yang direferensikan harus ada di Chart of Accounts dan template harus aktif (not disabled).

**Validates: Requirements 1.4, 5.3, 5.7**

**Rationale**: Tax template yang reference akun tidak valid akan menyebabkan GL Entry posting error.

**Test Strategy**: Property-based test dengan random tax templates (valid dan invalid). Verify validasi bekerja dengan benar.

### Property 7: Sales Invoice Discount GL Entry

*For any* Sales Invoice dengan discount_amount > 0, GL Entry harus include debit ke akun "4300 - Potongan Penjualan" sebesar discount_amount.

**Validates: Requirements 2.4, 6.1**

**Rationale**: Diskon penjualan harus dicatat sebagai contra-income untuk laporan keuangan yang akurat.

**Test Strategy**: Property-based test dengan random sales invoice dengan diskon. Submit invoice, verify GL Entry contains correct discount entry.

### Property 8: Sales Invoice Tax GL Entry

*For any* Sales Invoice dengan PPN, GL Entry harus include credit ke akun "2210 - Hutang PPN" sebesar tax_amount.

**Validates: Requirements 2.5, 8.1**

**Rationale**: PPN output harus dicatat sebagai liability untuk tracking kewajiban pajak.

**Test Strategy**: Property-based test dengan random sales invoice dengan PPN. Verify GL Entry contains correct tax entry.

### Property 9: Purchase Invoice Discount Effect

*For any* Purchase Invoice dengan discount_amount > 0, nilai persediaan yang dicatat harus sama dengan (subtotal - discount_amount), bukan subtotal penuh.

**Validates: Requirements 3.4, 7.1**

**Rationale**: Diskon pembelian mengurangi harga perolehan persediaan. Ini mempengaruhi HPP di masa depan.

**Test Strategy**: Property-based test dengan random purchase invoice dengan diskon. Verify stock ledger value = net_total (after discount).

### Property 10: Purchase Invoice Tax GL Entry

*For any* Purchase Invoice dengan PPN (PKP), GL Entry harus include debit ke akun "1410 - Pajak Dibayar Dimuka" sebesar tax_amount.

**Validates: Requirements 3.5, 9.1**

**Rationale**: PPN input dapat dikreditkan, harus dicatat sebagai asset.

**Test Strategy**: Property-based test dengan random purchase invoice dengan PPN. Verify GL Entry contains correct tax entry.

### Property 11: Invoice Cancellation Reversal (Round-trip Property)

*For any* submitted invoice dengan diskon dan pajak, jika invoice di-cancel maka sistem harus membuat reversal GL Entry dimana setiap debit menjadi credit dan setiap credit menjadi debit, sehingga net effect = 0.

**Validates: Requirements 6.4, 7.4, 8.4, 9.4, 10.5**

**Rationale**: Cancellation harus completely reverse original transaction. Ini adalah round-trip property: submit then cancel should restore original state.

**Test Strategy**: Property-based test dengan random invoice. Submit, verify GL Entry, cancel, verify reversal GL Entry. Sum of original + reversal should be zero for each account.

### Property 12: Posting Date Consistency

*For any* invoice yang disubmit, semua GL Entry yang diposting harus memiliki posting_date yang sama dengan invoice posting_date.

**Validates: Requirements 6.6, 7.6, 8.6, 9.6**

**Rationale**: GL Entry harus diposting di tanggal yang sama dengan invoice untuk laporan keuangan yang akurat per periode.

**Test Strategy**: Property-based test dengan random invoice dan posting_date. Verify semua GL Entry memiliki posting_date yang sama.

### Property 13: API Backward Compatibility

*For any* invoice yang dibuat sebelum implementasi fitur diskon/pajak, API GET harus mengembalikan discount_amount = 0, discount_percentage = 0, dan taxes = empty array.

**Validates: Requirements 2.8, 3.8, 14.1, 14.2, 14.5**

**Rationale**: Old invoices tidak memiliki data diskon/pajak. API harus return default values untuk backward compatibility.

**Test Strategy**: Create invoice tanpa diskon/pajak (simulate old invoice), fetch via API, verify default values.

### Property 14: Old Invoice Edit Idempotence

*For any* old invoice (tanpa diskon/pajak), jika user edit invoice tanpa mengubah diskon/pajak, maka GL Entry tidak boleh berubah.

**Validates: Requirements 14.4**

**Rationale**: Edit tanpa perubahan harus idempotent. Tidak boleh modify GL Entry yang sudah ada.

**Test Strategy**: Create old invoice, submit, get GL Entry snapshot, edit invoice (change non-discount field), verify GL Entry unchanged.

### Property 15: Real-time Calculation Consistency

*For any* perubahan pada items, discount, atau tax di invoice form, frontend calculation harus menghasilkan nilai yang sama dengan backend calculation (dengan toleransi rounding error 0.01).

**Validates: Requirements 4.7**

**Rationale**: Frontend dan backend harus calculate dengan logic yang sama. Inconsistency akan confuse user.

**Test Strategy**: Property-based test dengan random invoice data. Calculate di frontend, submit ke backend, verify values match.

### Property 16: Discount Priority Rule

*For any* invoice dimana discount_amount dan discount_percentage diisi bersamaan, sistem harus menggunakan discount_amount sebagai nilai final dan recalculate discount_percentage.

**Validates: Requirements 5.4**

**Rationale**: Harus ada priority rule yang jelas untuk menghindari ambiguity.

**Test Strategy**: Property-based test dengan random values untuk both fields. Verify discount_amount yang digunakan.

### Property 17: Tax Template Persistence (Round-trip Property)

*For any* tax_template yang dibuat dan disimpan, jika di-retrieve kembali dari database, semua field harus sama dengan nilai original (title, rate, account_head, dll).

**Validates: Requirements 1.5**

**Rationale**: Data persistence harus reliable. Ini adalah round-trip property: save then load should return same data.

**Test Strategy**: Property-based test dengan random tax template. Create, save, retrieve, verify all fields match.

### Property 18: Profit Loss Report Discount Display

*For any* periode dengan sales invoices yang memiliki diskon, Laporan Laba Rugi harus menampilkan "Potongan Penjualan" sebagai pengurang dari "Pendapatan Penjualan", dan Net Sales = Gross Sales - Potongan Penjualan.

**Validates: Requirements 11.1, 11.3**

**Rationale**: Diskon harus visible di laporan untuk analisis profitabilitas yang akurat.

**Test Strategy**: Create sales invoices dengan diskon, run Profit Loss report, verify discount line exists dan calculation correct.

### Property 19: Balance Sheet Tax Account Display

*For any* tanggal dengan invoices yang memiliki pajak, Laporan Neraca harus menampilkan saldo akun pajak (1410, 2210, 2230, 2240) di section yang benar (Asset Lancar atau Kewajiban Lancar).

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

**Rationale**: Akun pajak harus visible di neraca untuk tracking posisi kewajiban/aset pajak.

**Test Strategy**: Create invoices dengan pajak, run Balance Sheet, verify tax accounts displayed dengan saldo yang benar.

### Property 20: VAT Report Calculation

*For any* periode, Laporan PPN harus menghitung PPN Kurang/Lebih Bayar = (Total PPN Output dari akun 2210) - (Total PPN Input dari akun 1410).

**Validates: Requirements 13.3, 13.4, 13.5**

**Rationale**: Calculation PPN yang harus disetor harus akurat untuk compliance pajak.

**Test Strategy**: Create sales dan purchase invoices dengan PPN, run VAT report, verify calculation: Output - Input = Net Payable.

### Property 21: Currency Formatting Consistency

*For any* nilai currency di reports atau UI, format harus konsisten: "Rp" prefix, pemisah ribuan (.), dan 2 decimal places.

**Validates: Requirements 11.5, 12.5**

**Rationale**: Consistent formatting meningkatkan readability dan menghindari confusion.

**Test Strategy**: Property-based test dengan random currency values. Verify format output matches pattern: /^Rp\s[\d{1,3}(\.\\d{3})*,\\d{2}$/.

### Property 22: Report Period Filtering

*For any* report dengan filter periode (from_date, to_date), hanya data dengan posting_date dalam range tersebut yang harus ditampilkan.

**Validates: Requirements 11.6, 12.6, 13.7**

**Rationale**: Period filtering harus akurat untuk analisis per periode.

**Test Strategy**: Create invoices di berbagai tanggal, run report dengan filter, verify hanya data dalam range yang muncul.

### Property 23: API Optional Fields Default Values

*For any* API request untuk create invoice tanpa field discount/tax, sistem harus menggunakan default values: discount_amount = 0, discount_percentage = 0, taxes = [].

**Validates: Requirements 2.1, 2.2, 2.3, 3.1, 3.2, 3.3**

**Rationale**: Optional fields harus memiliki default values yang sensible untuk backward compatibility.

**Test Strategy**: Property-based test dengan invoice data tanpa discount/tax fields. Verify sistem create invoice dengan default values.

### Property 24: API Error Response Format

*For any* API request dengan invalid data (discount > subtotal, invalid tax template, dll), response harus memiliki format: { success: false, message: string, error: string, status: 400 }.

**Validates: Requirements 2.7, 3.7, 5.6**

**Rationale**: Consistent error response format memudahkan error handling di frontend.

**Test Strategy**: Property-based test dengan random invalid data. Verify error response format dan status code.

### Property 25: Tax Template Active Filter

*For any* request untuk fetch tax templates, hanya templates dengan disabled = 0 (active) yang harus dikembalikan.

**Validates: Requirements 1.6**

**Rationale**: Inactive templates tidak boleh digunakan untuk invoice baru.

**Test Strategy**: Create mix of active dan inactive templates, fetch via API, verify hanya active yang returned.

### Property 26: Audit Trail in GL Entry Remarks

*For any* GL Entry yang diposting dari invoice dengan diskon atau pajak, field remarks harus mencantumkan discount_amount atau tax_amount untuk audit trail.

**Validates: Requirements 6.3, 7.3, 8.3, 9.3, 10.4**

**Rationale**: Audit trail penting untuk tracking dan debugging. Remarks harus descriptive.

**Test Strategy**: Property-based test dengan random invoice. Submit, verify GL Entry remarks contains discount/tax information.

### Property 27: Stock Valuation with Discount

*For any* purchase invoice dengan diskon, stock ledger entry harus mencatat valuation_rate berdasarkan net_total (after discount), bukan gross total.

**Validates: Requirements 7.1, 7.2**

**Rationale**: Diskon pembelian mengurangi harga perolehan. Stock valuation harus reflect actual cost.

**Test Strategy**: Create purchase invoice dengan diskon, verify stock ledger valuation_rate = (net_total / total_qty).

### Property 28: Multiple Tax Rows Calculation

*For any* invoice dengan multiple tax rows (e.g., PPN + PPh 23), setiap tax row harus dihitung berdasarkan charge_type-nya, dan running_total harus accumulate dengan benar.

**Validates: Requirements 10.1, 10.2, 10.3**

**Rationale**: Multiple taxes harus dihitung secara sequential dengan running total yang benar.

**Test Strategy**: Property-based test dengan random multiple tax rows. Verify each tax calculation dan final grand_total.

### Property 29: Report Historical Consistency

*For any* periode sebelum implementasi fitur diskon/pajak, nilai di laporan keuangan harus tetap sama dengan nilai sebelum implementasi.

**Validates: Requirements 14.6**

**Rationale**: Implementasi fitur baru tidak boleh mengubah historical data. Reports harus consistent.

**Test Strategy**: Snapshot report values sebelum implementasi, run reports setelah implementasi untuk periode yang sama, verify values unchanged.

### Property 30: Form Display Without Error for Old Invoices

*For any* old invoice (created before implementation), membuka invoice form harus berhasil tanpa error, dengan discount fields menampilkan 0 dan tax fields menampilkan empty.

**Validates: Requirements 14.3**

**Rationale**: Backward compatibility di UI. Old invoices harus tetap bisa dibuka dan diedit.

**Test Strategy**: Create old invoice (simulate by not filling discount/tax), open form, verify no errors dan fields show default values.


## Testing Strategy

### Dual Testing Approach

Implementasi fitur diskon dan pajak memerlukan kombinasi unit testing dan property-based testing untuk coverage yang komprehensif:

**Unit Tests**: Untuk specific examples, edge cases, dan integration points
**Property Tests**: Untuk universal properties yang harus berlaku untuk semua inputs

Kedua jenis test ini complementary dan sama-sama penting:
- Unit tests menangkap concrete bugs dengan specific scenarios
- Property tests memverifikasi general correctness dengan randomized inputs

### Property-Based Testing Configuration

**Library**: 
- **JavaScript/TypeScript**: `fast-check` (https://github.com/dubzzz/fast-check)
- **Python**: `hypothesis` (https://hypothesis.readthedocs.io/)

**Configuration**:
```typescript
// fast-check configuration
fc.configureGlobal({
  numRuns: 100,  // Minimum 100 iterations per property test
  verbose: true,
  seed: Date.now()
});
```

```python
# hypothesis configuration
from hypothesis import settings, Verbosity

settings.register_profile("default", max_examples=100, verbosity=Verbosity.verbose)
settings.load_profile("default")
```

**Test Tagging**:
Setiap property test harus di-tag dengan reference ke design property:

```typescript
describe("Feature: discount-and-tax-implementation, Property 1: GL Entry Balanced", () => {
  it("should ensure total debit equals total credit for any invoice", () => {
    fc.assert(
      fc.property(
        invoiceArbitrary,
        (invoice) => {
          const glEntries = postGLEntry(invoice);
          const totalDebit = sum(glEntries.map(e => e.debit));
          const totalCredit = sum(glEntries.map(e => e.credit));
          return Math.abs(totalDebit - totalCredit) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Categories

#### 1. Unit Tests (Specific Examples)

**Discount Calculation Tests**:
```typescript
describe("Discount Calculation", () => {
  test("should calculate discount amount from percentage", () => {
    const result = calculateDiscount(1000000, 10, 0);
    expect(result.discount_amount).toBe(100000);
    expect(result.net_total).toBe(900000);
  });
  
  test("should calculate discount percentage from amount", () => {
    const result = calculateDiscount(1000000, 0, 150000);
    expect(result.discount_percentage).toBe(15);
    expect(result.net_total).toBe(850000);
  });
  
  test("should prioritize discount amount over percentage", () => {
    const result = calculateDiscount(1000000, 10, 150000);
    expect(result.discount_amount).toBe(150000);
    expect(result.discount_percentage).toBe(15);
  });
  
  test("should handle zero discount", () => {
    const result = calculateDiscount(1000000, 0, 0);
    expect(result.discount_amount).toBe(0);
    expect(result.net_total).toBe(1000000);
  });
});
```

**Tax Calculation Tests**:
```typescript
describe("Tax Calculation", () => {
  test("should calculate PPN 11% correctly", () => {
    const taxTemplate = {
      taxes: [{ charge_type: "On Net Total", rate: 11, account_head: "2210 - Hutang PPN" }]
    };
    const result = calculateTaxes(900000, taxTemplate);
    expect(result.total_taxes).toBe(99000);
    expect(result.grand_total).toBe(999000);
  });
  
  test("should calculate multiple taxes (PPN + PPh 23)", () => {
    const taxTemplate = {
      taxes: [
        { charge_type: "On Net Total", rate: 11, add_deduct_tax: "Add" },
        { charge_type: "On Net Total", rate: 2, add_deduct_tax: "Deduct" }
      ]
    };
    const result = calculateTaxes(900000, taxTemplate);
    expect(result.total_taxes).toBe(81000); // 99000 - 18000
  });
});
```

**GL Entry Tests**:
```typescript
describe("GL Entry Posting", () => {
  test("should post correct GL Entry for sales invoice with discount and tax", () => {
    const invoice = {
      name: "SI-2024-00001",
      customer: "CUST-001",
      total: 1000000,
      discount_amount: 100000,
      net_total: 900000,
      taxes: [{ account_head: "2210 - Hutang PPN", tax_amount: 99000 }],
      grand_total: 999000
    };
    
    const result = postSalesInvoiceGLEntry(invoice, "2024-01-15");
    
    expect(result.is_balanced).toBe(true);
    expect(result.total_debit).toBe(1099000);
    expect(result.total_credit).toBe(1099000);
    
    // Verify specific entries
    const piutangEntry = result.gl_entries.find(e => e.account.includes("Piutang"));
    expect(piutangEntry.debit).toBe(999000);
    
    const diskonEntry = result.gl_entries.find(e => e.account.includes("Potongan"));
    expect(diskonEntry.debit).toBe(100000);
    
    const pendapatanEntry = result.gl_entries.find(e => e.account.includes("Pendapatan"));
    expect(pendapatanEntry.credit).toBe(1000000);
    
    const ppnEntry = result.gl_entries.find(e => e.account.includes("PPN"));
    expect(ppnEntry.credit).toBe(99000);
  });
});
```

**Edge Cases**:
```typescript
describe("Edge Cases", () => {
  test("should handle very small amounts (rounding)", () => {
    const result = calculateDiscount(100, 0.5, 0);
    expect(result.discount_amount).toBe(0.5);
    expect(result.net_total).toBe(99.5);
  });
  
  test("should handle 100% discount", () => {
    const result = calculateDiscount(1000000, 100, 0);
    expect(result.discount_amount).toBe(1000000);
    expect(result.net_total).toBe(0);
  });
  
  test("should reject negative discount", () => {
    expect(() => calculateDiscount(1000000, -10, 0)).toThrow();
  });
  
  test("should reject discount exceeding subtotal", () => {
    expect(() => calculateDiscount(1000000, 0, 1500000)).toThrow();
  });
});
```

#### 2. Property-Based Tests

**Property 1: GL Entry Balanced**:
```typescript
import * as fc from "fast-check";

// Generator for invoice data
const invoiceArbitrary = fc.record({
  items: fc.array(
    fc.record({
      qty: fc.integer({ min: 1, max: 100 }),
      rate: fc.integer({ min: 1000, max: 1000000 })
    }),
    { minLength: 1, maxLength: 10 }
  ),
  discount_percentage: fc.integer({ min: 0, max: 100 }),
  tax_rate: fc.integer({ min: 0, max: 20 })
});

describe("Feature: discount-and-tax-implementation, Property 1: GL Entry Balanced", () => {
  it("should ensure total debit equals total credit for any invoice", () => {
    fc.assert(
      fc.property(invoiceArbitrary, (invoiceData) => {
        // Calculate totals
        const subtotal = invoiceData.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        const discount_amount = (invoiceData.discount_percentage / 100) * subtotal;
        const net_total = subtotal - discount_amount;
        const tax_amount = (invoiceData.tax_rate / 100) * net_total;
        const grand_total = net_total + tax_amount;
        
        const invoice = {
          total: subtotal,
          discount_amount,
          net_total,
          taxes: [{ account_head: "2210 - Hutang PPN", tax_amount }],
          grand_total
        };
        
        // Post GL Entry
        const result = postSalesInvoiceGLEntry(invoice, "2024-01-15");
        
        // Verify balanced
        return Math.abs(result.total_debit - result.total_credit) < 0.01;
      }),
      { numRuns: 100 }
    );
  });
});
```

**Property 2: Grand Total Calculation**:
```typescript
describe("Feature: discount-and-tax-implementation, Property 2: Grand Total Calculation Accuracy", () => {
  it("should calculate grand total correctly for any combination of items, discount, and tax", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ qty: fc.nat(100), rate: fc.nat(1000000) }), { minLength: 1 }),
        fc.nat(100), // discount_percentage
        fc.nat(20),  // tax_rate
        (items, discount_pct, tax_rate) => {
          const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
          const discount = (discount_pct / 100) * subtotal;
          const net_total = subtotal - discount;
          const tax = (tax_rate / 100) * net_total;
          const expected_grand_total = net_total + tax;
          
          const invoice = createInvoice(items, discount_pct, tax_rate);
          
          return Math.abs(invoice.grand_total - expected_grand_total) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 11: Invoice Cancellation Reversal (Round-trip)**:
```typescript
describe("Feature: discount-and-tax-implementation, Property 11: Invoice Cancellation Reversal", () => {
  it("should completely reverse GL Entry when invoice is cancelled", () => {
    fc.assert(
      fc.property(invoiceArbitrary, (invoiceData) => {
        // Create and submit invoice
        const invoice = createInvoice(invoiceData);
        const originalGL = postGLEntry(invoice);
        
        // Cancel invoice
        const reversalGL = cancelInvoice(invoice);
        
        // Verify reversal: sum of original + reversal should be zero for each account
        const accounts = new Set([
          ...originalGL.map(e => e.account),
          ...reversalGL.map(e => e.account)
        ]);
        
        for (const account of accounts) {
          const originalDebit = originalGL.filter(e => e.account === account).reduce((sum, e) => sum + e.debit, 0);
          const originalCredit = originalGL.filter(e => e.account === account).reduce((sum, e) => sum + e.credit, 0);
          const reversalDebit = reversalGL.filter(e => e.account === account).reduce((sum, e) => sum + e.debit, 0);
          const reversalCredit = reversalGL.filter(e => e.account === account).reduce((sum, e) => sum + e.credit, 0);
          
          const netDebit = originalDebit + reversalDebit - originalCredit - reversalCredit;
          
          if (Math.abs(netDebit) >= 0.01) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
```

#### 3. Integration Tests

**API Integration Tests**:
```typescript
describe("Sales Invoice API Integration", () => {
  test("should create invoice with discount and tax via API", async () => {
    const payload = {
      company: "BAC",
      customer: "CUST-001",
      posting_date: "2024-01-15",
      items: [
        { item_code: "ITEM-001", qty: 10, rate: 100000 }
      ],
      discount_percentage: 10,
      taxes_and_charges: "PPN 11%"
    };
    
    const response = await fetch("/api/sales/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.discount_amount).toBe(100000);
    expect(data.data.grand_total).toBe(999000);
  });
  
  test("should fetch old invoices with default discount/tax values", async () => {
    // Create old invoice (without discount/tax)
    const oldInvoice = await createOldInvoice();
    
    // Fetch via API
    const response = await fetch(`/api/sales/invoices?company=BAC`);
    const data = await response.json();
    
    const invoice = data.data.find(inv => inv.name === oldInvoice.name);
    expect(invoice.discount_amount).toBe(0);
    expect(invoice.taxes).toEqual([]);
  });
});
```

**ERPNext Integration Tests**:
```python
import frappe
from frappe.tests.utils import FrappeTestCase

class TestSalesInvoiceDiscount(FrappeTestCase):
    def test_gl_entry_with_discount_and_tax(self):
        """Test GL Entry posting for invoice with discount and tax"""
        
        # Create Sales Invoice
        invoice = frappe.get_doc({
            "doctype": "Sales Invoice",
            "company": "BAC",
            "customer": "CUST-001",
            "posting_date": "2024-01-15",
            "items": [{
                "item_code": "ITEM-001",
                "qty": 10,
                "rate": 100000
            }],
            "discount_percentage": 10,
            "taxes_and_charges": "PPN 11%"
        })
        invoice.insert()
        invoice.submit()
        
        # Verify GL Entry
        gl_entries = frappe.get_all(
            "GL Entry",
            filters={"voucher_no": invoice.name},
            fields=["account", "debit", "credit"]
        )
        
        total_debit = sum(e.debit for e in gl_entries)
        total_credit = sum(e.credit for e in gl_entries)
        
        self.assertAlmostEqual(total_debit, total_credit, places=2)
        self.assertAlmostEqual(total_debit, 1099000, places=2)
        
        # Verify specific accounts
        piutang = next(e for e in gl_entries if "Piutang" in e.account)
        self.assertEqual(piutang.debit, 999000)
        
        diskon = next(e for e in gl_entries if "Potongan" in e.account)
        self.assertEqual(diskon.debit, 100000)
        
        pendapatan = next(e for e in gl_entries if "Pendapatan" in e.account)
        self.assertEqual(pendapatan.credit, 1000000)
        
        ppn = next(e for e in gl_entries if "PPN" in e.account)
        self.assertEqual(ppn.credit, 99000)
```

#### 4. End-to-End Tests

**E2E Test Flow**:
```typescript
describe("E2E: Complete Invoice Flow with Discount and Tax", () => {
  test("should complete full flow: create → submit → verify GL → verify report", async () => {
    // 1. Create invoice via API
    const createResponse = await createSalesInvoice({
      items: [{ item_code: "ITEM-001", qty: 10, rate: 100000 }],
      discount_percentage: 10,
      taxes_and_charges: "PPN 11%"
    });
    
    expect(createResponse.success).toBe(true);
    const invoiceName = createResponse.data.name;
    
    // 2. Verify GL Entry
    const glEntries = await fetchGLEntries(invoiceName);
    expect(glEntries.length).toBeGreaterThan(0);
    
    const totalDebit = glEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = glEntries.reduce((sum, e) => sum + e.credit, 0);
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
    
    // 3. Verify Profit Loss Report
    const plReport = await fetchProfitLossReport("2024-01-01", "2024-01-31");
    expect(plReport.potongan_penjualan).toBeGreaterThan(0);
    
    // 4. Verify Balance Sheet
    const bsReport = await fetchBalanceSheet("2024-01-31");
    expect(bsReport.hutang_ppn).toBeGreaterThan(0);
    
    // 5. Verify VAT Report
    const vatReport = await fetchVATReport("2024-01-01", "2024-01-31");
    expect(vatReport.ppn_output).toBeGreaterThan(0);
    
    // 6. Cancel invoice
    const cancelResponse = await cancelInvoice(invoiceName);
    expect(cancelResponse.success).toBe(true);
    
    // 7. Verify reversal GL Entry
    const reversalGL = await fetchGLEntries(invoiceName, { is_cancelled: 1 });
    expect(reversalGL.length).toBe(glEntries.length);
  });
});
```

### Test Coverage Goals

**Target Coverage**:
- Unit Tests: 80% code coverage
- Property Tests: 100% coverage untuk critical properties (GL Entry balanced, calculation accuracy)
- Integration Tests: All API endpoints dan ERPNext hooks
- E2E Tests: All major user flows

**Critical Paths** (Must have 100% coverage):
1. GL Entry posting logic
2. Discount calculation
3. Tax calculation
4. Invoice cancellation/reversal
5. Backward compatibility

### Continuous Testing

**Pre-commit Hooks**:
```bash
# Run unit tests before commit
npm run test:unit

# Run property tests (fast mode: 10 iterations)
npm run test:property:fast
```

**CI/CD Pipeline**:
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests (100 iterations)
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

**Staging Environment Testing**:
- Deploy ke staging sebelum production
- Run full test suite di staging dengan production-like data
- Manual UAT oleh Finance team
- Performance testing dengan 1000+ invoices


## Implementation Phases

### Phase 1: Setup Tax Templates (Week 1)

**Objective**: Membuat dan mengkonfigurasi Tax Templates di ERPNext

**Tasks**:
1. Create Sales Taxes and Charges Template:
   - PPN 11% (Output)
   - PPN 11% + PPh 23 (2%)
   - PPN 11% + PPh 22 (1.5%)

2. Create Purchase Taxes and Charges Template:
   - PPN Masukan 11% (PKP)
   - PPN Masukan 11% (Non-PKP)

3. Validate templates dengan dummy invoice di ERPNext UI
4. Verify GL Entry generated correctly
5. Document template configuration

**Deliverables**:
- Tax templates created and tested
- GL Entry validation passed
- Configuration documentation

### Phase 2: API Enhancement (Week 2-3)

**Objective**: Update API untuk support discount dan tax fields

**Tasks**:
1. Update Sales Invoice API:
   - Add discount fields to request/response
   - Add taxes array to request/response
   - Maintain backward compatibility
   - Add validation

2. Update Purchase Invoice API:
   - Same as Sales Invoice

3. Create Tax Template API:
   - GET endpoint untuk fetch templates
   - Filter by type (Sales/Purchase)

4. Write API tests:
   - Unit tests untuk validation
   - Integration tests dengan ERPNext
   - Backward compatibility tests

**Deliverables**:
- API endpoints updated
- Backward compatibility maintained
- API documentation updated
- Test coverage > 80%

### Phase 3: UI Implementation (Week 4-5)

**Objective**: Build UI components untuk input discount dan tax

**Tasks**:
1. Create reusable components:
   - DiscountInput component
   - TaxTemplateSelect component
   - InvoiceSummary component

2. Update Sales Invoice Form:
   - Add discount section
   - Add tax section
   - Add summary section
   - Implement real-time calculation

3. Update Purchase Invoice Form:
   - Same as Sales Invoice

4. Update Invoice List View:
   - Add discount column
   - Add tax column

5. Write UI tests:
   - Component tests
   - Integration tests
   - E2E tests

**Deliverables**:
- UI components created
- Forms updated
- Real-time calculation working
- User testing completed

### Phase 4: Reports Update (Week 6)

**Objective**: Update financial reports untuk display discount dan tax

**Tasks**:
1. Update Laporan Laba Rugi:
   - Add "Potongan Penjualan" line
   - Recalculate Net Sales

2. Update Laporan Neraca:
   - Verify tax accounts displayed

3. Create Laporan PPN:
   - PPN Output section
   - PPN Input section
   - Net Payable calculation
   - Export to Excel

4. Test reports:
   - Verify calculations
   - Test period filtering
   - Test backward compatibility

**Deliverables**:
- Financial reports updated
- PPN report created
- All reports tested

### Phase 5: Testing & Documentation (Week 7)

**Objective**: Comprehensive testing dan documentation

**Tasks**:
1. End-to-end testing:
   - Complete invoice flow
   - Verify GL Entry
   - Verify reports
   - Test backward compatibility

2. User Acceptance Testing (UAT):
   - Train Finance team
   - Test real scenarios
   - Collect feedback
   - Fix issues

3. Documentation:
   - User manual (Bahasa Indonesia)
   - API documentation
   - Video tutorial
   - Troubleshooting guide

4. Deployment preparation:
   - Backup database
   - Prepare rollback plan
   - Schedule deployment window

**Deliverables**:
- All tests passed
- UAT completed
- Documentation complete
- Ready for production

## Risk Management

### High Risks

**Risk 1: GL Entry Corruption**
- **Impact**: Laporan keuangan corrupt, data loss
- **Probability**: Medium
- **Mitigation**:
  - Extensive testing di staging dengan production data
  - Property-based tests untuk verify balanced entry
  - Backup database sebelum deployment
  - Rollback plan ready
  - Monitor GL Entry setelah deployment

**Risk 2: Backward Compatibility Issues**
- **Impact**: Old invoices error, user confusion
- **Probability**: Low (karena field sudah ada di ERPNext)
- **Mitigation**:
  - Comprehensive backward compatibility tests
  - Test dengan actual old invoices
  - Gradual rollout (optional fields first)

### Medium Risks

**Risk 3: User Confusion**
- **Impact**: User salah input, data inconsistent
- **Probability**: Medium
- **Mitigation**:
  - User training sebelum deployment
  - Video tutorial
  - In-app help text
  - Clear error messages

**Risk 4: Performance Impact**
- **Impact**: Slow invoice creation, timeout
- **Probability**: Low
- **Mitigation**:
  - Optimize calculation logic
  - Use ERPNext built-in calculation
  - Load test dengan 1000+ invoices
  - Monitor API response time

### Low Risks

**Risk 5: Tax Template Misconfiguration**
- **Impact**: Wrong tax calculation
- **Probability**: Low
- **Mitigation**:
  - Validation di setup phase
  - Test dengan dummy invoices
  - Documentation untuk configuration

## Success Criteria

### Functional Requirements

- ✅ Diskon item dan dokumen dapat diinput dan dihitung otomatis
- ✅ Pajak dapat dipilih dari template dan dihitung otomatis
- ✅ GL Entry generated correctly dengan akun diskon dan pajak
- ✅ Laporan keuangan menampilkan diskon dan pajak dengan benar
- ✅ Backward compatibility dengan existing invoices
- ✅ API mendukung field diskon dan pajak
- ✅ UI user-friendly dengan real-time calculation

### Non-Functional Requirements

- ✅ API response time < 500ms
- ✅ UI responsive dan real-time
- ✅ No data corruption
- ✅ No breaking changes
- ✅ Test coverage > 80%
- ✅ Documentation complete

### Business Requirements

- ✅ Finance team dapat track diskon penjualan/pembelian
- ✅ Tax officer dapat generate Laporan PPN untuk SPT
- ✅ Management dapat analyze profitability dengan diskon
- ✅ Compliance dengan standar akuntansi Indonesia

## Monitoring and Maintenance

### Post-Deployment Monitoring

**Week 1 After Deployment**:
- Monitor error logs setiap hari
- Check GL Entry balance setiap hari
- Verify laporan keuangan vs manual calculation
- Collect user feedback

**Week 2-4 After Deployment**:
- Monitor error logs setiap 2 hari
- Spot check GL Entry
- Review user feedback
- Fix minor issues

**Month 2+ After Deployment**:
- Regular monitoring (weekly)
- Performance optimization jika diperlukan
- Feature enhancement based on feedback

### Maintenance Tasks

**Monthly**:
- Review error logs
- Check data consistency
- Update documentation jika ada perubahan
- Review test coverage

**Quarterly**:
- Performance audit
- Security audit
- User satisfaction survey
- Feature enhancement planning

### Support

**Level 1 Support** (User Support):
- Help desk untuk user questions
- Troubleshooting guide
- Video tutorial reference

**Level 2 Support** (Technical Support):
- API debugging
- GL Entry investigation
- Data correction (jika diperlukan)

**Level 3 Support** (Development Team):
- Bug fixes
- Feature enhancements
- System optimization

## Appendix

### A. Glossary

- **DPP**: Dasar Pengenaan Pajak (tax base)
- **PPN**: Pajak Pertambahan Nilai (Value Added Tax)
- **PPh 23**: Pajak Penghasilan Pasal 23 (withholding tax for services)
- **PPh 22**: Pajak Penghasilan Pasal 22 (withholding tax for imports)
- **PKP**: Pengusaha Kena Pajak (taxable entrepreneur)
- **Contra Account**: Akun pengurang (e.g., Potongan Penjualan mengurangi Pendapatan)
- **GL Entry**: General Ledger Entry (jurnal akuntansi)
- **Balanced Entry**: Jurnal yang total debit = total credit

### B. References

- ERPNext Documentation: https://docs.erpnext.com/
- ERPNext Sales Invoice: https://docs.erpnext.com/docs/user/manual/en/accounts/sales-invoice
- ERPNext Purchase Invoice: https://docs.erpnext.com/docs/user/manual/en/accounts/purchase-invoice
- ERPNext Tax Template: https://docs.erpnext.com/docs/user/manual/en/setting-up/setting-up-taxes
- Fast-check Documentation: https://github.com/dubzzz/fast-check
- Hypothesis Documentation: https://hypothesis.readthedocs.io/

### C. Related Documents

- Requirements Document: `requirements.md`
- Task List: `tasks.md` (to be created)
- COA Analysis: `erp-next-system/docs/COA-Analysis-and-Opening-Balance.md`
- Discount & Tax Analysis: `erp-next-system/ANALISIS_DISKON_PAJAK.md`
- System Documentation: `erp-next-system/DOKUMENTASI_SISTEM_ERP.md`

### D. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | AI Assistant | Initial design document |

---

**Document Status**: Ready for Review  
**Next Step**: Review → Approval → Create Tasks → Implementation  
**Estimated Implementation Time**: 7 weeks

