'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import BrowserStyleDatePicker from '../../../components/BrowserStyleDatePicker';


interface Employee {
  name?: string;
  first_name?: string;
  employee_name: string;
  company?: string;
  department?: string;
  designation?: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  cell_number?: string;
  personal_email?: string;
  status?: string;
}

export default function EmployeeMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editName = searchParams.get('name');
  const isEdit = !!editName;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getTodayDDMMYYYY = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState<Employee>({
    first_name: '',
    employee_name: '',
    company: '',
    department: '',
    designation: '',
    gender: 'Male',
    date_of_birth: '',
    date_of_joining: getTodayDDMMYYYY(),
    cell_number: '',
    personal_email: '',
    status: 'Active',
  });

  // set default company if available from local storage or query (best effort)
  useEffect(() => {
    if (!formData.company) {
      const fromQuery = searchParams.get('company');
      const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('selectedCompany') : null;
      const company = fromQuery || fromStorage || '';
      if (company) {
        setFormData(prev => ({ ...prev, company }));
      }
    }
  }, [formData.company, searchParams]);

  const toIsoDate = (value?: string) => {
    if (!value) return undefined;
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return value; // assume already ISO
  };

  const toDisplayDate = (value?: string) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return value;
  };

  // Fetch employee data if editing
  const fetchEmployee = useCallback(async () => {
    if (!editName) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/employees?name=${encodeURIComponent(editName)}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const emp = data.data.find((e: Employee) => e.name === editName);
        if (emp) {
          setFormData({
            ...emp,
            first_name: emp.first_name || emp.employee_name,
            employee_name: emp.employee_name || emp.first_name || '',
            date_of_birth: toDisplayDate(emp.date_of_birth),
            date_of_joining: toDisplayDate(emp.date_of_joining) || getTodayDDMMYYYY(),
            company: emp.company || formData.company || '',
          });
        }
      } else {
        setError('Employee tidak ditemukan');
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Gagal memuat data employee');
    } finally {
      setLoading(false);
    }
  }, [editName]);

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
  }, [isEdit, fetchEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = '/api/hr/employees';
      const method = isEdit ? 'PUT' : 'POST';
      // Remove optional link fields if user leaves them blank to avoid ERPNext link validation
      const payload = { ...formData } as Record<string, unknown>;
      // Ensure mandatory fields mapped
      payload.first_name = payload.first_name || payload.employee_name;
      payload.employee_name = payload.employee_name || payload.first_name;
      // Convert dates to ISO (ERPNext expects YYYY-MM-DD)
      if (payload.date_of_birth) payload.date_of_birth = toIsoDate(String(payload.date_of_birth));
      if (payload.date_of_joining) payload.date_of_joining = toIsoDate(String(payload.date_of_joining));
      if (!payload.company) delete payload.company;
      if (!payload.department) delete payload.department;
      if (!payload.designation) delete payload.designation;
      if (!payload.cell_number) delete payload.cell_number;
      if (!payload.personal_email) delete payload.personal_email;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { name: editName, ...payload } : payload),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const successMsg = isEdit ? 'Employee berhasil diperbarui!' : 'Employee berhasil dibuat!';
        setSuccess(successMsg);
        // show alert confirmation then redirect
        window.alert(successMsg);
        router.push('/employees');
        if (!isEdit) {
          // Reset form after successful creation
          setFormData({
            first_name: '',
            employee_name: '',
            company: formData.company || '',
            department: '',
            designation: '',
            gender: 'Male',
            date_of_birth: '',
            date_of_joining: getTodayDDMMYYYY(),
            cell_number: '',
            personal_email: '',
            status: 'Active',
          });
        }
      } else {
        // Surface clearer message for link validation errors (e.g., department/designation not found)
        const message = data.message || data.exc || 'Gagal menyimpan employee';
        setError(message);
      }
    } catch (err) {
      console.error('Error saving employee:', err);
      setError('Terjadi kesalahan saat menyimpan employee');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'first_name') {
        return { ...prev, first_name: value, employee_name: value };
      }
      if (name === 'employee_name') {
        return { ...prev, employee_name: value };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleDateChange = (name: 'date_of_birth' | 'date_of_joining', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data employee..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Employee' : 'Tambah Employee'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Perbarui data employee' : 'Buat data employee baru untuk sales person'}
          </p>
        </div>
        <button
          onClick={() => router.push('/employees')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          ← Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        {saving && (
          <div className="mb-4">
            <LoadingSpinner message={isEdit ? 'Menyimpan perubahan...' : 'Menyimpan employee...'} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name (mandatory) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan first name"
            />
          </div>

          {/* Tanggal Lahir (mandatory) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir <span className="text-red-500">*</span></label>
            <BrowserStyleDatePicker
              value={formData.date_of_birth || ''}
              onChange={(value: string) => handleDateChange('date_of_birth', value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Tanggal Bergabung (mandatory, default today) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung <span className="text-red-500">*</span></label>
            <BrowserStyleDatePicker
              value={formData.date_of_joining || ''}
              onChange={(value: string) => handleDateChange('date_of_joining', value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Hidden employee_name synced from first_name */}
          <input type="hidden" name="employee_name" value={formData.employee_name} />

          {/* Company kept hidden (auto from selected company) */}
          <input type="hidden" name="company" value={formData.company || ''} />

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Contoh: Sales, Marketing"
            />
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Contoh: Sales Executive"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
            </select>
          </div>

          {/* Cell Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
            <input
              type="text"
              name="cell_number"
              value={formData.cell_number}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Contoh: 08123456789"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="personal_email"
              value={formData.personal_email}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="email@example.com"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Active">Aktif</option>
              <option value="Inactive">Non-Aktif</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/employees')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
