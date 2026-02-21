'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ClosingSummaryReport from '../../components/ClosingSummaryReport';
import type { ClosingSummaryResponse } from '../../../../types/accounting-period';

export default function ClosingSummaryReportPage() {
  const router = useRouter();
  const params = useParams();
  const periodName = params.name as string;

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .print\\:hidden { display: none !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        @page { margin: 1cm; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [data, setData] = useState<ClosingSummaryResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (periodName) {
      fetchClosingSummary();
    }
  }, [periodName]);

  const fetchClosingSummary = async () => {
    setLoading(true);
    setError('');
    try {
      // First, get the period to know the company
      const periodResponse = await fetch(
        `/api/accounting-period/periods/${encodeURIComponent(periodName)}`,
        { credentials: 'include' }
      );
      const periodData = await periodResponse.json();

      if (!periodData.success) {
        setError(periodData.message || 'Gagal memuat periode');
        return;
      }

      const company = periodData.data.company;

      // Then fetch the closing summary
      const response = await fetch(
        `/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(periodName)}&company=${encodeURIComponent(company)}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Gagal memuat laporan penutupan');
      }
    } catch (err) {
      console.error('Error fetching closing summary:', err);
      setError('Gagal memuat laporan penutupan');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!data) return;

    setExporting(format);
    try {
      const response = await fetch(
        `/api/accounting-period/reports/closing-summary?period_name=${encodeURIComponent(periodName)}&company=${encodeURIComponent(data.period.company)}&format=${format}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        const url = format === 'pdf' ? result.pdf_url : result.excel_url;
        if (url) {
          window.open(url, '_blank');
        } else {
          alert(`Export ${format.toUpperCase()} akan segera tersedia`);
        }
      } else {
        alert(`Gagal export ke ${format.toUpperCase()}: ${result.message}`);
      }
    } catch (err) {
      console.error(`Error exporting to ${format}:`, err);
      alert(`Gagal export ke ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Memuat laporan penutupan..." />;
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Laporan tidak ditemukan'}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          ← Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header - Hidden when printing */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900 mb-2 text-sm"
        >
          ← Kembali
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Ringkasan Penutupan</h1>
            <p className="text-sm text-gray-500 mt-1">{data.period.period_name}</p>
          </div>
        </div>
      </div>

      {/* Report Component */}
      <ClosingSummaryReport
        data={data}
        showActions={true}
        onPrint={handlePrint}
        onExportPDF={() => handleExport('pdf')}
        onExportExcel={() => handleExport('excel')}
      />
    </div>
  );
}
