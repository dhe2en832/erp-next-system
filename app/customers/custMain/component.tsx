'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import SalesPersonDialog from '../../components/SalesPersonDialog';

interface CustomerFormData {
  customer_name: string;
  customer_type: string;
  customer_group: string;
  territory: string;
  tax_id: string;
  mobile_no: string;
  email_id: string;
  default_currency: string;
  default_price_list: string;
  customer_primary_address: string;
  country: string;
  city: string;
  sales_person: string;
}

export default function CustomerMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerName = searchParams.get('name');

  const [loading, setLoading] = useState(!!customerName);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [customerGroups, setCustomerGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');

  const [territories, setTerritories] = useState<string[]>([]);
  const [territoryLoading, setTerritoryLoading] = useState(false);
  const [territoryError, setTerritoryError] = useState('');

  const [priceLists, setPriceLists] = useState<string[]>([]);
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [priceListError, setPriceListError] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    customer_name: '',
    customer_type: 'Company',
    customer_group: '',
    territory: '',
    tax_id: '',
    mobile_no: '',
    email_id: '',
    default_currency: 'IDR',
    default_price_list: '',
    customer_primary_address: '',
    country: 'Indonesia',
    city: '',
    sales_person: '',
  });
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);

  useEffect(() => {
    if (customerName) {
      setIsEditMode(true);
      fetchCustomerDetail(customerName);
    }
  }, [customerName]);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError('');
      try {
        const res = await fetch('/api/sales/customer-groups', { credentials: 'include' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCustomerGroups(data.data);
          if (!customerName && !formData.customer_group && data.data.length > 0) {
            setFormData((prev) => ({ ...prev, customer_group: data.data[0] }));
          }
        } else {
          setGroupsError(data.message || 'Gagal memuat grup pelanggan');
        }
      } catch (err) {
        console.error('Error fetching customer groups:', err);
        setGroupsError('Gagal memuat grup pelanggan');
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchTerritories = async () => {
      setTerritoryLoading(true);
      setTerritoryError('');
      try {
        const res = await fetch('/api/sales/territories', { credentials: 'include' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setTerritories(data.data);
          if (!customerName && !formData.territory && data.data.length > 0) {
            setFormData((prev) => ({ ...prev, territory: data.data[0] }));
          }
        } else {
          setTerritoryError(data.message || 'Gagal memuat wilayah');
        }
      } catch (err) {
        console.error('Error fetching territories:', err);
        setTerritoryError('Gagal memuat wilayah');
      } finally {
        setTerritoryLoading(false);
      }
    };

    fetchTerritories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchPriceLists = async () => {
      setPriceListLoading(true);
      setPriceListError('');
      try {
        const res = await fetch('/api/sales/price-lists', { credentials: 'include' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setPriceLists(data.data);
          if (!customerName && !formData.default_price_list && data.data.length > 0) {
            setFormData((prev) => ({ ...prev, default_price_list: data.data[0] }));
          }
        } else {
          setPriceListError(data.message || 'Gagal memuat daftar harga');
        }
      } catch (err) {
        console.error('Error fetching price lists:', err);
        setPriceListError('Gagal memuat daftar harga');
      } finally {
        setPriceListLoading(false);
      }
    };

    fetchPriceLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomerDetail = async (name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/customers/${encodeURIComponent(name)}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success && data.data) {
        const c = data.data;
        let city = c.city || '';
        let addressLine = '';

        if (c.customer_primary_address) {
          try {
            const addrResp = await fetch(`/api/purchase/addresses/${encodeURIComponent(c.customer_primary_address)}`, { credentials: 'include' });
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
          customer_name: c.customer_name || '',
          customer_type: c.customer_type || 'Company',
          customer_group: c.customer_group || '',
          territory: c.territory || '',
          tax_id: c.tax_id || '',
          mobile_no: c.mobile_no || '',
          email_id: c.email_id || '',
          default_currency: c.default_currency || 'IDR',
          default_price_list: c.default_price_list || '',
          customer_primary_address: addressLine || '',
          country: c.country || 'Indonesia',
          city: city,
          sales_person: c.sales_team?.[0]?.sales_person || '',
        });
      } else {
        setError('Gagal memuat detail pelanggan');
      }
    } catch (err) {
      console.error('Error fetching customer detail:', err);
      setError('Gagal memuat detail pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const baseUrl = '/api/sales/customers';

      const payload = { ...formData } as Record<string, unknown>;
      // remove fields handled separately
      delete payload.customer_primary_address;
      delete payload.city;
      if (!payload.tax_id) delete payload.tax_id;
      if (!payload.mobile_no) delete payload.mobile_no;
      if (!payload.email_id) delete payload.email_id;

      let customerId = customerName || '';

      if (isEditMode) {
        const resp = await fetch(`${baseUrl}/${encodeURIComponent(customerName!)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          setError(data.message || 'Gagal menyimpan pelanggan');
          setFormLoading(false);
          return;
        }
        customerId = customerName!;
      } else {
        const resp = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success || !data.data?.name) {
          setError(data.message || 'Gagal menyimpan pelanggan');
          setFormLoading(false);
          return;
        }
        customerId = data.data.name;
      }

      // require primary address + city
      if (!formData.customer_primary_address.trim()) {
        setError('Alamat utama wajib diisi');
        setFormLoading(false);
        return;
      }
      if (!formData.city.trim()) {
        setError('Kota wajib diisi jika alamat diisi');
        setFormLoading(false);
        return;
      }

      // create address
      let addressName = '';
      const addrResp = await fetch('/api/purchase/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_name: customerId,
          address: formData.customer_primary_address,
          country: formData.country || 'Indonesia',
          city: formData.city,
        }),
      });
      const addrData = await addrResp.json();
      if (!addrResp.ok || !addrData.success || !addrData.data?.name) {
        setError(addrData.message || 'Gagal membuat alamat pelanggan');
        setFormLoading(false);
        return;
      }
      addressName = addrData.data.name;

      if (addressName) {
        const updatePayload = { customer_primary_address: addressName };
        const updateResp = await fetch(`${baseUrl}/${encodeURIComponent(customerId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        });
        const updateData = await updateResp.json();
        if (!updateResp.ok || !updateData.success) {
          setError(updateData.message || 'Gagal mengaitkan alamat ke pelanggan');
          setFormLoading(false);
          return;
        }
      }

      setSuccessMessage(isEditMode ? 'Pelanggan berhasil diperbarui!' : 'Pelanggan berhasil ditambahkan!');
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Gagal menyimpan pelanggan');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat data pelanggan..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
          </h1>
          {isEditMode && <p className="text-sm text-gray-500">{customerName}</p>}
        </div>
        <button
          onClick={() => router.push('/customers')}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan nama pelanggan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pelanggan</label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="Company">Perusahaan</option>
              <option value="Individual">Perorangan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Pelanggan</label>
            <select
              value={formData.customer_group}
              onChange={(e) => setFormData({ ...formData, customer_group: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={groupsLoading}
            >
              {customerGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              {!customerGroups.length && <option value="">{groupsLoading ? 'Memuat...' : 'Tidak ada grup'}</option>}
            </select>
            {groupsError && <p className="mt-1 text-xs text-red-600">{groupsError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah</label>
            <select
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={territoryLoading}
            >
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {!territories.length && <option value="">{territoryLoading ? 'Memuat...' : 'Tidak ada wilayah'}</option>}
            </select>
            {territoryError && <p className="mt-1 text-xs text-red-600">{territoryError}</p>}
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              rows={3}
              value={formData.customer_primary_address}
              onChange={(e) => setFormData({ ...formData, customer_primary_address: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Masukkan alamat pelanggan"
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Masukkan kota"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenaga Penjual (Sales Person)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.sales_person}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                placeholder="Pilih tenaga penjual..."
              />
              <button
                type="button"
                onClick={() => setShowSalesPersonDialog(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
              >
                Pilih
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Akan ditambahkan ke Sales Team pelanggan</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {formLoading && <svg className="animate-spin h-4 w-4 inline mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {formLoading ? 'Menyimpan...' : (isEditMode ? 'Perbarui' : 'Simpan')}
          </button>
        </div>
      </form>

      {/* Sales Person Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={(salesPerson) => {
          setFormData({ ...formData, sales_person: salesPerson.name });
        }}
      />

      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Berhasil</h3>
            <p className="text-sm text-gray-600 mb-4">{successMessage || 'Data pelanggan berhasil disimpan.'}</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                onClick={() => setShowSuccessDialog(false)}
              >
                Tutup
              </button>
              <button
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                onClick={() => router.push('/customers')}
              >
                Ke Daftar Pelanggan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
