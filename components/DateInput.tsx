'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDate, parseDate } from '../utils/format';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function DateInput({ value, onChange, placeholder = "DD/MM/YYYY", className = "" }: DateInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers and slashes, and basic DD/MM/YYYY format
    if (newValue === '' || /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/.test(newValue)) {
      setInputValue(newValue);
      onChange(newValue);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      // Convert from YYYY-MM-DD to DD/MM/YYYY for display
      const [year, month, day] = dateValue.split('-');
      const formattedValue = `${day}/${month}/${year}`;
      setInputValue(formattedValue);
      onChange(formattedValue);
    } else {
      setInputValue('');
      onChange('');
    }
    setShowPicker(false);
  };

  const handleIconClick = () => {
    if (pickerRef.current) {
      pickerRef.current.showPicker?.();
    }
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for date input
  const getDateInputValue = () => {
    if (!inputValue) return '';
    const parsed = parseDate(inputValue);
    return parsed || '';
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={`${className} pr-10`}
        value={inputValue}
        onChange={handleInputChange}
      />
      <input
        ref={pickerRef}
        type="date"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={getDateInputValue()}
        onChange={handleDateChange}
      />
      <button
        type="button"
        onClick={handleIconClick}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 pointer-events-none"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  );
}
