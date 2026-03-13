'use client';

import { useState, useEffect } from 'react';
import {
  DashboardStats, MonthlySales,
  StatCard, BarChart, QuickActionButton, AlertBanner,
  ALL_QUICK_ACTIONS, formatRp,
} from './DashboardWidgets';
import {
  TopProductsChart,
  CustomerBehaviorSection,
  SalesPerformanceSection,
  CommissionTrackerSection,
  InventoryAnalyticsSection,
  SupplierAnalyticsSection,
} from '@/components/analytics';
import AnalyticsErrorBoundary from '@/components/AnalyticsErrorBoundary';

const EMPTY_STATS: DashboardStats = {
  total_items: 0, total_sales_orders: 0, pending_orders: 0,
  total_invoices: 0, outstanding_invoices: 0, outstanding_amount: 0,
  total_payments: 0, total_purchase_orders: 0, pending_purchase_orders: 0,
  monthly_sales: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'products' | 'customers' | 'sales' | 'commission' | 'inventory' | 'suppliers'>('products');
  const [company] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_company') || '';
    }
    return '';
  });
  const [roles, setRoles] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const ld = JSON.parse(localStorage.getItem('loginData') || '{}');
        return ld.roles || [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [now] = useState(new Date());

  useEffect(() => {
    if (!company && typeof window !== 'undefined') {
      window.location.href = '/select-company';
      return;
    }

    // Fetch fresh roles from /me
    fetch('/api/setup/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success && d.data?.roles?.length) setRoles(d.data.roles); })
      .catch(() => {});

    // Fetch dashboard stats
    fetch('/api/setup/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [company]);

  const isAdmin = roles.includes('System Manager');
  const isSales = roles.some(r => ['Sales User','Sales Manager','Sales Master Manager'].includes(r));
  const isPurchase = roles.some(r => ['Purchase User','Purchase Manager','Purchase Master Manager'].includes(r));
  const isStock = roles.some(r => ['Stock User','Stock Manager','Item Manager'].includes(r));
  const isAccounts = roles.some(r => ['Accounts User','Accounts Manager'].includes(r));
  const showAll = roles.length === 0; // fallback: show all if roles not loaded yet

  // Filter quick actions by role
  const visibleActions = ALL_QUICK_ACTIONS.filter(a =>
    showAll || a.roles.some(r => roles.includes(r))
  );

  // Build stat cards based on role
  const statCards = [
    ...(isSales || isAdmin || showAll ? [
      {
        label: 'Pesanan Penjualan', value: stats.total_sales_orders,
        sub: `${stats.pending_orders} tertunda`,
        bgColor: 'bg-green-500', alert: false,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      },
      {
        label: 'Faktur Penjualan', value: stats.total_invoices,
        sub: `${stats.outstanding_invoices} belum lunas`,
        bgColor: 'bg-blue-500', alert: stats.outstanding_invoices > 0,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      },
    ] : []),
    ...(isPurchase || isAdmin || showAll ? [
      {
        label: 'Pesanan Pembelian', value: stats.total_purchase_orders,
        sub: `${stats.pending_purchase_orders} tertunda`,
        bgColor: 'bg-orange-500', alert: false,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
      },
    ] : []),
    ...(isAccounts || isAdmin || showAll ? [
      {
        label: 'Pembayaran Diterima', value: stats.total_payments,
        sub: 'transaksi lunas',
        bgColor: 'bg-yellow-500', alert: false,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
    ] : []),
    ...(isStock || isAdmin || showAll ? [
      {
        label: 'Total Barang', value: stats.total_items,
        sub: 'jenis barang aktif',
        bgColor: 'bg-indigo-500', alert: false,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      },
    ] : []),
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Memuat dasbor...</span>
        </div>
      </div>
    );
  }

  const monthlySales: MonthlySales[] = stats.monthly_sales?.length ? stats.monthly_sales : [];
  const totalSales6Months = monthlySales.reduce((s, d) => s + d.total, 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {company} · {now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alert: outstanding invoices */}
      {(isSales || isAccounts || isAdmin || showAll) && stats.outstanding_invoices > 0 && (
        <div className="mb-5">
          <AlertBanner count={stats.outstanding_invoices} amount={stats.outstanding_amount} />
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} bgColor={c.bgColor} alert={c.alert} icon={c.icon} />
        ))}
      </div>

      {/* Charts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Monthly Sales Chart */}
        {(isSales || isAccounts || isAdmin || showAll) && (
          <div className="lg:col-span-2 bg-white shadow rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Penjualan 6 Bulan Terakhir</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total: {formatRp(totalSales6Months)}</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-1 rounded-full">Faktur Lunas</span>
            </div>
            <BarChart data={monthlySales} />
          </div>
        )}

        {/* Summary Panel */}
        <div className={`bg-white shadow rounded-xl p-5 ${!(isSales || isAccounts || isAdmin || showAll) ? 'lg:col-span-3' : ''}`}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Ringkasan Status</h3>
          <div className="space-y-3">
            {(isSales || isAdmin || showAll) && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">SO Tertunda</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${stats.pending_orders > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                    {stats.pending_orders}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">Faktur Belum Lunas</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${stats.outstanding_invoices > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {stats.outstanding_invoices}
                  </span>
                </div>
                {stats.outstanding_invoices > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Total Piutang</span>
                    <span className="text-sm font-semibold text-red-600">{formatRp(stats.outstanding_amount)}</span>
                  </div>
                )}
              </>
            )}
            {(isPurchase || isAdmin || showAll) && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">PO Tertunda</span>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${stats.pending_purchase_orders > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                  {stats.pending_purchase_orders}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">ERPNext Backend</span>
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">● Terhubung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {visibleActions.length > 0 && (
        <div className="bg-white shadow rounded-xl p-5 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {visibleActions.map((action) => (
              <QuickActionButton key={action.href} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Analytics Sections with Tabs */}
      <AnalyticsErrorBoundary>
        <div className="bg-white shadow rounded-xl overflow-hidden">

          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto" aria-label="Analytics Tabs">
              <button
                onClick={() => setActiveAnalyticsTab('products')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'products'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Produk</span>
              </button>
              
              <button
                onClick={() => setActiveAnalyticsTab('customers')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'customers'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Pelanggan</span>
              </button>
              
              <button
                onClick={() => setActiveAnalyticsTab('sales')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'sales'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Penjualan</span>
              </button>
              
              <button
                onClick={() => setActiveAnalyticsTab('commission')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'commission'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Komisi</span>
                {/* Badge to show this tab has data */}
                <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                  Data
                </span>
              </button>
              
              <button
                onClick={() => setActiveAnalyticsTab('inventory')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'inventory'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Inventori</span>
              </button>
              
              <button
                onClick={() => setActiveAnalyticsTab('suppliers')}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${activeAnalyticsTab === 'suppliers'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <span>Supplier</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeAnalyticsTab === 'products' && (isSales || isStock || isAdmin || showAll) && (
              <div className="space-y-6">
                <TopProductsChart />
              </div>
            )}

            {activeAnalyticsTab === 'customers' && (isSales || isAccounts || isAdmin || showAll) && (
              <CustomerBehaviorSection />
            )}

            {activeAnalyticsTab === 'sales' && (isSales || isAdmin || showAll) && (
              <SalesPerformanceSection />
            )}

            {activeAnalyticsTab === 'commission' && (isSales || isAccounts || isAdmin || showAll) && (
              <CommissionTrackerSection />
            )}

            {activeAnalyticsTab === 'inventory' && (isStock || isAdmin || showAll) && (
              <InventoryAnalyticsSection />
            )}

            {activeAnalyticsTab === 'suppliers' && (isPurchase || isAdmin || showAll) && (
              <SupplierAnalyticsSection />
            )}
          </div>
        </div>
      </AnalyticsErrorBoundary>
    </div>
  );
}
