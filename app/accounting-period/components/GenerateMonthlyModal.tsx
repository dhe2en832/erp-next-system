'use client';

import { useState, useEffect } from 'react';

interface GenerateMonthlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GenerateMonthlyModal({ isOpen, onClose, onSuccess }: GenerateMonthlyModalProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchFiscalYears();
    }
  }, [isOpen]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/setup/companies', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data || []);
        if (data.data.length > 0) {
          setSelectedCompany(data.data[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchFiscalYears = async () => {
    try {
      const response = await fetch('/api/setup/fiscal-years', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setFiscalYears(data.data || []);
        if (data.data.length > 0) {
          setSelectedFiscalYear(data.data[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCompany || !selectedFiscalYear) {
      alert('Pilih company dan fiscal year terlebih dahulu');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/accounting-period/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company: selectedCompany,
          fiscal_year: selectedFiscalYear,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        if (data.data.summary.total_created > 0) {
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 3000);
        }
      } else {
        alert(`Gagal generate periode: ${data.message}`);
      }
    } catch (error) {
      console.error('Error generating periods:', error);
      alert('Gagal generate periode');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Generate Periode Bulanan</h2>
          <p className="text-sm text-gray-500 mt-1">
            Buat periode bulanan otomatis untuk satu tahun fiskal
          </p>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="">Pilih Company</option>
                  {companies.map((company) => (
                    <option key={company.name} value={company.name}>
                      {company.company_name || company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year
                </label>
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="">Pilih Fiscal Year</option>
                  {fiscalYears.map((fy) => (
                    <option key={fy.name} value={fy.name}>
                      {fy.year} ({new Date(fy.year_start_date).toLocaleDateString('id-ID')} - {new Date(fy.year_end_date).toLocaleDateString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Sistem akan membuat 12 periode bulanan otomatis berdasarkan fiscal year yang dipilih. 
                      Periode yang sudah ada akan dilewati.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Generate Berhasil!
                    </h3>
                    <div className="text-sm text-green-700 mt-2">
                      <p>✅ {result.summary.total_created} periode berhasil dibuat</p>
                      {result.summary.total_skipped > 0 && (
                        <p>⏭️ {result.summary.total_skipped} periode dilewati (sudah ada)</p>
                      )}
                      {result.summary.total_errors > 0 && (
                        <p>❌ {result.summary.total_errors} periode gagal dibuat</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {result.created.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Periode yang Dibuat:</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-3">
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.created.map((period: any, idx: number) => (
                        <li key={idx}>• {period.period_name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Periode yang Dilewati:</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-3">
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.skipped.map((item: any, idx: number) => (
                        <li key={idx}>• {item.period_name} ({item.reason})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            disabled={loading}
          >
            {result ? 'Tutup' : 'Batal'}
          </button>
          {!result && (
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedCompany || !selectedFiscalYear}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Periode'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
