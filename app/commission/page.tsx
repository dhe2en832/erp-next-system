'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CommissionDashboard from '../../components/CommissionDashboard';

export default function CommissionPage() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let company = localStorage.getItem('selected_company');
    if (!company) {
      const companyCookie = document.cookie.split(';').find(c => c.trim().startsWith('selected_company='));
      if (companyCookie) {
        company = companyCookie.split('=')[1];
        if (company) localStorage.setItem('selected_company', company);
      }
    }
    setSelectedCompany(company);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800">Perusahaan Belum Dipilih</h3>
          <p className="text-yellow-600 mt-2">Silakan pilih perusahaan terlebih dahulu untuk melihat dasbor komisi.</p>
          <button
            onClick={() => router.push('/select-company')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pilih Perusahaan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dasbor Komisi Penjualan</h1>
        <p className="text-gray-600">Lacak dan kelola komisi penjualan tim Anda</p>
      </div>

      <CommissionDashboard />
    </div>
  );
}
