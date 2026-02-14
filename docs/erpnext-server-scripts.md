# ERPNext Server Scripts — Commission Auto-Flag

Panduan untuk membuat Server Script di ERPNext untuk otomatis menandai status komisi pada Sales Invoice.

---

## 1. Auto-Flag Commission Payable (SI Lunas → Komisi Layak Bayar)

**Tujuan**: Ketika Sales Invoice sudah lunas (`outstanding_amount = 0`), otomatis set `custom_commission_payable = 1`.

### Langkah Setup di ERPNext:

1. Buka **Setup > Server Script** (atau `/app/server-script/new`)
2. Isi form:
   - **Name**: `Auto Flag Commission Payable`
   - **Script Type**: `DocType Event`
   - **Reference DocType**: `Sales Invoice`
   - **DocType Event**: `on_update_after_submit`
   - **Enabled**: ✅

3. Isi Script:

```python
# Auto Flag Commission Payable
# Trigger: Sales Invoice on_update_after_submit
# Ketika outstanding_amount = 0, set custom_commission_payable = 1
# Ketika outstanding_amount > 0, set custom_commission_payable = 0

if doc.docstatus == 1:
    commission_total = doc.get("custom_total_komisi_sales") or 0
    
    if commission_total > 0:
        if doc.outstanding_amount == 0:
            if not doc.get("custom_commission_payable"):
                frappe.db.set_value("Sales Invoice", doc.name, "custom_commission_payable", 1)
                frappe.msgprint(
                    f"Faktur {doc.name} lunas. Komisi Rp {commission_total:,.0f} siap dibayar.",
                    alert=True
                )
        else:
            if doc.get("custom_commission_payable"):
                frappe.db.set_value("Sales Invoice", doc.name, "custom_commission_payable", 0)
```

### Custom Fields yang Diperlukan:

Buat custom field di **Sales Invoice** (Setup > Customize Form):

| Field Name | Label | Type | Default |
|---|---|---|---|
| `custom_commission_payable` | Komisi Layak Bayar | Check | 0 |
| `custom_commission_paid` | Komisi Sudah Dibayar | Check | 0 |
| `custom_total_komisi_sales` | Total Komisi Sales | Currency | 0 |

---

## 2. Auto-Flag Commission Paid (Setelah Pembayaran Komisi)

**Tujuan**: Ketika pembayaran komisi diproses (via Journal Entry), otomatis set `custom_commission_paid = 1` pada faktur terkait.

> **Catatan**: Fitur ini sudah dihandle oleh API Next.js (`/api/finance/commission/pay`).
> Server script di bawah ini adalah **backup/alternatif** jika ingin menangani via ERPNext langsung.

### Langkah Setup di ERPNext:

1. Buka **Setup > Server Script**
2. Isi form:
   - **Name**: `Auto Flag Commission Paid on JE Submit`
   - **Script Type**: `DocType Event`
   - **Reference DocType**: `Journal Entry`
   - **DocType Event**: `on_submit`
   - **Enabled**: ✅

3. Isi Script:

```python
# Auto Flag Commission Paid on Journal Entry Submit
# Trigger: Journal Entry on_submit
# Jika user_remark mengandung "Pembayaran Komisi Sales",
# parse invoice names dan set custom_commission_paid = 1

if doc.voucher_type == "Journal Entry" and doc.user_remark:
    remark = doc.user_remark or ""
    
    if "Pembayaran Komisi Sales" in remark:
        # Format remark: "Pembayaran Komisi Sales: {sales_person} - INV-001, INV-002, ..."
        parts = remark.split(" - ", 1)
        if len(parts) > 1:
            invoice_names = [inv.strip() for inv in parts[1].split(",") if inv.strip()]
            
            for inv_name in invoice_names:
                if frappe.db.exists("Sales Invoice", inv_name):
                    frappe.db.set_value("Sales Invoice", inv_name, "custom_commission_paid", 1)
                    frappe.db.set_value("Sales Invoice", inv_name, "custom_commission_payment_je", doc.name)
            
            if invoice_names:
                frappe.msgprint(
                    f"Komisi dibayar untuk {len(invoice_names)} faktur: {', '.join(invoice_names)}",
                    alert=True
                )
```

### Custom Field Tambahan (Opsional):

| Field Name | Label | Type |
|---|---|---|
| `custom_commission_payment_je` | No. Jurnal Pembayaran Komisi | Data |

---

## 3. Mapping Sales Person → Employee

Untuk pembayaran komisi via Journal Entry dengan Party Type = Employee, diperlukan mapping antara Sales Person dan Employee.

### Setup di ERPNext:

1. Buka **HR > Employee** untuk setiap sales person
2. Pastikan field **Employee Name** sesuai dengan nama Sales Person
3. Di **Selling > Sales Person**, isi field **Employee** dengan link ke Employee ID

Atau buat custom field di Sales Person:

| Field Name | Label | Type | Options |
|---|---|---|---|
| `custom_employee_id` | Employee ID | Link | Employee |

---

## Verifikasi

Setelah setup, verifikasi dengan:

1. Buat Sales Invoice dengan komisi → Submit
2. Buat Payment Entry untuk melunasi SI tersebut → Submit
3. Cek SI → `custom_commission_payable` harus = 1
4. Proses pembayaran komisi via sistem
5. Cek SI → `custom_commission_paid` harus = 1
