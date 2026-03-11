# Perhitungan Laba Bersih (Net Income Calculation)

## Ringkasan

Dokumentasi ini menjelaskan cara perhitungan laba bersih yang benar dalam sistem, terutama untuk menangani kasus **expense accounts dengan saldo negatif** (misalnya dari stock opname/adjustment).

---

## Formula Perhitungan

### Formula yang Benar ✓

```typescript
totalIncome = SUM(balance untuk semua akun Income)
expenseSum = SUM(balance untuk semua akun Expense)  // Bisa negatif!
netIncome = totalIncome - expenseSum  // JANGAN pakai Math.abs()
```

### Contoh Perhitungan

**Data:**
- Total Pendapatan: Rp 1.319.000
- HPP Barang Dagang: Rp 807.742 (Dr)
- Beban Komisi: Rp 167.200 (Dr)
- Biaya PLN: Rp 250.000 (Dr)
- Penyesuaian Stock: Rp -1.565.000 (Cr) ← Negatif!

**Perhitungan:**
```
expenseSum = 807.742 + 167.200 + 250.000 + (-1.565.000)
           = 1.224.942 - 1.565.000
           = -340.058 (negatif!)

netIncome = 1.319.000 - (-340.058)
          = 1.319.000 + 340.058
          = 1.659.058 ✓
```

---

## Kenapa Expense Bisa Negatif?

### Saldo Kredit di Expense Account

Expense account dengan **saldo kredit** (negatif) artinya ada **pengurangan beban**, yang terjadi saat:

1. **Stock Opname** - Menemukan barang yang tidak tercatat
2. **Retur Pembelian** - Mengembalikan barang ke supplier
3. **Koreksi** - Perbaikan kesalahan pencatatan
4. **Reversal** - Pembatalan transaksi sebelumnya

### Jurnal Stock Opname

```
Dr. Persediaan Barang (Asset)           Rp 1.565.000
    Cr. Penyesuaian Stock (Expense)         Rp 1.565.000
```

**Artinya:**
- Barang yang dikira hilang/terjual ternyata masih ada
- Beban berkurang (kredit di expense)
- Laba bertambah

---

## Implementasi di Kode

### 1. Utility Function (`lib/calculate-net-income.ts`)

```typescript
export function calculateNetIncome(nominalAccounts: AccountBalance[]) {
  const totalIncome = nominalAccounts
    .filter(a => a.root_type === 'Income')
    .reduce((sum, a) => sum + a.balance, 0);

  // Expense sum can be negative (e.g., stock opname adjustments)
  const expenseSum = nominalAccounts
    .filter(a => a.root_type === 'Expense')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // For display purposes only
  const totalExpense = Math.abs(expenseSum);

  // Calculate net income - don't use Math.abs on expenseSum!
  // If expenseSum is negative, it increases profit
  const netIncome = totalIncome - expenseSum;

  return {
    totalIncome,
    totalExpense,
    netIncome,
  };
}
```

### 2. Balance Sheet API (`app/api/finance/reports/route.ts`)

```typescript
// Calculate Net P/L for Balance Sheet
let totalIncome = 0;
let expenseSum = 0;

Array.from(accountMap.values()).forEach(row => {
  const rootType = master?.root_type || '';
  if (rootType === 'Income') {
    totalIncome += (row.credit - row.debit);
  } else if (rootType === 'Expense') {
    expenseSum += (row.debit - row.credit);
  }
});

// Don't use Math.abs on expenseSum
const netProfitLoss = totalIncome - expenseSum;
```

### 3. P&L Frontend (`app/financial-reports/page.tsx`)

```typescript
const plIncome = (plGrouped['Income'] || []).reduce((s, e) => s + e.amount, 0);
const plHPP = (plGrouped['Expense'] || [])
  .filter(e => e.account_type === 'Cost of Goods Sold')
  .reduce((s, e) => s + e.amount, 0);
const plOpex = (plGrouped['Expense'] || [])
  .filter(e => e.account_type !== 'Cost of Goods Sold')
  .reduce((s, e) => s + e.amount, 0);

const expenseSum = plHPP + plOpex;
const totalExpense = Math.abs(expenseSum); // For display
const plNet = plIncome - expenseSum; // Don't use Math.abs!
```

### 4. Closing Summary (`app/accounting-period/components/ClosingSummaryReport.tsx`)

```typescript
const totalIncome = nominal_accounts
  .filter(a => a.root_type === 'Income')
  .reduce((sum, a) => sum + a.balance, 0);

const expenseSum = nominal_accounts
  .filter(a => a.root_type === 'Expense')
  .reduce((sum, a) => sum + a.balance, 0);

const totalExpense = Math.abs(expenseSum); // For display
const calculatedNetIncome = totalIncome - expenseSum; // Don't use Math.abs!
```

---

## Kesalahan yang Sering Terjadi

### ❌ Salah: Pakai Math.abs() untuk Expense Sum

```typescript
const totalExpense = Math.abs(expenseSum);
const netIncome = totalIncome - totalExpense;

// Hasil: 1.319.000 - 340.058 = 978.942 (SALAH!)
```

### ✓ Benar: Jangan Pakai Math.abs() untuk Perhitungan

```typescript
const totalExpense = Math.abs(expenseSum); // Hanya untuk display
const netIncome = totalIncome - expenseSum; // Untuk perhitungan

// Hasil: 1.319.000 - (-340.058) = 1.659.058 (BENAR!)
```

---

## Tampilan di UI

### Untuk Display Individual Account

```typescript
// Tampilkan dengan absolute value + label Dr/Cr
{accounts.map(acc => (
  <tr>
    <td>{acc.account_name}</td>
    <td>
      {formatCurrency(Math.abs(acc.balance))} 
      {acc.balance >= 0 ? ' Dr' : ' Cr'}
    </td>
  </tr>
))}
```

### Untuk Display Total Beban

```typescript
<div>
  <p>Total Beban</p>
  <p>{formatCurrency(totalExpense)}</p>
  {expenseSum < 0 && <p>(Pengurangan Beban)</p>}
</div>
```

---

## Validasi

### Konsistensi Antar Laporan

Semua laporan harus menunjukkan laba bersih yang sama:

1. **Laporan Laba Rugi** (P&L)
2. **Neraca** (Balance Sheet) - di bagian Ekuitas
3. **Closing Summary Report**

### Perbandingan dengan ERPNext

Hasil perhitungan harus sama dengan ERPNext:

```
ERPNext P&L:
- Total Income: Rp 1.319.000
- Total Expense: Rp -340.058 (negatif)
- Profit: Rp 1.659.058

Next.js System:
- Total Pendapatan: Rp 1.319.000
- Total Beban: Rp 340.058 (display dengan abs)
- Laba Bersih: Rp 1.659.058 ✓
```

---

## Catatan Penting

1. **Math.abs() hanya untuk display**, bukan untuk perhitungan
2. **Expense negatif = pengurangan beban = laba naik**
3. **Jangan ubah formula** kecuali ada perubahan standar akuntansi
4. **Validasi dengan ERPNext** setiap kali ada perubahan

---

## Referensi

- File: `lib/calculate-net-income.ts`
- File: `app/api/finance/reports/route.ts`
- File: `app/financial-reports/page.tsx`
- File: `app/accounting-period/components/ClosingSummaryReport.tsx`

---

**Terakhir diupdate:** 11 Maret 2026
**Status:** ✓ Sudah diperbaiki dan divalidasi
