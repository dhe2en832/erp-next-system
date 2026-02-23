'use client';

import React from 'react';
import { StockCardSummaryProps } from '@/types/stock-card';
import { TrendingUp, TrendingDown, Package, FileText } from 'lucide-react';

/**
 * StockCardSummary Component
 * 
 * Displays summary statistics for the Stock Card Report including:
 * - Opening Balance (Saldo Awal)
 * - Total In (Total Masuk) - with green color
 * - Total Out (Total Keluar) - with red color
 * - Closing Balance (Saldo Akhir)
 * - Transaction Count (Total Transaksi)
 * 
 * Requirements: 1.5, 1.6
 * 
 * @param props - StockCardSummaryProps containing balance and transaction data
 */
export default function StockCardSummary({
  openingBalance,
  closingBalance,
  totalIn,
  totalOut,
  transactionCount,
  itemName,
  uom
}: StockCardSummaryProps) {
  /**
   * Format number with Indonesian locale thousand separators
   * @param value - Number to format
   * @returns Formatted string with thousand separators
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  /**
   * Summary card data configuration
   */
  const summaryCards = [
    {
      label: 'Saldo Awal',
      value: openingBalance,
      icon: Package,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
      showUom: true
    },
    {
      label: 'Total Masuk',
      value: totalIn,
      icon: TrendingUp,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50',
      showUom: true
    },
    {
      label: 'Total Keluar',
      value: totalOut,
      icon: TrendingDown,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      showUom: true
    },
    {
      label: 'Saldo Akhir',
      value: closingBalance,
      icon: Package,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
      showUom: true
    },
    {
      label: 'Total Transaksi',
      value: transactionCount,
      icon: FileText,
      colorClass: 'text-gray-600',
      bgClass: 'bg-gray-50',
      showUom: false
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Ringkasan Kartu Stok
        </h3>
        {itemName && (
          <p className="text-sm text-gray-600 mt-1">
            Item: {itemName}
          </p>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Icon and Label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg ${card.bgClass}`}>
                  <Icon className={`w-5 h-5 ${card.colorClass}`} />
                </div>
              </div>

              {/* Value */}
              <div className="mt-2">
                <div className={`text-2xl font-bold ${card.colorClass}`}>
                  {card.showUom ? formatNumber(card.value) : card.value}
                </div>
                {card.showUom && uom && (
                  <div className="text-xs text-gray-500 mt-1">
                    {uom}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
