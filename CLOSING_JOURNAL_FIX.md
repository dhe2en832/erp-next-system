# Perbaikan Jurnal Penutup Tidak Seimbang

## Masalah

Jurnal penutup (closing journal entry) tidak seimbang karena HPP Barang Dagang dan akun beban lainnya salah ditempatkan di sisi Debit, padahal seharusnya di sisi Kredit.

### Contoh Masalah:
```
Total Pendapatan: Rp 1.540.000
Total Beban: Rp 208.000
Laba Bersih: Rp 1.332.000

Jurnal Penutup (SALAH):
Debit: Penjualan                    Rp 4.500.000
Debit: HPP Barang Dagang            Rp 2.960.000  ❌ SALAH
Kredit: Beban Komisi Penjualan                    Rp 208.000
Kredit: Retained Earnings                         Rp 1.332.000
─────────────────────────────────────────────────
Total: Rp 7.460.000                 Rp 1.540.000  ❌ TIDAK SEIMBANG
```

## Penyebab

Di file `lib/accounting-period-closing.ts`, fungsi `createClosingJournalEntry` menggunakan `Math.abs(account.balance)` untuk semua akun, yang menyebabkan nilai balance selalu positif tanpa memperhatikan sisi debit/kredit yang seharusnya.

## Solusi

Menggunakan nilai `account.balance` langsung (tanpa `Math.abs()`) karena:
- Untuk akun **Income**: `balance = credit - debit` (sudah positif)
- Untuk akun **Expense**: `balance = debit - credit` (sudah positif)

### Jurnal Penutup (BENAR):
```
Debit: Penjualan                    Rp 4.500.000
Kredit: HPP Barang Dagang                         Rp 2.960.000  ✓ BENAR
Kredit: Beban Komisi Penjualan                    Rp 208.000
Kredit: Retained Earnings                         Rp 1.332.000
─────────────────────────────────────────────────
Total: Rp 4.500.000                 Rp 4.500.000  ✓ SEIMBANG
```

## Perubahan Kode

**File**: `erp-next-system/lib/accounting-period-closing.ts`

**Sebelum**:
```typescript
// Close income accounts (debit income to zero it out)
for (const account of nominalAccounts) {
  if (account.root_type === 'Income' && Math.abs(account.balance) > 0.01) {
    journalAccounts.push({
      account: account.account,
      debit_in_account_currency: Math.abs(account.balance), // ❌ SALAH
      credit_in_account_currency: 0,
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`
    });
  }
}

// Close expense accounts (credit expense to zero it out)
for (const account of nominalAccounts) {
  if (account.root_type === 'Expense' && Math.abs(account.balance) > 0.01) {
    journalAccounts.push({
      account: account.account,
      debit_in_account_currency: 0,
      credit_in_account_currency: Math.abs(account.balance), // ❌ SALAH
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`
    });
  }
}
```

**Sesudah**:
```typescript
// Close income accounts (debit income to zero it out)
for (const account of nominalAccounts) {
  if (account.root_type === 'Income' && Math.abs(account.balance) > 0.01) {
    journalAccounts.push({
      account: account.account,
      debit_in_account_currency: account.balance, // ✓ BENAR
      credit_in_account_currency: 0,
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`
    });
  }
}

// Close expense accounts (credit expense to zero it out)
for (const account of nominalAccounts) {
  if (account.root_type === 'Expense' && Math.abs(account.balance) > 0.01) {
    journalAccounts.push({
      account: account.account,
      debit_in_account_currency: 0,
      credit_in_account_currency: account.balance, // ✓ BENAR
      user_remark: `Closing ${account.account_name} for period ${period.period_name}`
    });
  }
}
```

## Verifikasi

Setelah perbaikan, jurnal penutup akan seimbang:
- Total Debit = Total Kredit
- Akun pendapatan di-debit untuk menutup saldo kredit
- Akun beban di-kredit untuk menutup saldo debit
- Selisih (laba/rugi) masuk ke Retained Earnings

## Tanggal Perbaikan

2024-01-XX (sesuaikan dengan tanggal aktual)
