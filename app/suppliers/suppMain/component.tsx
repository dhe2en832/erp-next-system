'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface SupplierFormData {
  supplier_name: string;
  supplier_type: string;
  supplier_group: string;
  country: string;
  city: string;
  tax_id: string;
  mobile_no: string;
  email_id: string;
  default_currency: string;
  supplier_primary_address: string;
}

export default function SupplierMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierName = searchParams.get('name');

  const [loading, setLoading] = useState(!!supplierName);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [supplierGroups, setSupplierGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');

  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: '',
    supplier_type: 'Company',
    supplier_group: '',
    country: 'Indonesia',
    city: '',
    tax_id: '',
    mobile_no: '',
    email_id: '',
    default_currency: 'IDR',
    supplier_primary_address: '',
  });

  useEffect(() => {
    if (supplierName) {
      setIsEditMode(true);
      fetchSupplierDetail(supplierName);
    }
  }, [supplierName]);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError('');
      try {
        const res = await fetch('/api/purchase/supplier-groups', { credentials: 'include' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSupplierGroups(data.data);
          // set default group when creating (first option) if not set
          if (!supplierName && !formData.supplier_group && data.data.length > 0) {
            setFormData(prev => ({ ...prev, supplier_group: data.data[0] }));
          }
        } else {
          setGroupsError(data.message || 'Gagal memuat grup pemasok');
        }
      } catch (err) {
        console.error('Error fetching supplier groups:', err);
        setGroupsError('Gagal memuat grup pemasok');
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSupplierDetail = async (name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/purchase/suppliers/${encodeURIComponent(name)}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.data) {
        const s = data.data;
        let city = s.city || '';
        let addressLine = '';

        // If supplier has primary address, fetch detail to show address and city
        if (s.supplier_primary_address) {
          try {
            const addrResp = await fetch(`/api/purchase/addresses/${encodeURIComponent(s.supplier_primary_address)}`, { credentials: 'include' });
            const addrData = await addrResp.json();
            if (addrResp.ok && addrData.success && addrData.data) {
              city = addrData.data.city || city;
              addressLine = addrData.data.address_line1 || '';
            }
          } catch (err) {
            console.error('Error fetching address detail:', err);
          }
        }

        setFormData({
          supplier_name: s.supplier_name || '',
          supplier_type: s.supplier_type || 'Company',
          supplier_group: s.supplier_group || 'All Supplier Groups',
          country: s.country || 'Indonesia',
          city: city,
          tax_id: s.tax_id || '',
          mobile_no: s.mobile_no || '',
          email_id: s.email_id || '',
          default_currency: s.default_currency || 'IDR',
          supplier_primary_address: addressLine || s.supplier_primary_address || '',
        });
      } else {
        setError('Gagal memuat detail pemasok');
      }
    } catch (err) {
      console.error('Error fetching supplier detail:', err);
      setError('Gagal memuat detail pemasok');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const baseUrl = '/api/purchase/suppliers';

      // Prepare payload without address first
      const payload = { ...formData } as Record<string, unknown>;
      if (!payload.supplier_group) delete payload.supplier_group;
      if (!payload.tax_id) delete payload.tax_id;
      if (!payload.mobile_no) delete payload.mobile_no;
      if (!payload.email_id) delete payload.email_id;
      delete payload.supplier_primary_address;

      let supplierId = supplierName || '';

      // Step 1: create or update supplier without address
      if (isEditMode) {
        const resp = await fetch(`${baseUrl}/${encodeURIComponent(supplierName!)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          setError(data.message || 'Gagal menyimpan pemasok');
          setFormLoading(false);
          return;
        }
        supplierId = supplierName!;
      } else {
        const resp = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success || !data.data?.name) {
          const msg = data.message || data.exc || 'Gagal menambah pemasok';
          if (msg.toLowerCase().includes('duplicate entry')) {
            setError('Nama pemasok sudah ada. Gunakan nama berbeda atau edit pemasok yang sudah ada.');
          } else {
            setError(msg);
          }
          setFormLoading(false);
          return;
        }
        supplierId = data.data.name;
      }

      // Step 2: if address provided, create Address linked to supplier
      let addressName = '';
      if (formData.supplier_primary_address && formData.supplier_primary_address.trim()) {
        if (!formData.city.trim()) {
          setError('Kota wajib diisi jika alamat diisi');
          setFormLoading(false);
          return;
        }
        const addressRes = await fetch('/api/purchase/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            supplier_name: supplierId,
            address: formData.supplier_primary_address,
            country: formData.country || 'Indonesia',
            city: formData.city,
          }),
        });
        const addressData = await addressRes.json();
        if (!addressRes.ok || !addressData.success || !addressData.data?.name) {
          setError(addressData.message || 'Gagal membuat alamat pemasok');
          setFormLoading(false);
          return;
        }
        addressName = addressData.data.name;
      }

      // Step 3: if address created, update supplier with supplier_primary_address
      if (addressName) {
        const updatePayload = { supplier_primary_address: addressName };
        const updateResp = await fetch(`${baseUrl}/${encodeURIComponent(supplierId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        });
        const updateData = await updateResp.json();
        if (!updateResp.ok || !updateData.success) {
          setError(updateData.message || 'Gagal mengaitkan alamat ke pemasok');
          setFormLoading(false);
          return;
        }
      }

      setSuccessMessage(isEditMode ? 'Pemasok berhasil diperbarui!' : 'Pemasok berhasil ditambahkan!');
      setTimeout(() => router.push('/suppliers'), 1500);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Gagal menyimpan pemasok');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data pemasok..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Pemasok' : 'Tambah Pemasok Baru'}
          </h1>
          {isEditMode && <p className="text-sm text-gray-500">{supplierName}</p>}
        </div>
        <button
          onClick={() => router.push('/suppliers')}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemasok *</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan nama pemasok"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pemasok</label>
            <select
              value={formData.supplier_type}
              onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Company">Perusahaan</option>
              <option value="Individual">Perorangan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Pemasok</label>
            {groupsLoading ? (
              <div className="text-sm text-gray-500">Memuat grup pemasok...</div>
            ) : groupsError ? (
              <div className="text-sm text-red-500">{groupsError}</div>
            ) : (
              <select
                required
                value={formData.supplier_group}
                onChange={(e) => setFormData({ ...formData, supplier_group: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Pilih Grup --</option>
                {supplierGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">Pilih grup pemasok yang sudah ada di ERPNext.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Negara</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kota {formData.supplier_primary_address ? <span className="text-red-500">*</span> : null}</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required={!!formData.supplier_primary_address}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan kota (wajib jika alamat diisi)"
            />
            {formData.supplier_primary_address ? (
              <p className="mt-1 text-xs text-gray-500">Wajib isi kota jika alamat diisi.</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NPWP / Tax ID</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan NPWP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <input
              type="text"
              value={formData.mobile_no}
              onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan nomor telepon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email_id}
              onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
            <input
              type="text"
              value={formData.default_currency}
              onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              rows={3}
              value={formData.supplier_primary_address}
              onChange={(e) => setFormData({ ...formData, supplier_primary_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan alamat pemasok"
            />
            <p className="mt-1 text-xs text-gray-500">Alamat akan dibuat sebagai dokumen Address baru dan di-link otomatis ke Supplier.</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/suppliers')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {formLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {formLoading ? 'Menyimpan...' : (isEditMode ? 'Perbarui' : 'Simpan')}
          </button>
        </div>
      </form>
    </div>
  );
}
