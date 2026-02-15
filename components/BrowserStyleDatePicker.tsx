'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDate, parseDate } from '../utils/format';
import { Calendar, X } from 'lucide-react';

interface BrowserStyleDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function BrowserStyleDatePicker({ 
  value, 
  onChange, 
  placeholder = "DD/MM/YYYY", 
  className = "" 
}: BrowserStyleDatePickerProps) {
  const [internalValue, setInternalValue] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    console.log('[DEBUG DatePicker] value prop:', value);
    if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const parsed = parseDate(value);
      console.log('[DEBUG DatePicker] parsed:', parsed);
      setInternalValue(parsed || '');
    } else if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Already YYYY-MM-DD, use directly
      console.log('[DEBUG DatePicker] already YYYY-MM-DD:', value);
      setInternalValue(value);
    } else {
      console.log('[DEBUG DatePicker] invalid format, clearing');
      setInternalValue('');
    }
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // YYYY-MM-DD from browser
    
    if (dateValue) {
      // Parse the YYYY-MM-DD from browser and convert to DD/MM/YYYY
      const [year, month, day] = dateValue.split('-');
      const formattedValue = `${day}/${month}/${year}`;
      onChange(formattedValue);
    } else {
      onChange('');
    }
  };

  const handleIconClick = () => {
    // Trigger the browser date picker
    try {
      dateInputRef.current?.showPicker?.();
    } catch {
      // Fallback: showPicker may fail in cross-origin iframes
      dateInputRef.current?.focus();
    }
    if (!dateInputRef.current?.showPicker) {
      // Fallback for browsers that don't support showPicker
      dateInputRef.current?.focus();
    }
  };

  const handleClearClick = () => {
    onChange('');
    setInternalValue('');
  };

  // Format the display value (DD/MM/YYYY)
  const getDisplayValue = () => {
    if (!value) return '';
    // Validate DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }
    // Convert YYYY-MM-DD to DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return '';
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Hidden date input that uses browser's date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={internalValue}
        onChange={handleDateChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
        style={{ zIndex: 10 }}
      />
      
      {/* Visual input showing DD/MM/YYYY format */}
      <div className="relative">
        <input
          type="text"
          value={getDisplayValue()}
          placeholder={placeholder}
          className={`${className} pr-16`}
          readOnly={false}
          onChange={(e) => {
            const newValue = e.target.value;
            // Only allow numbers and slashes, and basic DD/MM/YYYY format
            if (newValue === '' || /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/.test(newValue)) {
              // If complete DD/MM/YYYY format, update the value
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(newValue)) {
                onChange(newValue);
              }
            }
          }}
          onClick={handleIconClick}
        />
        
        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClearClick}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-20"
            title="Clear date"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* Calendar icon */}
        <button
          type="button"
          onClick={handleIconClick}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-20"
          title="Select date"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
