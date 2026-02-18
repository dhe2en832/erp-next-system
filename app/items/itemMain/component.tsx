'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import SearchableSelectDialog from '../../components/SearchableSelectDialog';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

interface Item {
  item_code: string;
  item_name: string;
  description: string;
  item_group: string;
  stock_uom: string;
  opening_stock: number;
  valuation_rate?: number;
  standard_rate?: number;
  last_purchase_rate?: number;
}

export default function ItemMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemCode = searchParams.get('code');

  const [loading, setLoading] = useState(!!itemCode);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showUomDialog, setShowUomDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    description: '',
    item_group: '',
    stock_uom: '',
    opening_stock: 0,
    valuation_rate: 0,
    standard_rate: 0,
    last_purchase_rate: 0,
    brand: '',
    default_currency: 'IDR',
  });
  const [valuationRateLoading, setValuationRateLoading] = useState(false);
  const [brands, setBrands] = useState<{name: string}[]>([]);
  const [itemGroups, setItemGroups] = useState<{name: string}[]>([]);
  const [uoms, setUoms] = useState<{name: string}[]>([]);
  
  // State untuk input formatting
  const [priceInputs, setPriceInputs] = useState({
    last_purchase_rate: '',
    standard_rate: ''
  });

  useEffect(() => {
    let savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        if (savedCompany) localStorage.setItem('selected_company', savedCompany);
      }
    }
    if (savedCompany) setSelectedCompany(savedCompany);
  }, []);

  // Fetch dropdown data from API routes (server-side)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch brands (existing API)
        const brandsResponse = await fetch('/api/inventory/items/brands', { credentials: 'include' });
        const brandsData = await brandsResponse.json();
        if (brandsData.success) {
          setBrands(brandsData.data || []);
          console.log('Brands loaded:', brandsData.data?.length || 0);
        }

        // Fetch item groups via API route
        const groupsResponse = await fetch('/api/inventory/dropdowns/item-groups', { credentials: 'include' });
        const groupsData = await groupsResponse.json();
        if (groupsResponse.ok && groupsData.success) {
          const groups = groupsData.data || [];
          setItemGroups(groups);
          console.log('Item groups loaded:', groups.length);
          if (!itemCode && groups.length > 0) {
            setFormData(prev => ({ ...prev, item_group: prev.item_group || groups[0].name }));
          }
        } else {
          console.log('Failed to load item groups:', groupsData);
        }

        // Fetch UOMs via API route
        const uomsResponse = await fetch('/api/inventory/dropdowns/uoms', { credentials: 'include' });
        const uomsData = await uomsResponse.json();
        if (uomsResponse.ok && uomsData.success) {
          const uomList = uomsData.data || [];
          setUoms(uomList);
          console.log('UOMs loaded:', uomList.length);
          if (!itemCode && uomList.length > 0) {
            setFormData(prev => ({ ...prev, stock_uom: prev.stock_uom || uomList[0].name }));
          }
        } else {
          console.log('Failed to load UOMs:', uomsData);
        }
        
      } catch (error) {
        console.log('Error fetching dropdown data:', error);
        // Fallback data
        setBrands([
          { name: 'AURI' },
          { name: 'ASBES' },
          { name: 'INDOPLAS' },
          { name: 'TOTO' }
        ]);
        setItemGroups([]);
        setUoms([]);
      }
    };
    fetchDropdownData();
  }, []);

  // Load item details for edit mode
  useEffect(() => {
    if (itemCode) {
      fetchItemDetails(itemCode);
    }
  }, [itemCode]);

  const fetchItemDetails = async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(code)}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.data) {
        const item = data.data;
        setEditingItem(item);
        setFormData({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description || '',
          item_group: item.item_group || 'All Item Groups',
          stock_uom: item.stock_uom || 'Nos',
          opening_stock: item.opening_stock || 0,
          valuation_rate: item.valuation_rate || 0,
          standard_rate: item.standard_rate || 0,
          last_purchase_rate: item.last_purchase_rate || 0,
          brand: item.brand || '',
          default_currency: 'IDR',
        });
        
        // Initialize price inputs with formatted values
        setPriceInputs({
          last_purchase_rate: item.last_purchase_rate ? item.last_purchase_rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00',
          standard_rate: item.standard_rate ? item.standard_rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
        });
        
        // Fetch valuation rate and bottom price for existing items
        fetchItemPricing(item.item_code);
      } else {
        setError('Gagal memuat detail barang: ' + (data.message || 'Item tidak ditemukan'));
      }
    } catch {
      setError('Gagal memuat detail barang');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemPricing = async (itemCode: string) => {
    setValuationRateLoading(true);
    try {
      // Fetch valuation rate from stock ledger
      const valuationResponse = await fetch(`/api/inventory/items/valuation-rate?item_codes=${itemCode}`, { credentials: 'include' });
      const valuationData = await valuationResponse.json();
      
      // Fetch purchase price from "Standar Pembelian" price list
      const purchaseResponse = await fetch(`/api/inventory/items/price?item_code=${itemCode}&selling=0`, { credentials: 'include' });
      const purchaseData = await purchaseResponse.json();
      
      // Fetch selling price from "Standard Jual" price list  
      const sellingResponse = await fetch(`/api/inventory/items/price?item_code=${itemCode}&selling=1`, { credentials: 'include' });
      const sellingData = await sellingResponse.json();
      
      if (valuationResponse.ok && valuationData.success && valuationData.data[itemCode]) {
        setFormData(prev => ({
          ...prev,
          valuation_rate: valuationData.data[itemCode],
        }));
      }
      
      if (purchaseResponse.ok && purchaseData.success) {
        setFormData(prev => ({
          ...prev,
          last_purchase_rate: purchaseData.data.price_list_rate || 0,
        }));
        setPriceInputs(prev => ({
          ...prev,
          last_purchase_rate: purchaseData.data.price_list_rate ? purchaseData.data.price_list_rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
        }));
      }
      
      if (sellingResponse.ok && sellingData.success) {
        setFormData(prev => ({
          ...prev,
          standard_rate: sellingData.data.price_list_rate || 0,
        }));
        setPriceInputs(prev => ({
          ...prev,
          standard_rate: sellingData.data.price_list_rate ? sellingData.data.price_list_rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
        }));
      }
    } catch (err) {
      console.error('Error fetching item pricing:', err);
    } finally {
      setValuationRateLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const url = editingItem ? '/api/inventory/items' : '/api/inventory/items';
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: selectedCompany, ...formData }),
      });
      const data = await response.json();

      if (data.success) {
        const action = editingItem ? 'diperbarui' : 'disimpan';
        setAlertType('success');
        setAlertMessage(`Barang ${formData.item_code} berhasil ${action}!`);
        setShowAlert(true);
        setSuccessMessage(`Barang ${formData.item_code} berhasil ${action}!`);
      } else {
        setAlertType('error');
        setAlertMessage(data.message || 'Gagal menyimpan barang');
        setShowAlert(true);
      }
    } catch {
      setAlertType('error');
      setAlertMessage('Terjadi kesalahan. Silakan coba lagi.');
      setShowAlert(true);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Memuat detail barang..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Alert Dialog */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              {alertType === 'success' ? (
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              <h3 className={`text-lg font-semibold ${alertType === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {alertType === 'success' ? 'Berhasil!' : 'Error!'}
              </h3>
            </div>
            <p className={`text-sm mb-6 ${alertType === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {alertMessage}
            </p>
            <div className="flex justify-end space-x-3">
              {alertType === 'success' && (
                <button
                  onClick={() => {
                    setShowAlert(false);
                    router.push('/items/itemList');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                >
                  OK
                </button>
              )}
              {alertType === 'error' && (
                <button
                  onClick={() => setShowAlert(false)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Brand Dialog */}
      <SearchableSelectDialog
        isOpen={showBrandDialog}
        onClose={() => setShowBrandDialog(false)}
        onSelect={(value) => setFormData({ ...formData, brand: value })}
        title="Pilih Merek"
        placeholder="Cari merek..."
        options={brands}
        selectedValue={formData.brand}
      />

      {/* Group Dialog */}
      <SearchableSelectDialog
        isOpen={showGroupDialog}
        onClose={() => setShowGroupDialog(false)}
        onSelect={(value) => setFormData({ ...formData, item_group: value })}
        title="Pilih Grup Barang"
        placeholder="Cari grup barang..."
        options={itemGroups}
        selectedValue={formData.item_group}
      />

      {/* UOM Dialog */}
      <SearchableSelectDialog
        isOpen={showUomDialog}
        onClose={() => setShowUomDialog(false)}
        onSelect={(value) => setFormData({ ...formData, stock_uom: value })}
        title="Pilih Satuan Stok"
        placeholder="Cari satuan stok..."
        options={uoms}
        selectedValue={formData.stock_uom}
      />

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {editingItem ? 'Perbarui informasi barang' : 'Tambahkan barang baru ke sistem'}
              </p>
            </div>
            <button
              onClick={() => router.push('/items/itemList')}
              className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 min-h-[44px]"
            >
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{successMessage}</div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Kode Barang</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                  value={formData.item_code || (editingItem ? '' : 'Otomatis dari Sistem')}
                  readOnly
                  title="Kode barang akan di-generate otomatis oleh Sistem"
                />
                <p className="mt-1 text-xs text-gray-500">Kode barang di-generate otomatis oleh sistem</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Barang</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Grup Barang</label>
                  <button
                    type="button"
                    onClick={() => setShowGroupDialog(true)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-left bg-white hover:bg-gray-50"
                  >
                    {formData.item_group || 'Pilih Grup Barang...'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Merek (Brand)</label>
                  <button
                    type="button"
                    onClick={() => setShowBrandDialog(true)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-left bg-white hover:bg-gray-50"
                  >
                    {formData.brand || 'Pilih Merek...'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Satuan Stok</label>
                  <button
                    type="button"
                    onClick={() => setShowUomDialog(true)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-left bg-white hover:bg-gray-50"
                  >
                    {formData.stock_uom || 'Pilih Satuan...'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mata Uang</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                    value={formData.default_currency}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stok Awal</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Harga</h3>
              
              {/* Price Information Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Harga Beli (Price List: Standar Pembelian)</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formData.last_purchase_rate ? `Rp ${formData.last_purchase_rate.toLocaleString('id-ID')}` : 'Rp 0'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Harga beli dari price list "Standar Pembelian"</div>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Harga Jual (Price List: Standard Jual)</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formData.standard_rate ? `Rp ${formData.standard_rate.toLocaleString('id-ID')}` : 'Rp 0'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Harga jual dari price list "Standard Jual"</div>
                </div>
              </div>

              {/* Additional Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Avg Beli (Stock Ledger)</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {valuationRateLoading ? 'Memuat...' : formData.valuation_rate ? `Rp ${formData.valuation_rate.toLocaleString('id-ID')}` : 'Rp 0'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Rata-rata harga dari transaksi aktual</div>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Last Purchase Rate (Master Item)</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {editingItem?.last_purchase_rate ? `Rp ${editingItem.last_purchase_rate.toLocaleString('id-ID')}` : 'Rp 0'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Last purchase rate dari master item</div>
                </div>
              </div>

              {/* Price Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Update Harga Beli <span className="text-gray-400 text-xs">- Price List: Standar Pembelian</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={priceInputs.last_purchase_rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPriceInputs(prev => ({ ...prev, last_purchase_rate: value }));
                      
                      // Parse numeric value for form data
                      const cleanValue = value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(/,/g, '.');
                      const numValue = parseFloat(cleanValue) || 0;
                      setFormData(prev => ({ ...prev, last_purchase_rate: numValue }));
                    }}
                    onBlur={(e) => {
                      // Format on blur to ensure proper currency format
                      const cleanValue = e.target.value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(/,/g, '.');
                      const numValue = parseFloat(cleanValue) || 0;
                      const formattedValue = numValue.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setPriceInputs(prev => ({ ...prev, last_purchase_rate: formattedValue }));
                      setFormData(prev => ({ ...prev, last_purchase_rate: numValue }));
                    }}
                    placeholder="0,00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Update harga beli di Price List (master item tetap otomatis)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Update Harga Jual <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">- Price List: Standard Jual</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={priceInputs.standard_rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPriceInputs(prev => ({ ...prev, standard_rate: value }));
                      
                      // Parse numeric value for form data
                      const cleanValue = value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(/,/g, '.');
                      const numValue = parseFloat(cleanValue) || 0;
                      setFormData(prev => ({ ...prev, standard_rate: numValue }));
                    }}
                    onBlur={(e) => {
                      // Format on blur to ensure proper currency format
                      const cleanValue = e.target.value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(/,/g, '.');
                      const numValue = parseFloat(cleanValue) || 0;
                      const formattedValue = numValue.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setPriceInputs(prev => ({ ...prev, standard_rate: formattedValue }));
                      setFormData(prev => ({ ...prev, standard_rate: numValue }));
                    }}
                    placeholder="0,00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Update harga jual di Price List (master item tetap otomatis)</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Catatan:</strong> Update harga hanya mengubah Item Price List. 
                  Master item fields (standard_rate, last_purchase_rate) tetap dikelola otomatis oleh sistem dari transaksi.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => router.push('/items/itemList')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {formLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {formLoading ? 'Memproses...' : editingItem ? 'Perbarui Barang' : 'Simpan Barang'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
