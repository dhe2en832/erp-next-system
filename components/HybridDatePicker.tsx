'use client';

import { useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { parseDate } from '../utils/format';

interface HybridDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function HybridDatePicker({ value, onChange, placeholder = "DD/MM/YYYY", className = "" }: HybridDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers and slashes, and basic DD/MM/YYYY format
    if (newValue === '' || /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // This is in YYYY-MM-DD format from browser
    if (dateValue) {
      // Convert from YYYY-MM-DD to DD/MM/YYYY for display
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
      dateInputRef.current?.focus();
    }
  };

  // Derived internal value for the HTML date input (YYYY-MM-DD format)
  const internalDateValue = useMemo(() => {
    if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return parseDate(value) || '';
    }
    return '';
  }, [value]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full pl-3 pr-10 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div 
        className="absolute right-3 cursor-pointer text-gray-400 hover:text-indigo-500"
        onClick={handleIconClick}
      >
        <Calendar size={18} />
      </div>
      <input
        ref={dateInputRef}
        type="date"
        value={internalDateValue}
        onChange={handleDateChange}
        className="absolute right-3 opacity-0 w-6 h-6 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
