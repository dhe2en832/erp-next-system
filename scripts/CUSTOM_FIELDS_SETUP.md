# Custom Fields Setup untuk Purchase Return & Debit Note

## Overview

Script ini membuat custom fields yang diperlukan untuk fitur Purchase Return dan Debit Note di ERPNext.

## Custom Fields yang Dibuat

### Purchase Receipt (untuk Purchase Return)

**Parent Level:**
- `custom_return_notes` - Text Editor untuk catatan tambahan retur

**Child Table (Purchase Receipt Item):**
- `custom_return_reason` - Select field untuk alasan retur (Damaged, Quality Issue, Wrong Item, Supplier Request, Expired, Other)
- `custom_return_item_notes` - Small Text untuk catatan item (wajib untuk alasan "Other")

### Purchase Invoice (untuk Debit Note)

**Parent Level:**
- `custom_return_notes` - Text Editor untuk catatan tambahan debit note

**Child Table (Purchase Invoice Item):**
- `custom_return_reason` - Select field untuk alasan retur (Damaged, Quality Issue, Wrong Item, Supplier Request, Expired, Other)
- `custom_return_item_notes` - Small Text untuk catatan item (wajib untuk alasan "Other")

## Cara Menjalankan

### Opsi 1: Via ERPNext Console (Recommended)

1. Login ke ERPNext
2. Buka **Console** (ketik "console" di search bar)
3. Copy dan paste script berikut:

```python
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# Purchase Receipt Custom Fields
pr_custom_fields = {
    'Purchase Receipt': [
        {
            'fieldname': 'custom_return_notes',
            'label': 'Return Notes',
            'fieldtype': 'Text Editor',
            'insert_after': 'remarks',
            'depends_on': 'eval:doc.is_return==1',
            'description': 'Additional notes for purchase return',
            'module': 'Batasku Custom',
        }
    ],
    'Purchase Receipt Item': [
        {
            'fieldname': 'custom_return_reason',
            'label': 'Return Reason',
            'fieldtype': 'Select',
            'options': '\nDamaged\nQuality Issue\nWrong Item\nSupplier Request\nExpired\nOther',
            'insert_after': 'item_name',
            'depends_on': 'eval:parent.is_return==1',
            'description': 'Reason for returning this item',
            'module': 'Batasku Custom',
        },
        {
            'fieldname': 'custom_return_item_notes',
            'label': 'Return Item Notes',
            'fieldtype': 'Small Text',
            'insert_after': 'custom_return_reason',
            'depends_on': 'eval:parent.is_return==1',
            'description': 'Additional notes for this return item',
            'module': 'Batasku Custom',
        }
    ]
}

# Purchase Invoice Custom Fields
pi_custom_fields = {
    'Purchase Invoice': [
        {
            'fieldname': 'custom_return_notes',
            'label': 'Return Notes',
            'fieldtype': 'Text Editor',
            'insert_after': 'remarks',
            'depends_on': 'eval:doc.is_return==1',
            'description': 'Additional notes for debit note',
            'module': 'Batasku Custom',
        }
    ],
    'Purchase Invoice Item': [
        {
            'fieldname': 'custom_return_reason',
            'label': 'Return Reason',
            'fieldtype': 'Select',
            'options': '\nDamaged\nQuality Issue\nWrong Item\nSupplier Request\nExpired\nOther',
            'insert_after': 'item_name',
            'depends_on': 'eval:parent.is_return==1',
            'description': 'Reason for returning this item',
            'module': 'Batasku Custom',
        },
        {
            'fieldname': 'custom_return_item_notes',
            'label': 'Return Item Notes',
            'fieldtype': 'Small Text',
            'insert_after': 'custom_return_reason',
            'depends_on': 'eval:parent.is_return==1',
            'description': 'Additional notes for this return item',
            'module': 'Batasku Custom',
        }
    ]
}

# Create custom fields
create_custom_fields(pr_custom_fields, update=True)
create_custom_fields(pi_custom_fields, update=True)
frappe.db.commit()

print("✅ All custom fields created successfully!")
```

4. Klik **Run** atau tekan Ctrl+Enter

### Opsi 2: Via Bench Command

```bash
cd /path/to/frappe-bench
bench --site your-site-name execute erp-next-system/scripts/create-return-custom-fields.py
```

**Note:** Ganti `your-site-name` dengan nama site ERPNext Anda.

### Opsi 3: Via Manual UI (Jika script tidak bisa dijalankan)

#### Untuk Purchase Receipt:

1. Buka **Customize Form**
2. Pilih DocType: **Purchase Receipt**
3. Tambahkan field:
   - Field Name: `custom_return_notes`
   - Label: `Return Notes`
   - Type: `Text Editor`
   - Insert After: `remarks`
   - Depends On: `eval:doc.is_return==1`
   - Module: `Batasku Custom`

4. Pilih DocType: **Purchase Receipt Item**
5. Tambahkan fields:
   - Field Name: `custom_return_reason`
   - Label: `Return Reason`
   - Type: `Select`
   - Options: (satu per baris)
     ```
     Damaged
     Quality Issue
     Wrong Item
     Supplier Request
     Expired
     Other
     ```
   - Insert After: `item_name`
   - Depends On: `eval:parent.is_return==1`
   - Module: `Batasku Custom`

   - Field Name: `custom_return_item_notes`
   - Label: `Return Item Notes`
   - Type: `Small Text`
   - Insert After: `custom_return_reason`
   - Depends On: `eval:parent.is_return==1`
   - Module: `Batasku Custom`

#### Untuk Purchase Invoice:

Ulangi langkah yang sama untuk **Purchase Invoice** dan **Purchase Invoice Item**.

## Verifikasi

Setelah custom fields dibuat, verifikasi dengan:

1. Buka **Purchase Receipt** form
2. Centang checkbox **Is Return**
3. Custom fields seharusnya muncul:
   - Return Notes (di parent)
   - Return Reason dan Return Item Notes (di items table)

4. Ulangi untuk **Purchase Invoice**

## Troubleshooting

### Error: "Module Batasku Custom not found"

Jika module "Batasku Custom" belum ada, buat dulu:

1. Buka **Module Def** list
2. Klik **New**
3. Module Name: `Batasku Custom`
4. App Name: `erpnext` atau custom app Anda
5. Save

Atau via console:
```python
frappe.get_doc({
    'doctype': 'Module Def',
    'module_name': 'Batasku Custom',
    'app_name': 'erpnext'
}).insert()
frappe.db.commit()
```

### Error: "Custom Field already exists"

Jika custom field sudah ada, script akan update field yang ada. Tidak perlu dihapus.

## Notes

- Custom fields hanya muncul ketika `is_return=1` (depends_on condition)
- Module "Batasku Custom" memudahkan export/import custom fields
- Script bisa dijalankan ulang dengan aman (update=True)
