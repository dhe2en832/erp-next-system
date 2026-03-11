# 📚 Dokumentasi Sistem ERP - Next.js + ERPNext

## 🎯 Ringkasan Proyek

Sistem ERP berbasis web yang dibangun dengan Next.js 16 dan terintegrasi dengan backend ERPNext. Aplikasi ini mengelola operasi bisnis lengkap meliputi keuangan, pembelian, penjualan, inventori, dan SDM.

**Tech Stack:**
- Frontend: Next.js 16.1.6, React 19.2.3, TypeScript 5, Tailwind CSS 4
- Backend: ERPNext REST API
- Database: ERPNext (Frappe Framework)
- Real-time: WebSocket support

---

## 📁 Struktur Proyek

```
next-erp/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API Routes
│   │   ├── finance/              # Modul Keuangan
│   │   ├── purchase/             # Modul Pembelian
│   │   ├── sales/                # Modul Penjualan
│   │   ├── inventory/            # Modul Inventori
│   │   ├── hr/                   # Modul SDM
│   │   ├── setup/                # Setup & Autentikasi
│   │   └── utils/                # Utilities
│   ├── components/               # Komponen UI Shared
│   ├── [module-pages]/           # Halaman Frontend per Modul
│   ├── layout.tsx                # Root Layout
│   └── globals.css               # Global Styles
├── lib/                          # Utilities Shared
│   ├── erpnext.ts                # ERPNext API Helpers
│   └── normalizers.ts            # Data Transformation
├── utils/                        # Helper Functions
│   ├── format.ts                 # Format Currency/Date
│   └── erpnext-auth.ts           # Authentication
├── components/                   # Reusable Components
├── .env                          # Environment Variables
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript Config
```

---

## 🔧 Modul Utama

### 1. Modul Keuangan (`/api/finance/`)
**Fitur:**
- Chart of Accounts (221+ akun)
- Journal Entry Management
- GL Entry Tracking
- Laporan Keuangan (Trial Balance, Balance Sheet, P&L)
- Payment Management
- Perhitungan Komisi

**Endpoints:**
- `GET /api/finance/accounts` - Daftar akun
- `GET /api/finance/journal` - Journal entries
- `GET /api/finance/payments` - Daftar pembayaran
- `GET /api/finance/reports` - Laporan keuangan
- `POST /api/finance/commission/pay` - Bayar komisi

### 2. Modul Pembelian (`/api/purchase/`)
**Fitur:**
- Purchase Orders (PO) dengan submit/receive/complete
- Purchase Receipts (PR)
- Purchase Invoices (PI)
- Supplier Management

**Endpoints:**
- `GET /api/purchase/orders` - List PO
- `POST /api/purchase/orders` - Create PO
- `GET /api/purchase/orders/[name]` - Detail PO
- `POST /api/purchase/orders/[name]/submit` - Submit PO
- `POST /api/purchase/orders/[name]/receive` - Receive PO

### 3. Modul Penjualan (`/api/sales/`)
**Fitur:**
- Sales Orders (SO)
- Delivery Notes (DN) - buat dari SO
- Sales Invoices (SI) - buat dari DN
- Customer Management
- Sales Person Tracking

**Endpoints:**
- `GET /api/sales/orders` - List SO
- `POST /api/sales/orders` - Create SO
- `POST /api/sales/orders/[name]/submit` - Submit SO
- `GET /api/sales/delivery-notes` - List DN
- `POST /api/sales/invoices/from-delivery-note/[name]` - Create SI dari DN

### 4. Modul Inventori (`/api/inventory/`)
**Fitur:**
- Stock Entry Management
- Stock Reconciliation
- Item Management
- Warehouse Management

**Endpoints:**
- `GET /api/inventory/stock-entry` - List stock entries
- `POST /api/inventory/stock-entry` - Create stock entry
- `GET /api/inventory/items` - List items
- `GET /api/inventory/warehouses` - List warehouses

### 5. Modul SDM (`/api/hr/`)
**Fitur:**
- Employee Management
- Commission Tracking
- Commission Payments

**Endpoints:**
- `GET /api/hr/employees` - List employees
- `GET /api/hr/departments` - List departments
- `GET /api/hr/designations` - List designations

---

## 🔐 Autentikasi

**Metode:**
1. API Key Authentication (Primary)
2. Session-based Authentication (Fallback)

**Setup Environment Variables:**
```env
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
```

**Header Format:**
```typescript
Authorization: token ${apiKey}:${apiSecret}
```

---

## 📊 Pattern & Konvensi

