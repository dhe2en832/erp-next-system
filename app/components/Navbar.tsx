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
}

interface MenuCategory {
  name: string;
  icon: string;
  items: MenuItem[];
}

export default function Navbar() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<{ full_name: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('Navbar useEffect triggered');
    // Get selected company from localStorage
    const storedCompany = localStorage.getItem('selected_company');
    console.log('Stored company from localStorage:', storedCompany);
    
    if (storedCompany) {
      const companyData = {
        name: storedCompany,
        company_name: storedCompany,
        country: '',
        abbr: storedCompany.substring(0, 3).toUpperCase()
      };
      console.log('Setting selected company:', companyData);
      setSelectedCompany(companyData);
    } else {
      console.log('No stored company found');
    }

    // Get user data from localStorage
    const loginData = localStorage.getItem('loginData');
    if (loginData) {
      try {
        const data = JSON.parse(loginData);
        console.log('Navbar login data:', data);
        console.log('User full_name:', data.full_name);
        setUser({ full_name: data.full_name });
      } catch {
        console.log('Invalid login data in localStorage');
      }
    }

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
      await fetch('/api/auth/logout', { method: 'POST' });
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
      name: 'Akunting',
      icon: '💰',
      items: [
        { name: 'Chart of Accounts', href: '/chart-of-accounts' },
        { name: 'GL Entry', href: '/gl-entry' },
        { name: 'Financial Reports', href: '/financial-reports' },
        { name: 'Journal Entries', href: '/journal' }
      ]
    },
    {
      name: 'Penjualan',
      icon: '🛒',
      items: [
        { name: 'Sales Orders', href: '/sales-order' },
        { name: 'Delivery Notes', href: '/delivery-note' },
        { name: 'Sales Invoices', href: '/invoice' },
        { name: 'Commission Dashboard', href: '/commission' }
      ]
    },
    {
      name: 'Keuangan',
      icon: '💳',
      items: [
        { name: 'Payments', href: '/payment' },
        { name: 'Payment Terms', href: '/payment-terms' },
        { name: 'Payment Reconciliation', href: '/payment-reconciliation' }
      ]
    },
    {
      name: 'Pembelian',
      icon: '📦',
      items: [
        { name: 'Purchase Orders', href: '/purchase-orders' },
        { name: 'Purchase Invoices', href: '/purchase-invoice' }
      ]
    },
    {
      name: 'Persediaan',
      icon: '📋',
      items: [
        { name: 'Items', href: '/items' },
        { name: 'Stock Management', href: '/stock-management' }
      ]
    },
    {
      name: 'Gudang',
      icon: '🏭',
      items: [
        { name: 'Warehouses', href: '/warehouse' },
        { name: 'Stock Entry', href: '/stock-entry' },
        { name: 'Stock Reconciliation', href: '/stock-reconciliation' }
      ]
    },
    {
      name: 'Master Data',
      icon: '🗂️',
      items: [
        { name: 'Customers', href: '/customers' },
        { name: 'Suppliers', href: '/suppliers' }
      ]
    }
  ];

  // Don't show navbar on login and company selection pages
  console.log('Current pathname:', pathname);
  if (pathname === '/login' || pathname === '/select-company') {
    console.log('Hiding navbar for pathname:', pathname);
    return null;
  }
  console.log('Showing navbar for pathname:', pathname);

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
                    <p className="text-xs text-gray-500">Current Company</p>
                  </div>
                  <button
                    onClick={handleSwitchCompany}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Switch Company"
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
                    <p className="text-xs text-gray-500">Administrator</p>
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
                        <p className="text-xs text-gray-500">Administrator</p>
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
          <div className="flex items-center justify-between py-3">
            {/* Left side - Main Navigation */}
            <div className="flex items-center space-x-1">
              {menuCategories.slice(0, 5).map((category) => (
                <div key={category.name} className="relative dropdown-container">
                  {category.items.length === 1 ? (
                    // Single item menu
                    <a
                      href={category.items[0].href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(category.items[0].href)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-2">{category.icon}</span>
                      <span className="hidden sm:inline">{category.items[0].name}</span>
                      <span className="sm:hidden">{category.items[0].name.substring(0, 3)}</span>
                    </a>
                  ) : (
                    // Dropdown menu
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === category.name ? null : category.name)}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          category.items.some(item => isActive(item.href))
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        <span className="hidden sm:inline">{category.name}</span>
                        <span className="sm:hidden">{category.name.substring(0, 3)}</span>
                        <svg
                          className={`ml-1 h-4 w-4 transition-transform ${
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
                        <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            {category.items.map((item) => (
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
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right side - More menu for overflow */}
            <div className="flex items-center space-x-1">
              {menuCategories.slice(5).map((category) => (
                <div key={category.name} className="relative dropdown-container">
                  {category.items.length === 1 ? (
                    <a
                      href={category.items[0].href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(category.items[0].href)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-2">{category.icon}</span>
                      <span className="hidden lg:inline">{category.items[0].name}</span>
                      <span className="lg:hidden">{category.items[0].name.substring(0, 3)}</span>
                    </a>
                  ) : (
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === category.name ? null : category.name)}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          category.items.some(item => isActive(item.href))
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        <span className="hidden lg:inline">{category.name}</span>
                        <span className="lg:hidden">{category.name.substring(0, 3)}</span>
                        <svg
                          className={`ml-1 h-4 w-4 transition-transform ${
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
                        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            {category.items.map((item) => (
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
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* More menu dropdown for smaller screens */}
              <div className="relative dropdown-container lg:hidden">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDropdown === 'more' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {activeDropdown === 'more' && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      {menuCategories.slice(5).map((category) => (
                        <div key={category.name} className="border-b border-gray-100 last:border-b-0">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {category.icon} {category.name}
                          </div>
                          {category.items.map((item) => (
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
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="mobile-menu-button bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
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
              
              {menuCategories.map((category) => (
                <div key={category.name} className="mb-6">
                  <div className="flex items-center mb-3">
                    <span className="mr-2">{category.icon}</span>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {category.name}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block pl-8 pr-4 py-2 text-sm rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item.name}
                      </a>
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
