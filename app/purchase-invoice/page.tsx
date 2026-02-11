'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PurchaseInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in and has company selected
    const checkAuthAndCompany = () => {
      let savedCompany = localStorage.getItem('selected_company');
      
      if (!savedCompany) {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          savedCompany = companyCookie.split('=')[1];
        }
      }
      
      setLoading(false);
      
      // If no company selected, redirect to company selection
      if (!savedCompany) {
        router.push('/select-company');
        return;
      }
    };

    checkAuthAndCompany();
  }, [router]);

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Invoice</h1>
              <p className="mt-1 text-sm text-gray-600">Manage Purchase Invoices</p>
            </div>
            <button
              onClick={() => router.push('/purchase-invoice/piMain')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Purchase Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Redirect to List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to Purchase Invoice list...</p>
          </div>
        </div>
      </div>

      {/* Auto redirect to list */}
      {typeof window !== 'undefined' && setTimeout(() => {
        router.push('/purchase-invoice/piList');
      }, 1000)}
    </div>
  );
}
