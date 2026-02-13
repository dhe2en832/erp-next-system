'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDate, parseDate } from '../utils/format';
import { Calendar } from 'lucide-react';

interface HybridDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function HybridDatePicker({ value, onChange, placeholder = "DD/MM/YYYY", className = "" }: HybridDatePickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
    // Convert DD/MM/YYYY to a display format that matches the date picker
    if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const parsed = parseDate(value);
      if (parsed) {
        // For display, we'll keep DD/MM/YYYY
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers and slashes, and basic DD/MM/YYYY format
    if (newValue === '' || /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/.test(newValue)) {
      setInputValue(newValue);
      setDisplayValue(newValue);
      onChange(newValue);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // This is in YYYY-MM-DD format from browser
    if (dateValue) {
      // Convert from YYYY-MM-DD to DD/MM/YYYY for display
      const [year, month, day] = dateValue.split('-');
      const formattedValue = `${day}/${month}/${year}`;
      setInputValue(formattedValue);
      setDisplayValue(formattedValue);
      onChange(formattedValue);
    } else {
      setInputValue('');
      setDisplayValue('');
      onChange('');
    }
  };

  const handleIconClick = () => {
    // Focus the hidden date input to trigger the browser date picker
    dateInputRef.current?.focus();
    dateInputRef.current?.click();
  };

  const handleInputFocus = () => {
    // When user focuses on text input, also focus the date input
    // This ensures tab order works correctly
    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 0);
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for the hidden date input
  const getDateInputValue = () => {
    if (!inputValue) return '';
    const parsed = parseDate(inputValue);
    return parsed || '';
  };

  return (
    <div className="relative">
      {/* Text input for DD/MM/YYYY display */}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={`${className} pr-10`}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
      />
      
      {/* Hidden date input that triggers browser date picker */}
      <input
        ref={dateInputRef}
        type="date"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={getDateInputValue()}
        onChange={handleDateChange}
      />
      
      {/* Calendar icon */}
      <button
        type="button"
        onClick={handleIconClick}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  );
}
