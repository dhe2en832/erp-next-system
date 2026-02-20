'use client';

import React, { useMemo } from 'react';

export interface InvoiceItem {
  qty: number;
  rate: number;
  amount?: number;
}

export interface TaxRow {
  charge_type: string;
  account_head: string;
  description?: string;
  rate: number;
  tax_amount?: number;
  add_deduct_tax?: 'Add' | 'Deduct';
}

export interface InvoiceSummaryProps {
  items: InvoiceItem[];
  discountAmount?: number;
  discountPercentage?: number;
  taxes?: TaxRow[];
}

export default function InvoiceSummary({
  items = [],
  discountAmount = 0,
  discountPercentage = 0,
  taxes = []
}: InvoiceSummaryProps) {
  const calculations = useMemo(() => {
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
      const itemAmount = item.amount || (item.qty * item.rate);
      return sum + itemAmount;
    }, 0);

    // Calculate discount (use discountAmount if provided, otherwise calculate from percentage)
    const discount = discountAmount > 0 
      ? discountAmount 
      : (discountPercentage / 100) * subtotal;

    // Calculate net total after discount
    const netTotal = subtotal - discount;

    // Calculate taxes
    let runningTotal = netTotal;
    let totalTaxAmount = 0;
    
    const calculatedTaxes = taxes.map(tax => {
      let taxAmount = 0;

      if (tax.charge_type === 'On Net Total') {
        taxAmount = (tax.rate / 100) * netTotal;
      } else if (tax.charge_type === 'On Previous Row Total') {
        taxAmount = (tax.rate / 100) * runningTotal;
      } else if (tax.charge_type === 'Actual') {
        taxAmount = tax.tax_amount || 0;
      }

      // Handle add/deduct
      if (tax.add_deduct_tax === 'Deduct') {
        taxAmount = -Math.abs(taxAmount);
      }

      runningTotal += taxAmount;
      totalTaxAmount += taxAmount;

      return {
        ...tax,
        calculatedAmount: taxAmount
      };
    });

    // Calculate grand total
    const grandTotal = netTotal + totalTaxAmount;

    return {
      subtotal,
      discount,
      netTotal,
      calculatedTaxes,
      totalTaxAmount,
      grandTotal
    };
  }, [items, discountAmount, discountPercentage, taxes]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Ringkasan Invoice
      </h3>

      {/* Subtotal */}
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-sm text-gray-600">Subtotal</span>
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(calculations.subtotal)}
        </span>
      </div>

      {/* Discount */}
      {calculations.discount > 0 && (
        <>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">
              Diskon {discountPercentage > 0 ? `(${discountPercentage.toFixed(2)}%)` : ''}
            </span>
            <span className="text-sm font-medium text-red-600">
              - {formatCurrency(calculations.discount)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">
              Subtotal setelah Diskon
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(calculations.netTotal)}
            </span>
          </div>
        </>
      )}

      {/* Taxes */}
      {calculations.calculatedTaxes.length > 0 && (
        <div className="space-y-2 py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Pajak</p>
          {calculations.calculatedTaxes.map((tax, index) => (
            <div key={index} className="flex justify-between items-center pl-4">
              <span className="text-sm text-gray-600">
                {tax.description || tax.charge_type} ({tax.rate}%)
              </span>
              <span className={`text-sm font-medium ${
                tax.calculatedAmount < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {tax.calculatedAmount < 0 ? '- ' : ''}
                {formatCurrency(Math.abs(tax.calculatedAmount))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grand Total */}
      <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 mt-4">
        <span className="text-base font-bold text-gray-900">
          Grand Total
        </span>
        <span className="text-lg font-bold text-blue-600">
          {formatCurrency(calculations.grandTotal)}
        </span>
      </div>

      {/* Summary Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-500">
          Total item: {items.length} | 
          Total qty: {items.reduce((sum, item) => sum + item.qty, 0)}
        </p>
      </div>
    </div>
  );
}
