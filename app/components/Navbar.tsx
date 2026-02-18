'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Company {
  name: string;
  company_name: string;
  country: string;
  abbr: string;
}

interface MenuItem {
  name: string;
  href: string;
  allowedRoles?: string[];
}

interface MenuCategory {
  name: string;
  icon: string;
  items: MenuItem[];
}

export default function Navbar() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<{ full_name: string; roles?: string[] } | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get selected company from localStorage
    const storedCompany = localStorage.getItem('selected_company');
    
    if (storedCompany) {
      const companyData = {
        name: storedCompany,
        company_name: storedCompany,
        country: '',
        abbr: storedCompany.substring(0, 3).toUpperCase()
      };
      setSelectedCompany(companyData);
    }

    // Get user data from localStorage (fallback)
    const loginData = localStorage.getItem('loginData');
    if (loginData) {
      try {
        const data = JSON.parse(loginData);
        setUser({ full_name: data.full_name, roles: data.roles || [] });
        if (data.roles) setRoles(data.roles);
      } catch { /* ignore invalid data */ }
    }

    // Fetch current user info with roles — always overrides stale localStorage
    (async () => {
      try {
        const res = await fetch('/api/setup/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data) {
          const freshRoles = data.data.roles || [];
          setUser({ full_name: data.data.full_name, roles: freshRoles });
          setRoles(freshRoles);
          // Update localStorage so it's fresh for next render
          try {
            const stored = JSON.parse(localStorage.getItem('loginData') || '{}');
            localStorage.setItem('loginData', JSON.stringify({
              ...stored,
              full_name: data.data.full_name,
              roles: freshRoles,
            }));
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();

    // Listen for storage changes (for cross-tab synchronization)
    const handleStorageChange = () => {
      const updatedCompany = localStorage.getItem('selected_company');
      if (updatedCompany) {
        setSelectedCompany({
          name: updatedCompany,
          company_name: updatedCompany,
          country: '',
          abbr: updatedCompany.substring(0, 3).toUpperCase()
        });
      } else {
        setSelectedCompany(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking inside a dropdown container
      if (target.closest('.dropdown-container')) {
        return;
      }
      
      // Don't close if clicking on mobile menu button
      if (target.closest('.mobile-menu-button')) {
        return;
      }
      
      // Close dropdowns and user menu
      setActiveDropdown(null);
      setIsMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/setup/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage and redirect to login
      localStorage.clear();
      router.push('/login');
    }
  };

  const handleSwitchCompany = () => {
    localStorage.removeItem('selected_company');
    router.push('/select-company');
  };

  const isActive = (path: string) => pathname === path;

  const menuCategories: MenuCategory[] = [
    {
      name: 'Dashboard',
      icon: '📊',
      items: [
        { name: 'Dashboard', href: '/dashboard' }
      ]
    },
    {
      name: 'Penjualan',
      icon: '💰',
      items: [
        { name: 'Pesanan Penjualan', href: '/sales-order' },
        { name: 'Surat Jalan', href: '/delivery-note' },
        { name: 'Faktur Penjualan', href: '/invoice' }
      ]
    },
    {
      name: 'Pembelian',
      icon: '🛒',
      items: [
        { name: 'Pesanan Pembelian', href: '/purchase-orders' },
        { name: 'Penerimaan Barang', href: '/purchase-receipts' },
        { name: 'Faktur Pembelian', href: '/purchase-invoice' }
      ]
    },
    {
      name: 'Kas & Bank',
      icon: '💳',
      items: [
        { name: 'Kas Masuk', href: '/kas-masuk' },
        { name: 'Kas Keluar', href: '/kas-keluar' },
        // { name: 'Kas Masuk', href: '/payment/paymentMain?type=receive' },
        // { name: 'Kas Keluar', href: '/payment/paymentMain?type=pay' },
        { name: 'Pembayaran', href: '/payment' },
        // { name: 'Rekonsiliasi Pembayaran', href: '/payment-reconciliation' }
      ]
    },
    {
      name: 'Akunting',
      icon: '📒',
      items: [
        { name: 'Bagan Akun', href: '/chart-of-accounts' },
        { name: 'Jurnal Umum', href: '/gl-entry' },
        { name: 'Entri Jurnal', href: '/journal' }
      ]
    },
    {
      name: 'Persediaan',
      icon: '�',
      items: [
        { name: 'Barang', href: '/items' },
        { name: 'Gudang', href: '/warehouse' },
        { name: 'Entri Stok', href: '/stock-entry' },
        // { name: 'Rekonsiliasi Stok', href: '/stock-reconciliation' },
        // { name: 'Manajemen Stok', href: '/stock-management' }
      ]
    },
    {
      name: 'Laporan',
      icon: '📈',
      items: [
        { name: 'Laporan Keuangan', href: '/financial-reports', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager'] },
        { name: 'Piutang Usaha', href: '/reports/accounts-receivable', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager', 'Sales Manager', 'Sales Master Manager'] },
        { name: 'Hutang Usaha', href: '/reports/accounts-payable', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager', 'Purchase Manager', 'Purchase Master Manager'] },
        { name: 'Alur Kas', href: '/reports/cash-flow', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager'] },
        { name: 'Laporan Penjualan', href: '/reports/sales', allowedRoles: ['System Manager', 'Sales User', 'Sales Manager', 'Sales Master Manager', 'Report Manager'] },
        { name: 'Laporan Pembelian', href: '/reports/purchases', allowedRoles: ['System Manager', 'Purchase User', 'Purchase Manager', 'Purchase Master Manager', 'Report Manager'] },
        { name: 'Stok per Gudang', href: '/reports/stock-balance', allowedRoles: ['System Manager', 'Stock User', 'Stock Manager', 'Item Manager', 'Report Manager'] },
        { name: 'Ledger HPP', href: '/reports/hpp-ledger', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager'] },
        { name: 'Margin per Unit', href: '/reports/margin-analysis', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Sales Manager', 'Report Manager'] },
        { name: 'Penyesuaian Stok', href: '/reports/stock-adjustment', allowedRoles: ['System Manager', 'Stock User', 'Stock Manager', 'Accounts Manager', 'Report Manager'] },
        { name: 'Ongkir/Biaya Perolehan', href: '/reports/acquisition-costs', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager'] },
        { name: 'Retur Jual/Beli', href: '/reports/returns', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Sales Manager', 'Purchase Manager', 'Report Manager'] },
        { name: 'Rekonsiliasi HPP', href: '/reports/hpp-reconciliation', allowedRoles: ['System Manager', 'Accounts User', 'Accounts Manager', 'Report Manager'] },
      ]
    },
    {
      name: 'Komisi',
      icon: '🏆',
      items: [
        { name: 'Laporan Profit & Komisi', href: '/profit-report' },
        { name: 'Pembayaran Komisi', href: '/commission-payment' }
      ]
    },
    {
      name: 'Master Data',
      icon: '🗂️',
      items: [
        { name: 'Pelanggan', href: '/customers' },
        { name: 'Pemasok', href: '/suppliers' },
        { name: 'Karyawan', href: '/employees' },
        { name: 'Sales Person', href: '/sales-persons' },
        { name: 'Termin Pembayaran', href: '/payment-terms' }
      ]
    },
    {
      name: 'Pengaturan',
      icon: '⚙️',
      items: [
        { name: 'Manajemen Pengguna', href: '/users' },
        { name: 'Ganti Perusahaan', href: '/select-company' }
      ]
    }
  ];

  const roleLabel = (role?: string) => {
    const map: Record<string, string> = {
      'System Manager': 'Manajer Sistem',
      'Sales User': 'Pengguna Penjualan',
      'Sales Manager': 'Manajer Penjualan',
      'Sales Master Manager': 'Manajer Utama Penjualan',
      'Purchase User': 'Pengguna Pembelian',
      'Purchase Manager': 'Manajer Pembelian',
      'Purchase Master Manager': 'Manajer Utama Pembelian',
      'Stock User': 'Pengguna Persediaan',
      'Stock Manager': 'Manajer Persediaan',
      'Item Manager': 'Manajer Barang',
      'Accounts User': 'Pengguna Akuntansi',
      'Accounts Manager': 'Manajer Akuntansi',
      'HR User': 'Pengguna SDM',
      'HR Manager': 'Manajer SDM',
      'Report Manager': 'Manajer Laporan',
      'Projects User': 'Pengguna Proyek',
      'Projects Manager': 'Manajer Proyek',
      'Administrator': 'Administrator',
    };
    return map[role || ''] || role || 'Pengguna';
  };

  const roleCategoryMap: Record<string, string[]> = {
    'System Manager': ['*'],
    'Accounts User': ['Dashboard', 'Kas & Bank', 'Akunting', 'Laporan'],
    'Accounts Manager': ['Dashboard', 'Kas & Bank', 'Akunting', 'Laporan'],
    'Sales User': ['Dashboard', 'Penjualan', 'Master Data'],
    'Sales Manager': ['Dashboard', 'Penjualan', 'Komisi', 'Laporan', 'Master Data'],
    'Sales Master Manager': ['Dashboard', 'Penjualan', 'Komisi', 'Laporan', 'Master Data'],
    'Purchase User': ['Dashboard', 'Pembelian', 'Master Data'],
    'Purchase Manager': ['Dashboard', 'Pembelian', 'Laporan', 'Master Data'],
    'Purchase Master Manager': ['Dashboard', 'Pembelian', 'Laporan', 'Master Data'],
    'Stock User': ['Dashboard', 'Persediaan', 'Master Data'],
    'Stock Manager': ['Dashboard', 'Persediaan', 'Laporan', 'Master Data'],
    'Item Manager': ['Dashboard', 'Persediaan', 'Laporan', 'Master Data'],
    'HR User': ['Dashboard', 'Master Data'],
    'HR Manager': ['Dashboard', 'Master Data', 'Laporan'],
    'Report Manager': ['Dashboard', 'Laporan', 'Akunting'],
    'Projects User': ['Dashboard', 'Master Data'],
    'Projects Manager': ['Dashboard', 'Master Data', 'Laporan'],
  };

  const canSeeCategory = (category: MenuCategory) => {
    if (!roles || roles.length === 0) return true;
    if (roles.includes('System Manager')) return true;
    const allowed = new Set<string>();
    roles.forEach(r => {
      (roleCategoryMap[r] || []).forEach(c => allowed.add(c));
    });
    // For Laporan: show category if user has access to at least one sub-item
    if (category.name === 'Laporan') {
      return category.items.some(item =>
        !item.allowedRoles || item.allowedRoles.some(r => roles.includes(r))
      );
    }
    return allowed.has('*') || allowed.has(category.name);
  };

  const filterItems = (items: MenuItem[]) => {
    if (!roles || roles.length === 0) return items;
    if (roles.includes('System Manager')) return items;
    return items.filter(item =>
      !item.allowedRoles || item.allowedRoles.some(r => roles.includes(r))
    );
  };

  const visibleCategories = menuCategories.filter(canSeeCategory).map(cat => ({
    ...cat,
    items: filterItems(cat.items),
  }));

  // Don't show navbar on login and company selection pages
  if (pathname === '/login' || pathname === '/select-company') {
    return null;
  }

  return (
    <>
      {/* Header Section */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and System Name */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 rounded-lg p-2">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">ERP System</h1>
                  <p className="text-sm text-gray-500">Enterprise Resource Planning</p>
                </div>
              </div>
            </div>

            {/* Company and User Info */}
            <div className="flex items-center space-x-6">
              {/* Company Info */}
              {selectedCompany && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{selectedCompany.company_name}</p>
                    <p className="text-xs text-gray-500">Perusahaan Aktif</p>
                  </div>
                  <button
                    onClick={handleSwitchCompany}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Ganti Perusahaan"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
              )}

              {/* User Profile */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                    <p className="text-xs text-gray-500">{roleLabel(user?.roles?.[0])}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <p className="font-medium">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{roleLabel(user?.roles?.[0])}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            {/* Desktop Navigation - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1 flex-wrap">
              {visibleCategories.map((category, catIdx) => (
                <div key={category.name} className="relative dropdown-container">
                  {category.items.length === 1 ? (
                    <a
                      href={category.items[0].href}
                      className={`inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive(category.items[0].href)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-1.5">{category.icon}</span>
                      <span className="hidden lg:inline">{category.items[0].name}</span>
                      <span className="lg:hidden">{category.icon}</span>
                    </a>
                  ) : (
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === category.name ? null : category.name)}
                        className={`inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          category.items.some(item => isActive(item.href))
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-1.5">{category.icon}</span>
                        <span className="hidden lg:inline">{category.name}</span>
                        <svg
                          className={`ml-1 h-3.5 w-3.5 transition-transform ${
                            activeDropdown === category.name ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {activeDropdown === category.name && (
                        <div className={`absolute ${catIdx >= menuCategories.length - 3 ? 'right-0' : 'left-0'} mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50`}>
                          <div className="py-1">
                            {category.items.map((item) => (
                              item.href === '#' ? (
                                <div key={item.name} className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-100 first:border-t-0 mt-1 first:mt-0">
                                  {item.name.replace(/—/g, '').trim()}
                                </div>
                              ) : (
                                <a
                                  key={item.name}
                                  href={item.href}
                                  className={`block px-4 py-2 text-sm transition-colors ${
                                    isActive(item.href)
                                      ? 'bg-indigo-50 text-indigo-700'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {item.name}
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile hamburger - shown on mobile only */}
            <div className="md:hidden flex items-center w-full justify-between">
              <span className="text-sm font-medium text-gray-700">Menu</span>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="mobile-menu-button inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Button - floating */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="mobile-menu-button bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu - slide-in drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {visibleCategories.map((category) => (
                <div key={category.name} className="mb-5">
                  <div className="flex items-center mb-2">
                    <span className="mr-2">{category.icon}</span>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {category.name}
                    </h3>
                  </div>
                  <div className="space-y-0.5">
                    {category.items.map((item) => (
                      item.href === '#' ? (
                        <div key={item.name} className="pl-8 pr-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {item.name.replace(/—/g, '').trim()}
                        </div>
                      ) : (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block pl-8 pr-4 py-2 text-sm rounded-lg transition-colors ${
                            isActive(item.href)
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {item.name}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
