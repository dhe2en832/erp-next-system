'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Employee {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
}

interface SalesPersonFormData {
  employee: string;
  sales_person_name: string;
  parent_sales_person: string;
  is_group: number;
  commission_rate: number;
  enabled: number;
}

export default function SalesPersonMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spName = searchParams.get('name');

  const [loading, setLoading] = useState(!!spName);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<SalesPersonFormData>({
    employee: '',
    sales_person_name: '',
    parent_sales_person: 'Tim Penjualan',
    is_group: 0,
    commission_rate: 0,
    enabled: 1,
  });
  
  // Employee list for dropdown
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [existingSalesPersonEmployees, setExistingSalesPersonEmployees] = useState<string[]>([]);
  const [existingSalesPersonNames, setExistingSalesPersonNames] = useState<string[]>([]);

  useEffect(() => {
    if (spName) {
      setIsEditMode(true);
      fetchSalesPersonDetail(spName);
    }
  }, [spName]);

  const fetchSalesPersonDetail = async (name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/sales-persons/detail?name=${encodeURIComponent(name)}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.data) {
        const sp = data.data;
        setFormData({
          employee: sp.employee || '',
          sales_person_name: sp.sales_person_name || sp.name || '',
          parent_sales_person: sp.parent_sales_person || 'Sales Team',
          is_group: sp.is_group || 0,
          commission_rate: sp.commission_rate || sp.custom_default_commission_rate || 0,
          enabled: sp.enabled !== undefined ? sp.enabled : 1,
        });
      } else {
        setError('Gagal memuat detail sales person');
      }
    } catch (err) {
      console.error('Error fetching sales person detail:', err);
      setError('Gagal memuat detail sales person');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees on mount (for dropdown)
  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/hr/employees?status=Active`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Fetch existing sales persons to filter employees
  const fetchSalesPersons = useCallback(async () => {
    try {
      const response = await fetch('/api/sales/sales-persons', { credentials: 'include' });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const list = data.data as Array<{ employee?: string; full_name?: string }>;
        const employeeIds = list.map(sp => sp.employee).filter(Boolean) as string[];
        const names = list.map(sp => sp.full_name).filter(Boolean) as string[];
        setExistingSalesPersonEmployees(employeeIds);
        setExistingSalesPersonNames(names);
      }
    } catch (err) {
      console.error('Error fetching sales persons:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchSalesPersons();
  }, [fetchEmployees, fetchSalesPersons]);

  const availableEmployees = useMemo(() => {
    if (isEditMode && formData.employee) {
      return employees;
    }
    if (!existingSalesPersonEmployees.length && !existingSalesPersonNames.length) return employees;
    return employees.filter(emp => {
      const usedByEmployeeId = existingSalesPersonEmployees.includes(emp.name);
      const usedByName = existingSalesPersonNames.includes(emp.employee_name);
      return !usedByEmployeeId && !usedByName;
    });
  }, [employees, existingSalesPersonEmployees, existingSalesPersonNames, isEditMode, formData.employee]);

  // Handle employee selection
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = e.target.value;
    const selectedEmployee = employees.find(emp => emp.name === employeeId);
    
    setFormData(prev => ({
      ...prev,
      employee: employeeId,
      sales_person_name: selectedEmployee ? selectedEmployee.employee_name : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const url = isEditMode
        ? `/api/sales/sales-persons/detail?name=${encodeURIComponent(spName!)}`
        : '/api/sales/sales-persons';

      const payload = { ...formData } as Record<string, unknown>;
      payload.parent_sales_person = payload.parent_sales_person || 'Tim Penjualan';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(isEditMode ? 'Sales person berhasil diperbarui!' : 'Sales person berhasil ditambahkan!');
        setTimeout(() => router.push('/sales-persons'), 1500);
      } else {
        setError(data.message || 'Gagal menyimpan sales person');
      }
    } catch (err) {
      console.error('Error saving sales person:', err);
      setError('Gagal menyimpan sales person');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data sales person..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Sales Person' : 'Tambah Sales Person Baru'}
          </h1>
          {isEditMode && <p className="text-sm text-gray-500">{spName}</p>}
        </div>
        <button
          onClick={() => router.push('/sales-persons')}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Selection - Only show when creating */}
          {!isEditMode && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Employee <span className="text-red-500">*</span>
              </label>
              {loadingEmployees ? (
                <div className="text-sm text-gray-500">Memuat data employee...</div>
              ) : availableEmployees.length === 0 ? (
                <div className="text-sm text-red-500">
                  Tidak ada employee tersedia. <a href="/employees/empMain" className="text-indigo-600 underline">Buat employee terlebih dahulu</a>
                </div>
              ) : (
                <select
                  value={formData.employee}
                  onChange={handleEmployeeChange}
                  required={!isEditMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">-- Pilih Employee --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.employee_name} {emp.designation ? `- ${emp.designation}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Sales person harus dipilih dari data employee yang sudah ada.
              </p>
            </div>
          )}

          {/* Sales Person Name - Auto-filled from employee, or editable in edit mode */}
          <div className={isEditMode ? '' : 'md:col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Sales Person {isEditMode && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required
              value={formData.sales_person_name}
              onChange={(e) => setFormData({ ...formData, sales_person_name: e.target.value })}
              readOnly={!isEditMode}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${
                !isEditMode ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              placeholder={isEditMode ? "Masukkan nama sales person" : "Otomatis dari data employee"}
            />
            {!isEditMode && (
              <p className="mt-1 text-xs text-gray-500">
                Nama otomatis terisi dari data employee yang dipilih
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Induk Sales Person</label>
            <input
              type="text"
              value={formData.parent_sales_person}
              onChange={(e) => setFormData({ ...formData, parent_sales_person: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Komisi (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Contoh: 5"
            />
          </div>

          <div className="flex items-center space-x-6 pt-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_group === 1}
                onChange={(e) => setFormData({ ...formData, is_group: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Grup</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enabled === 1}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Aktif</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/sales-persons')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading || (!isEditMode && employees.length === 0)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {formLoading ? 'Menyimpan...' : (isEditMode ? 'Perbarui' : 'Simpan')}
          </button>
        </div>
      </form>
    </div>
  );
}
