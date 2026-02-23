/**
 * Stock Card Table Component
 * Displays stock ledger entries with proper formatting and color coding
 * 
 * Requirements: 1.1, 1.2, 2.6
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { StockCardTableProps, StockLedgerEntry } from '@/types/stock-card';
import { formatStockCardDate, classifyTransactionDirection, getPartyInfo } from '@/lib/stock-card-utils';

/**
 * Get the URL for a source document based on voucher type
 */
function getVoucherUrl(voucherType: string, voucherNo: string): string {
  const typeMap: Record<string, string> = {
    'Sales Invoice': '/invoice',
    'Purchase Receipt': '/purchase-receipt',
    'Delivery Note': '/delivery-note',
    'Stock Entry': '/stock-entry',
    'Stock Reconciliation': '/stock-reconciliation'
  };
  
  const basePath = typeMap[voucherType] || '/';
  return `${basePath}?name=${encodeURIComponent(voucherNo)}`;
}

/**
 * Format transaction type to Indonesian
 */
function formatTransactionType(voucherType: string): string {
  const typeMap: Record<string, string> = {
    'Sales Invoice': 'Faktur Penjualan',
    'Purchase Receipt': 'Penerimaan Pembelian',
    'Delivery Note': 'Surat Jalan',
    'Stock Entry': 'Entri Stok',
    'Stock Reconciliation': 'Rekonsiliasi Stok'
  };
  
  return typeMap[voucherType] || voucherType;
}

/**
 * Get source/destination warehouse information
 */
function getWarehouseInfo(entry: StockLedgerEntry): string {
  const direction = classifyTransactionDirection(entry.actual_qty);
  
  // For stock transfers, show source or target warehouse
  if (entry.voucher_type === 'Stock Entry') {
    if (direction === 'in' && entry.source_warehouse) {
      return `Dari: ${entry.source_warehouse}`;
    }
    if (direction === 'out' && entry.target_warehouse) {
      return `Ke: ${entry.target_warehouse}`;
    }
  }
  
  return '-';
}

/**
 * Format quantity with thousand separators
 */
function formatQuantity(qty: number): string {
  return Math.abs(qty).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export default function StockCardTable({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange
}: StockCardTableProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Transaksi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Referensi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Masuk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Keluar</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gudang</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pihak</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sumber/Tujuan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Tidak ada transaksi untuk filter yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      {/* Desktop Table View */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jenis Transaksi
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No. Referensi
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Masuk
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keluar
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gudang
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pihak
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sumber/Tujuan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((entry) => {
              const direction = classifyTransactionDirection(entry.actual_qty);
              const partyInfo = getPartyInfo(entry);
              const warehouseInfo = getWarehouseInfo(entry);
              
              return (
                <tr key={entry.name} className="hover:bg-gray-50 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatStockCardDate(entry.posting_date, entry.posting_time)}
                  </td>
                  
                  {/* Transaction Type */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatTransactionType(entry.voucher_type)}
                  </td>
                  
                  {/* Reference Number (Clickable) */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={getVoucherUrl(entry.voucher_type, entry.voucher_no)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                    >
                      {entry.voucher_no}
                    </Link>
                  </td>
                  
                  {/* In (Masuk) - Green for incoming */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {direction === 'in' ? (
                      <span className="font-medium text-green-600">
                        {formatQuantity(entry.actual_qty)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  {/* Out (Keluar) - Red for outgoing */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {direction === 'out' ? (
                      <span className="font-medium text-red-600">
                        {formatQuantity(entry.actual_qty)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  {/* Balance (Saldo) */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatQuantity(entry.qty_after_transaction)}
                  </td>
                  
                  {/* Warehouse */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.warehouse}
                  </td>
                  
                  {/* Party */}
                  <td className="px-4 py-3 text-sm">
                    {partyInfo.party_name ? (
                      <div>
                        <div className="text-gray-900">{partyInfo.party_name}</div>
                        <div className="text-xs text-gray-500">
                          {partyInfo.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  {/* Source/Destination */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {warehouseInfo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          {/* Mobile View */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Page info */}
            <div className="text-sm text-gray-700 text-center">
              Halaman {pagination.current_page} dari {pagination.total_pages} ({pagination.total_records} total transaksi)
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => onPageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => onPageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Selanjutnya
              </button>
            </div>
            
            {/* Page size selector */}
            <div className="flex items-center justify-center gap-2">
              <label htmlFor="mobile-page-size" className="text-sm text-gray-700">
                Item per halaman:
              </label>
              <select
                id="mobile-page-size"
                value={pagination.page_size}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            {/* Left side: Page info and size selector */}
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Halaman <span className="font-medium">{pagination.current_page}</span> dari{' '}
                <span className="font-medium">{pagination.total_pages}</span> ({pagination.total_records} total transaksi)
              </p>
              
              <div className="flex items-center gap-2">
                <label htmlFor="desktop-page-size" className="text-sm text-gray-700">
                  Item per halaman:
                </label>
                <select
                  id="desktop-page-size"
                  value={pagination.page_size}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right side: Navigation */}
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Halaman sebelumnya"
                >
                  <span className="sr-only">Sebelumnya</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum: number;
                  
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.current_page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.current_page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.current_page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.current_page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                      aria-label={`Halaman ${pageNum}`}
                      aria-current={pageNum === pagination.current_page ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Halaman selanjutnya"
                >
                  <span className="sr-only">Selanjutnya</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