### API Route Pattern (Next.js 14+)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params; // WAJIB await params
  // ... implementation
}
```

### Standard CRUD Pattern
- `GET /api/[module]/[resource]` - List dengan pagination/filtering
- `POST /api/[module]/[resource]` - Create
- `GET /api/[module]/[resource]/[name]` - Get detail
- `PUT /api/[module]/[resource]/[name]` - Update
- `DELETE /api/[module]/[resource]/[name]` - Delete
- `POST /api/[module]/[resource]/[name]/submit` - Submit action

### Response Format
**Success:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

### Data Formatting
- **Currency:** Indonesian Rupiah (IDR) dengan locale formatting
- **Dates:** DD/MM/YYYY untuk display, YYYY-MM-DD untuk API
- **Numbers:** Locale-aware dengan thousand separators

---

## 🎨 UI/UX Standards

### Color Palette
```css
/* Primary Actions */
--indigo-600: #4F46E5
--indigo-700: #4338CA

/* Status Colors */
--green-600: #16A34A    /* Success */
--yellow-600: #CA8A04   /* Warning */
--red-600: #DC2626      /* Danger */
--blue-600: #2563EB     /* Info */
```

### Component Patterns
- Modal alerts untuk validasi
- Success dialogs dengan countdown redirect
- Loading spinners untuk async operations
- Responsive grid layouts (1 col mobile, 3 col desktop)
- Color-coded status badges

---

## 🚀 Development Workflow

### Scripts
```bash
npm run dev        # Start development server (port 3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run ws-server  # Start WebSocket server
```

### Development Server
- Frontend: http://localhost:3000
- ERPNext Backend: http://localhost:8000 (configurable)

---

## 📖 Dokumentasi Existing

1. **COA_README.md** - Chart of Accounts implementation
2. **ERPNEXT_CRUD_OPERATIONS_GUIDE.md** - Complete CRUD patterns
3. **ERPNEXT_SUBMIT_IMPLEMENTATION_GUIDE.md** - Submit action patterns
4. **UI_STANDARDIZATION_GUIDE.md** - UI/UX standards
5. **VERIFICATION_CHECKLIST.md** - Sales Invoice verification
6. **app/api/README.md** - API structure documentation

---

## 🔄 Integrasi ERPNext

### Data Flow
```
ERPNext Database → API Routes → Frontend Components → User Interface
```

### Document Linking
- Delivery Note → Sales Invoice
- Sales Order → Delivery Note
- Purchase Order → Purchase Receipt
- Purchase Receipt → Purchase Invoice

### Key Operations
- CRUD operations pada semua document types
- Submit/receive/complete actions
- Status tracking dan updates
- Relational data linking
- Real-time data synchronization

---

## ✅ Status Implementasi

**Completed:**
- ✅ Modular API structure dengan semua CRUD operations
- ✅ Chart of Accounts dengan 221 accounts
- ✅ Purchase Orders dengan submit/receive/complete
- ✅ Sales Orders dengan submit
- ✅ Delivery Notes dengan create from SO
- ✅ Sales Invoices dengan create from DN
- ✅ Purchase Invoices
- ✅ Payment management
- ✅ Financial reports
- ✅ Inventory management
- ✅ Customer/Supplier management
- ✅ Commission tracking
- ✅ Modern UI dengan Tailwind CSS
- ✅ Comprehensive documentation

**In Progress:**
- 🔄 API migration ke new modular structure
- 🔄 Backward compatibility dengan old API paths

---

## 🎯 Best Practices

### Code Organization
- Clear modular separation by business domain
- Consistent CRUD patterns across modules
- Type-safe dengan TypeScript
- Component reusability
- Environment-based configuration

### Error Handling
- Proper try-catch blocks
- Meaningful error messages
- Consistent error response format
- Frontend error dialogs

### Performance
- Pagination untuk list views
- Lazy loading components
- Optimized API calls
- Caching strategies

### Security
- API Key authentication
- Environment variable protection
- Input validation
- XSS prevention

---

## 📞 Support & Maintenance

### Troubleshooting
1. Check ERPNext connection: `GET /api/utils/diagnose`
2. Verify API credentials in `.env`
3. Check browser console for errors
4. Review ERPNext logs

### Common Issues
- **401 Unauthorized:** Check API credentials
- **CORS errors:** Verify ERPNext CORS settings
- **Timestamp mismatch:** Use REST API PUT method for submit
- **Relational data loss:** Avoid `frappe.client.submit`

---

## 📝 Changelog

### Version 0.1.0 (Current)
- Initial implementation
- All core modules functional
- Comprehensive documentation
- Modern UI with Tailwind CSS
- ERPNext integration complete

---

## 🔮 Roadmap

### Phase 3 (Planned)
- ⏳ Remove old API folders after full migration
- ⏳ Enhanced API documentation
- ⏳ Standardized error handling across all modules
- ⏳ Unit testing implementation
- ⏳ E2E testing with Playwright
- ⏳ Performance optimization
- ⏳ Advanced reporting features
- ⏳ Mobile app development

---

**Last Updated:** 2026-02-20
**Maintained by:** Development Team
