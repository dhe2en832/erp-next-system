# Sales Return Management - Complete Documentation

## 📋 Overview

Sales Return Management menggunakan **Hybrid Approach** yang menggabungkan kekuatan native ERPNext backend dengan custom Next.js frontend untuk memberikan pengalaman terbaik.

## 🎯 Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start Guide](../erpnext-dev/apps/batasku_custom/batasku_custom/QUICK_START_DELIVERY_NOTE_RETURN.md) | 5-minute setup | Developers |
| [Hybrid Summary](./SALES_RETURN_HYBRID_SUMMARY.md) | Architecture overview | Technical leads |
| [Migration Guide](./SALES_RETURN_MIGRATION_GUIDE.md) | Migrate from custom DocType | Developers |
| [Backend README](../erpnext-dev/apps/batasku_custom/batasku_custom/DELIVERY_NOTE_RETURN_README.md) | ERPNext implementation | Backend developers |
| [Spec Files](./.kiro/specs/sales-return-management/) | Requirements & design | All team |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Next.js Frontend (Custom UI)                │
│  - Sales Return List (srList)                           │
│  - Sales Return Form (srMain)                           │
│  - Delivery Note Dialog                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────▼───────────────────────────────────┐
│         API Routes: /api/sales/delivery-note-return     │
│  - GET /           (list with filters)                  │
│  - POST /          (create return)                      │
│  - GET /[name]     (get details)                        │
│  - PUT /[name]     (update draft)                       │
│  - POST /[name]/submit  (submit)                        │
│  - POST /[name]/cancel  (cancel)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Transform Data
                      │
┌─────────────────────▼───────────────────────────────────┐
│    ERPNext Native: Delivery Note (is_return=1)          │
│  + Custom Fields (batasku_custom):                      │
│    - return_reason (per item)                           │
│    - return_item_notes                                  │
│    - return_processed_date                              │
│    - return_processed_by                                │
│  + Validation Hooks:                                    │
│    - Quantity validation                                │
│    - Return reason required                             │
│    - Notes for "Other" reason                           │
│  + Native Features:                                     │
│    - Stock updates (automatic)                          │
│    - GL entries (automatic)                             │
│    - Print formats                                      │
│    - Email notifications                                │
└─────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### Backend (Native ERPNext)
- ✅ Automatic inventory updates
- ✅ Stock ledger entries
- ✅ GL entries for accounting
- ✅ Credit note support
- ✅ Print formats
- ✅ Email notifications
- ✅ Workflow support
- ✅ Permission system
- ✅ Upgrade compatible

### Custom Additions
- ✅ Return reason tracking (6 categories + Other)
- ✅ Return notes per item
- ✅ Return processed tracking
- ✅ Validation hooks
- ✅ Previous return tracking
- ✅ Custom frontend UI

### Frontend (Next.js)
- ✅ Dedicated return interface
- ✅ Delivery note selector
- ✅ Item selection with validation
- ✅ Return reason dropdown
- ✅ Conditional notes field
- ✅ Real-time validation
- ✅ Toast notifications
- ✅ Responsive design

## 🚀 Quick Start

### 1. Install Backend (5 minutes)

```bash
cd /path/to/frappe-bench
bench --site [your-site-name] console
```

```python
>>> from batasku_custom.install_delivery_note_return import install
>>> install()
```

### 2. Restart Bench

```bash
bench restart
bench --site [your-site-name] clear-cache
```

### 3. Test in ERPNext

1. Create a Delivery Note
2. Submit it
3. Create Return from it
4. Add return reasons
5. Submit return
6. Verify stock updated

### 4. Update Frontend (Optional)

If using Next.js frontend, update API endpoints:

```typescript
// Change from:
fetch('/api/sales/sales-return')

// To:
fetch('/api/sales/delivery-note-return')
```

See [Migration Guide](./SALES_RETURN_MIGRATION_GUIDE.md) for details.

## 📁 File Structure

