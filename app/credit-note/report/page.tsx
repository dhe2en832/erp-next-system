'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CreditNote, CreditNoteReturnReason } from '@/types/credit-note';

export const dynamic = 'force-dynamic';

interface ReportFilters {
  from_date: string; // DD/MM/YYYY
  to_date: string; // DD/MM/YYYY
  customer: string;
  return_reason: CreditNoteReturnReason | '';
}

interface ReportSummary {
  total_count: number;
  total_amount: number;
  breakdown_by_reason: Record<string, { count: number; amount: number }>;
}

// Hook: Deteksi mobile (breakpoint 768px)
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

export default function CreditNoteReportPage() {
  const isMobile = useIsMobile(768);
  
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'customer' | 'reason'>('none');
  
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => 
      `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    return {
      from_date: formatDate(firstDay),
      to_date: formatDate(today),
      customer: '',
      return_reason: ''
    };
  });

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        limit_page_length: '1000', // Get all for report
        start: '0'
      });
      
      // Convert DD/MM/YYYY to YYYY-MM-DD for API
      if (filters.from_date) {
        const [day, month, year] = filters.from_date.split('/');
        params.append('from_date', `${year}-${month}-${day}`);
      }
      if (filters.to_date) {
        const [day, month, year] = filters.to_date.split('/');
        params.append('to_date', `${year}-${month}-${day}`);
      }
      if (filters.customer) {
        params.append('search', filters.customer);
      }
      
      const response = await fetch(`/api/sales/credit-note?${params}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        let data = result.data || [];
        
        // Filter by return_reason if specified (client-side filter)
        if (filters.return_reason) {
          data = data.filter((cn: CreditNote) => 
            cn.items.some(item => item.return_reason === filters.return_reason)
          );
        }
        
        setCreditNotes(data);
      } else {
        setError(result.message || 'Gagal memuat data Credit Note');
      }
    } catch (err) {
      console.error('Error fetching credit notes:', err);
      setError('Gagal memuat data Credit Note');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, filters]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany, fetchData]);

  // Calculate summary
  const summary: ReportSummary = useMemo(() => {
    const breakdown: Record<string, { count: number; amount: number }> = {};
    
    creditNotes.forEach(cn => {
      cn.items.forEach(item => {
        const reason = item.return_reason || 'Unknown';
        if (!breakdown[reason]) {
          breakdown[reason] = { count: 0, amount: 0 };
        }
        breakdown[reason].count += 1;
        breakdown[reason].amount += Math.abs(item.amount);
      });
    });
    
    return {
      total_count: creditNotes.length,
      total_amount: creditNotes.reduce((sum, cn) => sum + Math.abs(cn.grand_total), 0),
      breakdown_by_reason: breakdown
    };
  }, [creditNotes]);

  // Group data for display
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Semua Credit Note', items: creditNotes }];
    }
    
    if (groupBy === 'customer') {
      const groups: Record<string, CreditNote[]> = {};
      creditNotes.forEach(cn => {
        const key = cn.customer_name || cn.customer;
        if (!groups[key]) groups[key] = [];
        groups[key].push(cn);
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }
    
    if (groupBy === 'reason') {
      const groups: Record<string, CreditNote[]> = {};
      creditNotes.forEach(cn => {
        cn.items.forEach(item => {
          const key = item.return_reason || 'Unknown';
          if (!groups[key]) groups[key] = [];
          if (!groups[key].includes(cn)) groups[key].push(cn);
        });
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }
    
    return [];
  }, [creditNotes, groupBy]);

  const handleExportExcel = () => {
    if (creditNotes.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Laporan Credit Note'],
      ['Periode', `${filters.from_date} s/d ${filters.to_date}`],
      ['Company', selectedCompany],
      [''],
      ['RINGKASAN'],
      ['Total Credit Note', summary.total_count],
      ['Total Nilai', summary.total_amount],
      [''],
      ['Breakdown by Return Reason'],
      ['Alasan', 'Jumlah', 'Total Nilai']
    ];
    
    Object.entries(summary.breakdown_by_reason).forEach(([reason, data]) => {
      summaryData.push([reason, data.count, data.amount]);
    });
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
    
    // Detail sheet
    const detailData = creditNotes.map(cn => ({
      'No. Credit Note': cn.name,
      'Tanggal': cn.posting_date,
      'Customer': cn.customer_name || cn.customer,
      'Sales Invoice Asli': cn.return_against,
      'Status': cn.status,
      'Total Nilai': Math.abs(cn.grand_total),
      'Total Komisi': Math.abs(cn.custom_total_komisi_sales || 0)
    }));
    
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail');
    
    // Items sheet
    const itemsData: any[] = [];
    creditNotes.forEach(cn => {
      cn.items.forEach(item => {
        itemsData.push({
          'No. Credit Note': cn.name,
          'Customer': cn.customer_name || cn.customer,
          'Item Code': item.item_code,
          'Item Name': item.item_name,
          'Qty': Math.abs(item.qty),
          'Rate': item.rate,
          'Amount': Math.abs(item.amount),
          'Return Reason': item.return_reason,
          'Notes': item.return_item_notes || ''
        });
      });
    });
    
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Items');
    
    // Generate filename
    const filename = `Credit_Note_Report_${filters.from_date.replace(/\//g, '')}_${filters.to_date.replace(/\//g, '')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner message="Memuat laporan Credit Note..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-start mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Credit Note</h1>
          <p className="text-sm text-gray-500">Analisis retur penjualan yang sudah dibayar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={creditNotes.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={creditNotes.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm no-print">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 no-print">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Laporan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="text"
              value={filters.from_date}
              onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
              placeholder="DD/MM/YYYY"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="text"
              value={filters.to_date}
              onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
              placeholder="DD/MM/YYYY"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input
              type="text"
              value={filters.customer}
              onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              placeholder="Nama customer..."
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Retur</label>
            <select
              value={filters.return_reason}
              onChange={(e) => setFilters(prev => ({ ...prev, return_reason: e.target.value as any }))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Semua</option>
              <option value="Damaged">Damaged</option>
              <option value="Quality Issue">Quality Issue</option>
              <option value="Wrong Item">Wrong Item</option>
              <option value="Customer Request">Customer Request</option>
              <option value="Expired">Expired</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="none">Tidak ada grouping</option>
              <option value="customer">Group by Customer</option>
              <option value="reason">Group by Return Reason</option>
            </select>
          </div>
          <button
            onClick={fetchData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Print Area */}
      <div className="print-area">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-600 font-medium">Total Credit Note</p>
            <p className="text-2xl font-bold text-indigo-900">{summary.total_count}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Total Nilai Retur</p>
            <p className="text-2xl font-bold text-red-900">
              Rp {summary.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">Rata-rata per Credit Note</p>
            <p className="text-2xl font-bold text-yellow-900">
              Rp {summary.total_count > 0 ? Math.round(summary.total_amount / summary.total_count).toLocaleString('id-ID') : '0'}
            </p>
          </div>
        </div>

        {/* Breakdown by Reason */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Breakdown by Return Reason</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Nilai</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Persentase</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(summary.breakdown_by_reason).map(([reason, data]) => (
                  <tr key={reason}>
                    <td className="px-4 py-3 text-sm text-gray-900">{reason}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{data.count}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      Rp {data.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {summary.total_amount > 0 ? ((data.amount / summary.total_amount) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Detail Credit Note</h3>
          </div>
          
          {groupedData.map(group => (
            <div key={group.key} className="mb-4">
              {groupBy !== 'none' && (
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">{group.label}</h4>
                </div>
              )}
              
              {!isMobile ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Credit Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Tidak ada data Credit Note
                        </td>
                      </tr>
                    ) : (
                      group.items.map((cn) => (
                        <tr key={cn.name} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-indigo-600">{cn.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{cn.posting_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{cn.customer_name || cn.customer}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{cn.return_against}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              cn.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                              cn.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {cn.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                            Rp {Math.abs(cn.grand_total).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="divide-y divide-gray-200">
                  {group.items.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data Credit Note
                    </div>
                  ) : (
                    group.items.map((cn) => (
                      <div key={cn.name} className="px-4 py-4 hover:bg-gray-50">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-indigo-600 truncate">{cn.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">📅 {cn.posting_date}</p>
                            </div>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              cn.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                              cn.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {cn.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-700 truncate" title={cn.customer_name || cn.customer}>
                            👤 {cn.customer_name || cn.customer}
                          </div>
                          
                          <div className="text-sm text-gray-700 truncate" title={cn.return_against}>
                            📄 {cn.return_against}
                          </div>
                          
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="text-base font-bold text-red-600">
                              Rp {Math.abs(cn.grand_total).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Print Footer */}
        <div className="mt-6 text-xs text-gray-500 text-center hidden print:block">
          Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}
