'use client';

import { useState, useEffect } from 'react';

interface Company {
  name: string;
  company_name: string;
  country: string;
  abbr: string;
}

interface CompanySelectorProps {
  onCompanyChange?: (company: Company) => void;
}

export default function CompanySelector({ onCompanyChange }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/finance/company');
      const data = await response.json();

      if (data.success) {
        setCompanies(data.data);
        if (data.data.length > 0) {
          const firstCompany = data.data[0];
          setSelectedCompany(firstCompany);
          onCompanyChange?.(firstCompany);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyName: string) => {
    const company = companies.find(c => c.name === companyName);
    if (company) {
      setSelectedCompany(company);
      onCompanyChange?.(company);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-600 text-sm">No companies available</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Company/Entity</h3>
        <span className="text-xs text-gray-500">Current Session</span>
      </div>
      
      <select
        value={selectedCompany?.name || ''}
        onChange={(e) => handleCompanyChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        {companies.map((company) => (
          <option key={company.name} value={company.name}>
            {company.company_name}
          </option>
        ))}
      </select>

      {selectedCompany && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Country: {selectedCompany.country}</span>
            <span>Abbr: {selectedCompany.abbr}</span>
          </div>
        </div>
      )}
    </div>
  );
}
