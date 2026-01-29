'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CommissionDashboard from '../../components/CommissionDashboard';

export default function CommissionPage() {
  // Get company from localStorage on initial render
  const getInitialCompany = () => {
    if (typeof window !== 'undefined') {
      let savedCompany = localStorage.getItem('selected_company');
      
      if (!savedCompany) {
        // Fallback to cookie if localStorage is empty
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          savedCompany = companyCookie.split('=')[1];
          // Store in localStorage for future use
          if (savedCompany) {
            localStorage.setItem('selected_company', savedCompany);
          }
        }
      }
      
      return savedCompany;
    }
    return null;
  };

  const [selectedCompany] = useState<string | null>(getInitialCompany());
  const router = useRouter();

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">No Company Selected</h3>
          <p className="text-yellow-600 mt-2">Please select a company first to view commission dashboard.</p>
          <button
            onClick={() => router.push('/select-company')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Select Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Commission Dashboard</h1>
        <p className="text-gray-600">Track and manage sales commissions for your team</p>
      </div>

      <CommissionDashboard />
    </div>
  );
}
