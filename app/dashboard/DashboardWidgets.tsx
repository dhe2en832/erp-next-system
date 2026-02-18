'use client';

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlySales { month: string; total: number; }

export interface DashboardStats {
  total_items: number;
  total_sales_orders: number;
  pending_orders: number;
  total_invoices: number;
  outstanding_invoices: number;
  outstanding_amount: number;
  total_payments: number;
  total_purchase_orders: number;
  pending_purchase_orders: number;
  monthly_sales: MonthlySales[];
}

export interface QuickAction {
  label: string;
  href: string;
  colorClass: string;
  roles: string[];
  icon: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export function formatRp(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  bgColor: string;
  icon: React.ReactNode;
  alert?: boolean;
}

export function StatCard({ label, value, sub, bgColor, icon, alert }: StatCardProps) {
  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${alert ? 'border-red-500' : 'border-transparent'}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {icon}
            </svg>
          </div>
          <div className="ml-4 w-0 flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export function BarChart({ data }: { data: MonthlySales[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const hasData = data.some(d => d.total > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-400 text-sm">
        Belum ada data penjualan
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5 h-36 w-full pt-2">
      {data.map((d) => {
        const pct = Math.round((d.total / max) * 100);
        const monthNum = parseInt(d.month.split('-')[1]) - 1;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            {d.total > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {formatRp(d.total)}
              </div>
            )}
            <div className="w-full flex items-end" style={{ height: '96px' }}>
              <div
                className="w-full rounded-t bg-indigo-500 hover:bg-indigo-600 transition-colors cursor-default"
                style={{ height: `${Math.max(pct, d.total > 0 ? 6 : 0)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{MONTH_ID[monthNum]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Action Button ───────────────────────────────────────────────────────

export function QuickActionButton({ action }: { action: QuickAction }) {
  return (
    <a
      href={action.href}
      className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
    >
      <svg className={`w-7 h-7 mb-2 ${action.colorClass} group-hover:scale-110 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {action.icon}
      </svg>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
    </a>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

export function AlertBanner({ count, amount }: { count: number; amount: number }) {
  if (count === 0) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-red-800">
          {count} Faktur Belum Lunas
        </p>
        <p className="text-xs text-red-600">Total piutang: {formatRp(amount)}</p>
      </div>
      <a href="/invoice" className="ml-auto text-xs font-medium text-red-700 hover:underline">Lihat →</a>
    </div>
  );
}

// ─── All Quick Actions Definition ─────────────────────────────────────────────

export const ALL_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Pesanan Penjualan', href: '/sales-order', colorClass: 'text-green-600',
    roles: ['Sales User','Sales Manager','Sales Master Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  },
  {
    label: 'Faktur Penjualan', href: '/invoice', colorClass: 'text-blue-600',
    roles: ['Sales User','Sales Manager','Sales Master Manager','Accounts User','Accounts Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    label: 'Surat Jalan', href: '/delivery-note', colorClass: 'text-teal-600',
    roles: ['Sales User','Sales Manager','Sales Master Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
  },
  {
    label: 'Pesanan Pembelian', href: '/purchase-orders', colorClass: 'text-orange-600',
    roles: ['Purchase User','Purchase Manager','Purchase Master Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
  },
  {
    label: 'Penerimaan Barang', href: '/purchase-receipts', colorClass: 'text-amber-600',
    roles: ['Purchase User','Purchase Manager','Purchase Master Manager','Stock User','Stock Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    label: 'Faktur Pembelian', href: '/purchase-invoice', colorClass: 'text-red-500',
    roles: ['Purchase User','Purchase Manager','Purchase Master Manager','Accounts User','Accounts Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
  },
  {
    label: 'Pembayaran', href: '/payment', colorClass: 'text-yellow-600',
    roles: ['Accounts User','Accounts Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'Jurnal Umum', href: '/journal', colorClass: 'text-purple-600',
    roles: ['Accounts User','Accounts Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  },
  {
    label: 'Kelola Barang', href: '/items', colorClass: 'text-indigo-600',
    roles: ['Stock User','Stock Manager','Item Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    label: 'Entri Stok', href: '/stock-entry', colorClass: 'text-cyan-600',
    roles: ['Stock User','Stock Manager','Item Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />,
  },
  {
    label: 'Komisi', href: '/commission', colorClass: 'text-pink-600',
    roles: ['Sales Manager','Sales Master Manager','System Manager'],
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
  },
];