### Backend Files

```
erpnext-dev/apps/batasku_custom/batasku_custom/
├── custom_fields/
│   └── delivery_note_return_fields.py       # Custom field definitions
├── overrides/
│   └── delivery_note_return.py              # Validation & hooks
├── hooks.py                                 # Hook registration
├── install_delivery_note_return.py          # Installation script
├── DELIVERY_NOTE_RETURN_README.md           # Backend docs
└── QUICK_START_DELIVERY_NOTE_RETURN.md      # Quick start
```

### Frontend Files

```
erp-next-system/
├── app/
│   ├── api/sales/delivery-note-return/      # NEW API routes
│   │   ├── route.ts                         # List + Create
│   │   └── [name]/
│   │       ├── route.ts                     # Detail + Update
│   │       ├── submit/route.ts              # Submit
│   │       └── cancel/route.ts              # Cancel
│   │
│   └── sales-return/                        # Frontend UI
│       ├── page.tsx
│       ├── srList/component.tsx
│       └── srMain/component.tsx
│
├── components/
│   └── DeliveryNoteDialog.tsx
│
├── types/
│   └── sales-return.ts
│
└── Documentation/
    ├── SALES_RETURN_README.md               # This file
    ├── SALES_RETURN_HYBRID_SUMMARY.md       # Architecture
    └── SALES_RETURN_MIGRATION_GUIDE.md      # Migration
```

## 📚 Documentation Index

### For Developers

1. **[Quick Start Guide](../erpnext-dev/apps/batasku_custom/batasku_custom/QUICK_START_DELIVERY_NOTE_RETURN.md)**
   - 5-minute setup
   - Installation commands
   - Verification steps
   - Quick test script

2. **[Migration Guide](./SALES_RETURN_MIGRATION_GUIDE.md)**
   - Migrate from custom DocType
   - Update frontend endpoints
   - Data migration script
   - Rollback plan

3. **[Backend README](../erpnext-dev/apps/batasku_custom/batasku_custom/DELIVERY_NOTE_RETURN_README.md)**
   - Custom fields details
   - Validation hooks
   - API documentation
   - Testing guide

### For Technical Leads

1. **[Hybrid Summary](./SALES_RETURN_HYBRID_SUMMARY.md)**
   - Architecture overview
   - Benefits analysis
   - Performance considerations
   - Troubleshooting

2. **[Spec Files](./.kiro/specs/sales-return-management/)**
   - Requirements document
   - Design document
   - Implementation tasks
   - Property-based tests

## 🔧 API Reference

### Base URL
```
/api/sales/delivery-note-return
```

### Endpoints

#### 1. List Returns
```http
GET /api/sales/delivery-note-return?limit=20&start=0&status=Submitted
```

#### 2. Create Return
```http
POST /api/sales/delivery-note-return
Content-Type: application/json

{
  "company": "PT Batasku",
  "customer": "CUST-001",
  "posting_date": "2024-01-15",
  "return_against": "DN-2024-00123",
  "items": [{
    "item_code": "ITEM-001",
    "qty": 5,
    "rate": 100000,
    "uom": "Nos",
    "warehouse": "Stores - B",
    "return_reason": "Damaged"
  }],
  "return_notes": "Customer reported damage"
}
```

#### 3. Get Return Detail
```http
GET /api/sales/delivery-note-return/DN-RET-2024-00001
```

#### 4. Update Return (Draft only)
```http
PUT /api/sales/delivery-note-return/DN-RET-2024-00001
Content-Type: application/json

{...same as create...}
```

#### 5. Submit Return
```http
POST /api/sales/delivery-note-return/DN-RET-2024-00001/submit
```

#### 6. Cancel Return
```http
POST /api/sales/delivery-note-return/DN-RET-2024-00001/cancel
```

## 🧪 Testing

### Backend Testing

