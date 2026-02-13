'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Company {
  name: string;
  company_name: string;
  country: string;
  abbr: string;
}

interface LoginData {
  full_name: string;
  companies: Company[];
  needs_company_selection: boolean;
}

export default function SelectCompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingCompany, setSettingCompany] = useState(false);
  const [error, setError] = useState('');
  const [loginData, setLoginData] = useState<LoginData | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get login data from localStorage
    const storedLoginData = localStorage.getItem('loginData');
    if (storedLoginData) {
      try {
        const data = JSON.parse(storedLoginData);
        setLoginData(data);
        setCompanies(data.companies || []);
      } catch (error) {
        console.error('Error parsing login data:', error);
        setError('Data login tidak valid');
      }
    } else {
      setError('Data login tidak ditemukan. Silakan login kembali.');
    }
    setLoading(false);
  }, []);

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setSettingCompany(true);
    setError('');

    try {
      console.log('Selecting company:', company);
      // Store selected company in localStorage
      localStorage.setItem('selected_company', company.name);
      console.log('Stored selected_company in localStorage:', company.name);

      // Also set as cookie for API calls
      document.cookie = `selected_company=${company.name}; path=/; max-age=86400`;
      console.log('Set cookie for company');

      // Redirect to dashboard or original URL
      const redirectUrl = '/dashboard';
      console.log('Redirecting to dashboard...');
      
      // Use window.location.href for full page refresh to ensure Navbar reads updated localStorage
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error selecting company:', error);
      setError('Gagal memilih perusahaan. Silakan coba lagi.');
    } finally {
      setSettingCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat perusahaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Pilih Perusahaan
          </h2>
          {loginData?.full_name && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Selamat datang, {loginData.full_name}!
            </p>
          )}
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan pilih perusahaan untuk melanjutkan
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada perusahaan ditemukan</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Kembali ke Login
              </button>
            </div>
          ) : (
            companies.map((company) => (
              <button
                key={company.name}
                onClick={() => handleCompanySelect(company)}
                disabled={settingCompany}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCompany?.name === company.name
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${
                  settingCompany ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {company.company_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {company.country}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-lg">
                        {company.abbr}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {companies.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              Kembali ke Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
