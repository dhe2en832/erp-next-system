# Loading States - Integration Examples

Contoh integrasi loading states dalam fitur Accounting Period Closing.

## 1. Period List dengan Skeleton

```tsx
'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '@/components/SkeletonLoader';

export default function PeriodList() {
  const [periods, setPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPeriods() {
      try {
        const response = await fetch('/api/accounting-period/periods');
        const data = await response.json();
        setPeriods(data.data);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPeriods();
  }, []);

  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />;
  }

  return (
    <table className="min-w-full">
      {/* Table content */}
    </table>
  );
}
```

## 2. Period Detail dengan Multiple Loading States

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useMultipleLoading } from '@/lib/use-loading';
import { useToast } from '@/lib/toast-context';
import LoadingButton from '@/components/LoadingButton';
import { SkeletonPeriodDetail } from '@/components/SkeletonLoader';

export default function PeriodDetail({ periodName }: { periodName: string }) {
  const [period, setPeriod] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { isLoading, withLoading } = useMultipleLoading();
  const { success, error } = useToast();

  useEffect(() => {
    async function fetchPeriod() {
      try {
        const response = await fetch(`/api/accounting-period/periods/${periodName}`);
        const data = await response.json();
        setPeriod(data.data);
      } finally {
        setIsInitialLoading(false);
      }
    }
    fetchPeriod();
  }, [periodName]);

  const handleClose = async () => {
    try {
      await withLoading('close', async () => {
        const response = await fetch('/api/accounting-period/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period_name: periodName }),
        });
        
        if (!response.ok) throw new Error('Failed to close period');
        
        const data = await response.json();
        setPeriod(data.data.period);
      });
      
      success('Periode berhasil ditutup');
    } catch (err) {
      error('Gagal menutup periode', err.message);
    }
  };

  const handleReopen = async () => {
    try {
      await withLoading('reopen', async () => {
        const response = await fetch('/api/accounting-period/reopen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            period_name: periodName,
            reason: 'Koreksi data diperlukan'
          }),
        });
        
        if (!response.ok) throw new Error('Failed to reopen period');
        
        const data = await response.json();
        setPeriod(data.data);
      });
      
      success('Periode berhasil dibuka kembali');
    } catch (err) {
      error('Gagal membuka periode', err.message);
    }
  };

  if (isInitialLoading) {
    return <SkeletonPeriodDetail />;
  }

  return (
    <div>
      <h1>{period.period_name}</h1>
      <p>Status: {period.status}</p>
      
      <div className="flex space-x-3 mt-4">
        {period.status === 'Open' && (
          <LoadingButton
            loading={isLoading('close')}
            loadingText="Menutup..."
            variant="primary"
            onClick={handleClose}
          >
            Tutup Periode
          </LoadingButton>
        )}
        
        {period.status === 'Closed' && (
          <LoadingButton
            loading={isLoading('reopen')}
            loadingText="Membuka..."
            variant="secondary"
            onClick={handleReopen}
          >
            Buka Kembali
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
```

## 3. Closing Wizard dengan Loading Overlay

```tsx
'use client';

import { useState } from 'react';
import { useLoading } from '@/lib/use-loading';
import { useToast } from '@/lib/toast-context';
import LoadingButton from '@/components/LoadingButton';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function ClosingWizard({ periodName }: { periodName: string }) {
  const [step, setStep] = useState(1);
  const [validations, setValidations] = useState([]);
  const { isLoading, withLoading } = useLoading();
  const { success, error } = useToast();

  const runValidations = async () => {
    try {
      await withLoading(async () => {
        const response = await fetch('/api/accounting-period/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period_name: periodName }),
        });
        
        const data = await response.json();
        setValidations(data.validations);
        setStep(2);
      });
    } catch (err) {
      error('Gagal menjalankan validasi', err.message);
    }
  };

  const executeClosing = async () => {
    try {
      await withLoading(async () => {
        const response = await fetch('/api/accounting-period/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period_name: periodName }),
        });
        
        if (!response.ok) throw new Error('Failed to close period');
        
        success('Periode berhasil ditutup');
        setStep(4);
      });
    } catch (err) {
      error('Gagal menutup periode', err.message);
    }
  };

  return (
    <div className="relative min-h-[400px]">
      <LoadingOverlay 
        isLoading={isLoading} 
        message={
          step === 1 ? "Menjalankan validasi..." :
          step === 3 ? "Menutup periode dan membuat jurnal penutup..." :
          "Memproses..."
        }
      />
      
      {step === 1 && (
        <div>
          <h2>Step 1: Validasi</h2>
          <p>Klik tombol di bawah untuk memulai validasi</p>
          <LoadingButton
            loading={isLoading}
            loadingText="Memvalidasi..."
            onClick={runValidations}
          >
            Jalankan Validasi
          </LoadingButton>
        </div>
      )}
      
      {step === 2 && (
        <div>
          <h2>Step 2: Review Hasil Validasi</h2>
          {/* Display validations */}
          <LoadingButton onClick={() => setStep(3)}>
            Lanjutkan
          </LoadingButton>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <h2>Step 3: Konfirmasi Penutupan</h2>
          <LoadingButton
            loading={isLoading}
            loadingText="Menutup..."
            variant="primary"
            onClick={executeClosing}
          >
            Tutup Periode
          </LoadingButton>
        </div>
      )}
      
      {step === 4 && (
        <div>
          <h2>Selesai!</h2>
          <p>Periode berhasil ditutup</p>
        </div>
      )}
    </div>
  );
}
```

## 4. Form dengan Disabled State

```tsx
'use client';

import { useState } from 'react';
import { useLoading } from '@/lib/use-loading';
import { useToast } from '@/lib/toast-context';
import LoadingButton from '@/components/LoadingButton';

export default function CreatePeriodForm() {
  const [formData, setFormData] = useState({
    period_name: '',
    start_date: '',
    end_date: '',
    period_type: 'Monthly',
  });
  
  const { isLoading, withLoading } = useLoading();
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await withLoading(async () => {
        const response = await fetch('/api/accounting-period/periods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) throw new Error('Failed to create period');
        
        success('Periode berhasil dibuat');
        
        // Reset form
        setFormData({
          period_name: '',
          start_date: '',
          end_date: '',
          period_type: 'Monthly',
        });
      });
    } catch (err) {
      error('Gagal membuat periode', err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Nama Periode
        </label>
        <input
          type="text"
          value={formData.period_name}
          onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
          disabled={isLoading}
          className="w-full border rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Tanggal Mulai
        </label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          disabled={isLoading}
          className="w-full border rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Tanggal Akhir
        </label>
        <input
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          disabled={isLoading}
          className="w-full border rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Tipe Periode
        </label>
        <select
          value={formData.period_type}
          onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
          disabled={isLoading}
          className="w-full border rounded px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="Monthly">Bulanan</option>
          <option value="Quarterly">Kuartalan</option>
          <option value="Yearly">Tahunan</option>
        </select>
      </div>
      
      <LoadingButton
        type="submit"
        loading={isLoading}
        loadingText="Menyimpan..."
        variant="primary"
        className="w-full"
      >
        Buat Periode
      </LoadingButton>
    </form>
  );
}
```

## 5. Dashboard dengan Multiple Skeletons

```tsx
'use client';

import { useState, useEffect } from 'react';
import { SkeletonPeriodDashboard } from '@/components/SkeletonLoader';

export default function PeriodDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/accounting-period/dashboard');
        const result = await response.json();
        setData(result.data);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <SkeletonPeriodDashboard />;
  }

  return (
    <div>
      <h1>Dashboard Periode Akuntansi</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Periode Terbuka</p>
          <p className="text-2xl font-bold">{data.open_periods}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Periode Tertutup</p>
          <p className="text-2xl font-bold">{data.closed_periods}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Perlu Perhatian</p>
          <p className="text-2xl font-bold">{data.needs_attention}</p>
        </div>
      </div>
      
      {/* Period list */}
      <table className="min-w-full">
        {/* Table content */}
      </table>
    </div>
  );
}
```

## 6. Inline Loading untuk Actions

```tsx
'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PeriodRow({ period }: { period: any }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus periode ini?')) return;
    
    setIsDeleting(true);
    try {
      await fetch(`/api/accounting-period/periods/${period.name}`, {
        method: 'DELETE',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr>
      <td>{period.period_name}</td>
      <td>{period.start_date}</td>
      <td>{period.end_date}</td>
      <td>{period.status}</td>
      <td>
        {isDeleting ? (
          <div className="flex items-center">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-gray-600">Menghapus...</span>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800"
          >
            Hapus
          </button>
        )}
      </td>
    </tr>
  );
}
```

## Tips Implementasi

1. **Gunakan Skeleton untuk Initial Load**: Lebih baik daripada spinner karena menunjukkan struktur konten
2. **Disable Form Elements**: Selalu disable input/select/button saat processing
3. **Provide Specific Messages**: Berikan pesan loading yang spesifik untuk setiap operasi
4. **Combine with Toast**: Gunakan toast untuk feedback setelah operasi selesai
5. **Handle Errors**: Selalu handle errors dan tampilkan pesan yang jelas
6. **Use withLoading Helper**: Untuk automatic loading state management
7. **Multiple Loading States**: Gunakan `useMultipleLoading` untuk track multiple operations