```bash
# Install and verify
bench --site [site] console
>>> from batasku_custom.install_delivery_note_return import install, verify_installation
>>> install()
>>> verify_installation()

# Test validation
>>> import frappe
>>> dn = frappe.new_doc('Delivery Note')
>>> dn.is_return = 1
>>> # ... add fields ...
>>> dn.save()  # Should validate
```

### Frontend Testing

```bash
# Start dev server
cd erp-next-system
pnpm dev

# Navigate to
http://localhost:3000/sales-return

# Test:
1. Create return
2. Edit draft
3. Submit
4. Cancel
5. List view
6. Filters
7. Search
```

### Integration Testing

```sql
-- Check stock ledger
SELECT * FROM `tabStock Ledger Entry`
WHERE voucher_type = 'Delivery Note'
AND voucher_no LIKE 'DN-RET%'
ORDER BY posting_date DESC;

-- Check stock balance
SELECT item_code, warehouse, actual_qty, stock_value
FROM `tabBin`
WHERE item_code = 'ITEM-001';
```

## 🐛 Troubleshooting

### Custom fields not showing
```bash
bench --site [site] clear-cache
bench restart
# Reload browser (Ctrl+Shift+R)
```

### Validation not working
```bash
bench restart
bench --site [site] console
>>> import batasku_custom.hooks
>>> print(batasku_custom.hooks.doc_events)
```

### Stock not updating
- Check Stock Settings > Allow Negative Stock
- Check Item > Maintain Stock enabled
- Check warehouse permissions

### Permission denied
- Role Permission Manager > Delivery Note
- Grant Submit, Cancel, Amend permissions

## 📊 Benefits vs Custom DocType

| Feature | Custom DocType | Hybrid Approach |
|---------|----------------|-----------------|
| Inventory | Manual | ✅ Automatic |
| Accounting | Manual | ✅ Automatic |
| Upgrades | ❌ May break | ✅ Compatible |
| Maintenance | ❌ High | ✅ Low |
| Print Formats | ❌ Custom | ✅ Built-in |
| Workflow | ❌ Custom | ✅ Built-in |
| Return Tracking | ✅ Full control | ✅ Custom fields |
| UI/UX | ✅ Custom | ✅ Custom |

## 🔄 Migration Path

If you have existing custom `Sales Return` DocType:

1. **Backup data**
2. **Install custom fields**
3. **Run migration script**
4. **Update frontend**
5. **Test thoroughly**
6. **Delete old DocType**

See [Migration Guide](./SALES_RETURN_MIGRATION_GUIDE.md) for step-by-step instructions.

## 📞 Support

### Documentation
- Backend: `DELIVERY_NOTE_RETURN_README.md`
- Frontend: `SALES_RETURN_MIGRATION_GUIDE.md`
- Architecture: `SALES_RETURN_HYBRID_SUMMARY.md`
- Quick Start: `QUICK_START_DELIVERY_NOTE_RETURN.md`

### ERPNext Resources
- Official docs: https://docs.erpnext.com
- Delivery Note: https://docs.erpnext.com/docs/user/manual/en/stock/delivery-note
- Custom Fields: https://docs.erpnext.com/docs/user/manual/en/customize-erpnext/custom-field

### Contact
- Development team
- ERPNext community forum
- GitHub issues

## 📝 Version History

### v1.0 (2024-01-15)
- ✅ Initial hybrid implementation
- ✅ Native ERPNext backend
- ✅ Custom Next.js frontend
- ✅ Return reason tracking
- ✅ Validation hooks
- ✅ Stock integration
- ✅ Complete documentation

## 🎯 Next Steps

1. **Install**: Follow [Quick Start Guide](../erpnext-dev/apps/batasku_custom/batasku_custom/QUICK_START_DELIVERY_NOTE_RETURN.md)
2. **Test**: Create test returns in ERPNext
3. **Migrate**: Update frontend if needed
4. **Deploy**: Move to production
5. **Train**: Train users on new system

## 📄 License

Copyright (c) 2024, Batasku  
For license information, please see license.txt

