'use client';

import { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  min = 0,
  max,
  step = '1',
  required = false,
  disabled = false
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number to Indonesian currency display
  const formatToCurrency = (num: number): string => {
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('id-ID');
  };

  // Parse currency display back to number
  const parseFromCurrency = (str: string): number => {
    // Remove all non-digit characters except decimal separator
    const cleanStr = str.replace(/[^\d,]/g, '');
    // Replace comma with dot for decimal parsing
    const normalizedStr = cleanStr.replace(/,/g, '.');
    const parsed = parseFloat(normalizedStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Update display when value prop changes
  useEffect(() => {
    setDisplayValue(formatToCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow only digits and comma
    const sanitizedValue = newValue.replace(/[^\d,]/g, '');
    
    // Parse and validate
    const parsedValue = parseFromCurrency(sanitizedValue);
    
    // Apply max validation if provided
    if (max !== undefined && parsedValue > max) {
      onChange(max);
      return;
    }
    
    // Update display
    setDisplayValue(sanitizedValue);
    
    // Parse and call onChange
    onChange(parsedValue);
  };

  const handleBlur = () => {
    // Format to value on blur
    setDisplayValue(formatToCurrency(value));
  };

  const handleFocus = () => {
    // Show raw number on focus
    setDisplayValue(value.toString());
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      min={min}
      step={step}
      required={required}
      disabled={disabled}
    />
  );
}
