'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import type { CreatePeriodRequest } from '../../../types/accounting-period';

// Zod schema for client-side validation
const createPeriodSchema = z.object({
  period_name: z.string().min(1, 'Nama periode wajib diisi'),
  company: z.string().min(1, 'Perusahaan wajib dipilih'),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal akhir wajib diisi'),
  period_type: z.enum(['Monthly', 'Quarterly', 'Yearly'], {
    errorMap: () => ({ message: 'Tipe periode tidak valid' })
  }),
  fiscal_year: z.string().optional(),
  remarks: z.string().optional()
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start < end;
}, {
  message: 'Tanggal mulai harus lebih kecil dari tanggal akhir',
  path: ['end_date']
});

interface CreatePeriodFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreatePeriodForm({ onSuccess, onCancel }: CreatePeriodFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState<CreatePeriodRequest>({
    period_name: '',
    company: '',
    start_date: '',
    end_date: '',
    period_type: 'Monthly',
    fiscal_year: '',
    remarks: ''
  });

  // Fetch companies for dropdown
  const [companies, setCompanies] = useState<Array<{ name: string }>>([]);
  const [fiscalYears, setFiscalYears] = useState<Array<{ name: string }>>([]);

  useEffect(() => {
    fetchCompanies();
    fetchFiscalYears();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/setup/companies', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data || []);
        // Set default company if only one exists
        if (data.data?.length === 1) {
          setFormData(prev => ({ ...prev, company: data.data[0].name }));
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchFiscalYears = async () => {
    try {
      const response = await fetch('/api/setup/fiscal-years', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setFiscalYears(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching fiscal years:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    // Client-side validation with Zod
    try {
      createPeriodSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/accounting-period/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/accounting-period/${encodeURIComponent(data.data.name)}`);
        }
      } else {
        setError(data.message || 'Gagal membuat periode');
        // Handle server-side validation errors
        if (data.details && typeof data.details === 'object') {
          setValidationErrors(data.details);
        }
      }
    } catch (err) {
      console.error('Error creating period:', err);
      setError('Gagal membuat periode. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Period Name */}
      <div>
        <label htmlFor="period_name" className="block text-sm font-medium text-gray-700 mb-1">
          Nama Periode <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="period_name"
          name="period_name"
          value={formData.period_name}
          onChange={handleChange}
          className={`block w-full border ${validationErrors.period_name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          placeholder="Contoh: Januari 2024"
        />
        {validationErrors.period_name && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.period_name}</p>
        )}
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
          Perusahaan <span className="text-red-500">*</span>
        </label>
        <select
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className={`block w-full border ${validationErrors.company ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        >
          <option value="">Pilih Perusahaan</option>
          {companies.map(company => (
            <option key={company.name} value={company.name}>{company.name}</option>
          ))}
        </select>
        {validationErrors.company && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.company}</p>
        )}
      </div>

      {/* Period Type */}
      <div>
        <label htmlFor="period_type" className="block text-sm font-medium text-gray-700 mb-1">
          Tipe Periode <span className="text-red-500">*</span>
        </label>
        <select
          id="period_type"
          name="period_type"
          value={formData.period_type}
          onChange={handleChange}
          className={`block w-full border ${validationErrors.period_type ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        >
          <option value="Monthly">Bulanan</option>
          <option value="Quarterly">Kuartalan</option>
          <option value="Yearly">Tahunan</option>
        </select>
        {validationErrors.period_type && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.period_type}</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Mulai <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className={`block w-full border ${validationErrors.start_date ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {validationErrors.start_date && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.start_date}</p>
          )}
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Akhir <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className={`block w-full border ${validationErrors.end_date ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {validationErrors.end_date && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.end_date}</p>
          )}
        </div>
      </div>

      {/* Fiscal Year */}
      <div>
        <label htmlFor="fiscal_year" className="block text-sm font-medium text-gray-700 mb-1">
          Tahun Fiskal
        </label>
        <select
          id="fiscal_year"
          name="fiscal_year"
          value={formData.fiscal_year}
          onChange={handleChange}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Pilih Tahun Fiskal (Opsional)</option>
          {fiscalYears.map(fy => (
            <option key={fy.name} value={fy.name}>{fy.name}</option>
          ))}
        </select>
      </div>

      {/* Remarks */}
      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
          Catatan
        </label>
        <textarea
          id="remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          rows={3}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Catatan tambahan (opsional)"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Buat Periode'}
        </button>
      </div>
    </form>
  );
}
