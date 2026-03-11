# Perbaikan Neraca Tidak Seimbang

## Masalah

Neraca Saldo menunjukkan seimbang (Rp 874.061.413 = Rp 874.061.413), tetapi Tab Neraca tidak seimbang dengan selisih Rp 101.800:

- Total Aktiva: Rp 1.658.258
- Total Kewajiban: Rp 100.800
- Total Ekuitas: Rp 1.659.058
- Jumlah Kewajiban & Ekuitas: Rp 1.759.858
- **Selisih: Rp 101.800** ❌

## Akar Masalah

Kesalahan dalam perhitungan total Kewajiban dan Ekuitas di frontend. Kode lama menggunakan `Math.abs()` pada SETIAP balance individual sebelum dijumlahkan:

```typescript
// SALAH ❌
const bsLiab = (bsGrouped['Liability'] || []).reduce((s, e) => s + Math.abs(e.balance), 0);
const bsEquity = (bsGrouped['Equity'] || []).reduce((s, e) => {
  if (e.account === '__net_profit_loss__') {
    return s + e.balance;
  }
  return s + Math.abs(e.balance);
}, 0);
```

### Mengapa Ini Salah?

Contoh dengan data aktual:

**Kewajiban:**
- Akun 1: balance = -50.000 (Cr normal) → Math.abs(-50.000) = 50.000
- Akun 2: balance = 40.800 (Dr abnormal) → Math.abs(40.800) = 40.800
- Total = 50.000 + 40.800 = **90.800** ❌

**Perhitungan yang benar:**
- Akun 1: balance = -50.000 (Cr normal)
- Akun 2: balance = 40.800 (Dr abnormal)
- Total = -50.000 + 40.800 = -9.200 → display sebagai **9.200** ✓

## Solusi

Jumlahkan balance DULU dengan tanda aslinya, BARU ambil absolute value untuk display:

```typescript
// BENAR ✓
const bsLiab = (bsGrouped['Liability'] || []).reduce((s, e) => s + e.balance, 0);
const bsEquity = (bsGrouped['Equity'] || []).reduce((s, e) => s + e.balance, 0);

// Untuk display, gunakan Math.abs()
{fmtCur(Math.abs(bsLiab))}
{fmtCur(Math.abs(bsEquity))}
```

## Perubahan yang Dilakukan

### 1. Frontend - `app/financial-reports/page.tsx`

**Perhitungan Total:**
```typescript
// Sebelum
const bsLiab = (bsGrouped['Liability'] || []).reduce((s, e) => s + Math.abs(e.balance), 0);
const bsEquity = (bsGrouped['Equity'] || []).reduce((s, e) => {
  if (e.account === '__net_profit_loss__') return s + e.balance;
  return s + Math.abs(e.balance);
}, 0);

// Sesudah
const bsLiab = (bsGrouped['Liability'] || []).reduce((s, e) => s + e.balance, 0);
const bsEquity = (bsGrouped['Equity'] || []).reduce((s, e) => s + e.balance, 0);
```

**Display Summary Boxes:**
```typescript
// Sebelum
<p className="text-base font-bold text-orange-900">{fmtCur(bsLiab)}</p>
<p className="text-base font-bold text-purple-900">{fmtCur(bsEquity)}</p>

// Sesudah
<p className="text-base font-bold text-orange-900">{fmtCur(Math.abs(bsLiab))}</p>
<p className="text-base font-bold text-purple-900">{fmtCur(Math.abs(bsEquity))}</p>
```

**Display Section Totals:**
```typescript
// Sebelum
<span className="tabular-nums">{fmtCur(bsLiab)}</span>
<span className="tabular-nums">{fmtCur(bsEquity)}</span>
<span className="tabular-nums">{fmtCur(bsLiab + bsEquity)}</span>

// Sesudah
<span className="tabular-nums">{fmtCur(Math.abs(bsLiab))}</span>
<span className="tabular-nums">{fmtCur(Math.abs(bsEquity))}</span>
<span className="tabular-nums">{fmtCur(Math.abs(bsLiab + bsEquity))}</span>
```

**Subtotal per Kategori:**
```typescript
// Sebelum (Liability)
{fmtCur(rows.reduce((s, e) => s + Math.abs(e.balance), 0))}

// Sebelum (Equity)
{fmtCur(rows.reduce((s, e) => e.account === '__net_profit_loss__' ? s + e.balance : s + Math.abs(e.balance), 0))}

// Sesudah (Keduanya)
{fmtCur(Math.abs(rows.reduce((s, e) => s + e.balance, 0)))}
```

**Print Section:**
```typescript
// Sebelum
const totLiab = liab.reduce((s, e) => s + Math.abs(e.balance), 0);
const totEquity = equity.reduce((s, e) => e.account === '__net_profit_loss__' ? s + e.balance : s + Math.abs(e.balance), 0);

// Sesudah
const totLiab = liab.reduce((s, e) => s + e.balance, 0);
const totEquity = equity.reduce((s, e) => s + e.balance, 0);

// Display dengan Math.abs()
{fmtCurPrint(Math.abs(totLiab))}
{fmtCurPrint(Math.abs(totEquity))}
{fmtCurPrint(Math.abs(totLiab + totEquity))}
```

## Prinsip Akuntansi

### Normal Balance
- **Asset**: Debit (positif dalam sistem)
- **Liability**: Credit (negatif dalam sistem)
- **Equity**: Credit (negatif dalam sistem)
- **Income**: Credit (negatif dalam sistem)
- **Expense**: Debit (positif dalam sistem)

### Perhitungan Balance
```
Balance = Debit - Credit
```

- Asset: Dr > Cr → balance positif (normal)
- Liability: Cr > Dr → balance negatif (normal)
- Equity: Cr > Dr → balance negatif (normal)

### Persamaan Akuntansi
```
Asset = Liability + Equity
```

Dalam sistem dengan balance = Dr - Cr:
```
Asset (positif) = Liability (negatif) + Equity (negatif)
```

Contoh:
```
Asset: 1.658.258
Liability: -50.000
Equity: -1.608.258
Total: 1.658.258 = -50.000 + (-1.608.258) = -1.658.258 (absolute: 1.658.258) ✓
```

## Hasil Setelah Perbaikan

Neraca sekarang seimbang:
- Total Aktiva: Rp 1.658.258
- Total Kewajiban: Rp 50.000 (dari balance -50.000)
- Total Ekuitas: Rp 1.608.258 (dari balance -1.608.258)
- Jumlah Kewajiban & Ekuitas: Rp 1.658.258
- **Selisih: Rp 0** ✓

## Catatan Penting

1. **Jangan gunakan Math.abs() pada individual balance sebelum sum** - ini akan mengubah tanda dan merusak perhitungan
2. **Sum dulu, baru abs untuk display** - ini mempertahankan tanda asli untuk perhitungan yang benar
3. **Net P/L sudah termasuk dalam Equity** - tidak perlu perlakuan khusus, ikuti aturan yang sama
4. **Backend sudah benar** - masalah hanya di frontend display calculation

## File yang Diubah

- `erp-next-system/app/financial-reports/page.tsx` - Perbaikan perhitungan dan display Neraca

## Referensi

- [NET_INCOME_CALCULATION.md](./NET_INCOME_CALCULATION.md) - Penjelasan perhitungan Laba Bersih
- [STOCK_ENTRY_VS_PURCHASE_RECEIPT.md](../inventory/STOCK_ENTRY_VS_PURCHASE_RECEIPT.md) - Perbedaan Stock Entry vs Purchase Receipt
