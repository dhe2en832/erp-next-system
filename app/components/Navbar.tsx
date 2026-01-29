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
    // Get selected company from localStorage
    const storedCompany = localStorage.getItem('selected_company');
    if (storedCompany) {
      setSelectedCompany({
        name: storedCompany,
        company_name: storedCompany,
        country: '',
        abbr: storedCompany.substring(0, 3).toUpperCase()
      });
    }

    // Get user data from localStorage
    const loginData = localStorage.getItem('loginData');
    if (loginData) {
      try {
        const data = JSON.parse(loginData);
        setUser({ full_name: data.full_name });
      } catch {
        console.log('Invalid login data in localStorage');
      }
    }
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
        { name: 'Payments', href: '/payment' },
        { name: 'Commission Dashboard', href: '/commission' }
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
  if (pathname === '/login' || pathname === '/select-company') {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">ERP System</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
              {menuCategories.map((category) => (
                <div key={category.name} className="relative">
                  {category.items.length === 1 ? (
                    // Single item menu
                    <a
                      href={category.items[0].href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive(category.items[0].href)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-2">{category.icon}</span>
                      {category.items[0].name}
                    </a>
                  ) : (
                    // Dropdown menu
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === category.name ? null : category.name)}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          category.items.some(item => isActive(item.href))
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                        <svg
                          className={`ml-2 h-4 w-4 transition-transform ${
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
                        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            {category.items.map((item) => (
                              <a
                                key={item.name}
                                href={item.href}
                                className={`block px-4 py-2 text-sm ${
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
          </div>

          {/* Right side items */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Company Info */}
            {selectedCompany && (
              <div className="flex items-center mr-4">
                <div className="text-sm">
                  <p className="text-gray-500">Current Company</p>
                  <p className="font-medium text-gray-900">{selectedCompany.company_name}</p>
                </div>
                <button
                  onClick={handleSwitchCompany}
                  className="ml-3 p-2 text-gray-400 hover:text-gray-500"
                  title="Switch Company"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user?.full_name}</p>
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

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {menuCategories.map((category) => (
              <div key={category.name}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {category.icon} {category.name}
                </div>
                {category.items.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`block pl-8 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive(item.href)
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                    }`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
          
          {/* Mobile user info */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {selectedCompany && (
              <div className="px-4 py-2">
                <p className="text-sm text-gray-500">Current Company</p>
                <p className="text-base font-medium text-gray-900">{selectedCompany.company_name}</p>
                <button
                  onClick={handleSwitchCompany}
                  className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Switch Company
                </button>
              </div>
            )}
            {user && (
              <div className="px-4 py-2 border-t border-gray-200">
                <p className="text-base font-medium text-gray-900">{user.full_name}</p>
                <button
                  onClick={handleLogout}
                  className="mt-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
