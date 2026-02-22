'use client';

import React, { useState, useEffect } from 'react';

export interface DiscountInputProps {
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  onChange: (data: { discountPercentage: number; discountAmount: number }) => void;
  type?: 'percentage' | 'amount';
  disabled?: boolean;
}

export default function DiscountInput({
  subtotal,
  discountPercentage = 0,
  discountAmount = 0,
  onChange,
  type = 'percentage',
  disabled = false
}: DiscountInputProps) {
  const [inputType, setInputType] = useState<'percentage' | 'amount'>(type);
  const [percentageValue, setPercentageValue] = useState<string>(discountPercentage.toString());
  const [amountValue, setAmountValue] = useState<string>(discountAmount.toString());
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setPercentageValue(discountPercentage.toString());
    setAmountValue(discountAmount.toString());
  }, [discountPercentage, discountAmount]);

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPercentageValue(value);
    setError('');

    const numValue = parseFloat(value) || 0;

    // Validasi
    if (numValue < 0) {
      setError('Persentase diskon tidak boleh negatif');
      return;
    }
    if (numValue > 100) {
      setError('Persentase diskon tidak boleh lebih dari 100%');
      return;
    }

    // Hitung discount amount
    const calculatedAmount = (numValue / 100) * subtotal;
    setAmountValue(calculatedAmount.toFixed(2));

    onChange({
      discountPercentage: numValue,
      discountAmount: calculatedAmount
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountValue(value);
    setError('');

    const numValue = parseFloat(value) || 0;

    // Validasi
    if (numValue < 0) {
      setError('Jumlah diskon tidak boleh negatif');
      return;
    }
    if (numValue > subtotal) {
      setError('Jumlah diskon tidak boleh melebihi subtotal');
      return;
    }

    // Hitung discount percentage
    const calculatedPercentage = subtotal > 0 ? (numValue / subtotal) * 100 : 0;
    setPercentageValue(calculatedPercentage.toFixed(2));

    onChange({
      discountPercentage: calculatedPercentage,
      discountAmount: numValue
    });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={inputType === 'percentage'}
            onChange={() => setInputType('percentage')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Persentase (%)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={inputType === 'amount'}
            onChange={() => setInputType('amount')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Jumlah (Rp)</span>
        </label>
      </div>

      {inputType === 'percentage' ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Diskon Persentase
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={percentageValue}
              onChange={handlePercentageChange}
              disabled={disabled}
              min="0"
              max="100"
              step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
          <p className="text-sm text-gray-500">
            Jumlah diskon: {formatCurrency(parseFloat(amountValue) || 0)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Diskon Jumlah
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rp</span>
            <input
              type="number"
              value={amountValue}
              onChange={handleAmountChange}
              disabled={disabled}
              min="0"
              max={subtotal}
              step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
          </div>
          <p className="text-sm text-gray-500">
            Persentase diskon: {parseFloat(percentageValue).toFixed(2)}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          Subtotal: {formatCurrency(subtotal)}
        </p>
        <p className="text-sm font-medium text-gray-900 mt-1">
          Subtotal setelah diskon: {formatCurrency(subtotal - (parseFloat(amountValue) || 0))}
        </p>
      </div>
    </div>
  );
}
