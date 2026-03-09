'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DebitNote, DebitNoteReturnReason } from '@/types/debit-note';

export const dynamic = 'force-dynamic';

interface ReportFilters {
  from_date: string; // DD/MM/YYYY
  to_date: string; // DD/MM/YYYY
  supplier: string;
  return_reason: DebitNoteReturnReason | '';
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

export default function DebitNoteReportPage() {
  const isMobile = useIsMobile(768);
  
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'supplier' | 'reason'>('none');
  
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date: Date) => 
      `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    return {
      from_date: formatDate(firstDay),
      to_date: formatDate(today),
      supplier: '',
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
      if (filters.supplier) {
        params.append('search', filters.supplier);
      }
      
      const response = await fetch(`/api/purchase/debit-note?${params}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        let data = result.data || [];
        
        // Filter by return_reason if specified (client-side filter)
        if (filters.return_reason) {
          data = data.filter((dn: DebitNote) => 
            dn.items.some(item => item.custom_return_reason === filters.return_reason)
          );
        }
        
        setDebitNotes(data);
      } else {
        setError(result.message || 'Gagal memuat data Debit Memo');
      }
    } catch (err) {
      console.error('Error fetching debit notes:', err);
      setError('Gagal memuat data Debit Memo');
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
    
    debitNotes.forEach(dn => {
      dn.items.forEach(item => {
        const reason = item.custom_return_reason || 'Unknown';
        if (!breakdown[reason]) {
          breakdown[reason] = { count: 0, amount: 0 };
        }
        breakdown[reason].count += 1;
        breakdown[reason].amount += Math.abs(item.amount);
      });
    });
    
    return {
      total_count: debitNotes.length,
      total_amount: debitNotes.reduce((sum, dn) => sum + Math.abs(dn.grand_total), 0),
      breakdown_by_reason: breakdown
    };
  }, [debitNotes]);

  // Group data for display
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Semua Debit Memo', items: debitNotes }];
    }
    
    if (groupBy === 'supplier') {
      const groups: Record<string, DebitNote[]> = {};
      debitNotes.forEach(dn => {
        const key = dn.supplier_name || dn.supplier;
        if (!groups[key]) groups[key] = [];
        groups[key].push(dn);
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }
    
    if (groupBy === 'reason') {
      const groups: Record<string, DebitNote[]> = {};
      debitNotes.forEach(dn => {
        dn.items.forEach(item => {
          const key = item.custom_return_reason || 'Unknown';
          if (!groups[key]) groups[key] = [];
          if (!groups[key].includes(dn)) groups[key].push(dn);
        });
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }
    
    return [];
  }, [debitNotes, groupBy]);

  const handleExportExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Ringkasan (Summary)
    const summaryData = [
      ['Laporan Debit Memo'],
      [''],
      ['Periode:', `${filters.from_date} - ${filters.to_date}`],
      ['Perusahaan:', selectedCompany],
      [''],
      ['Ringkasan'],
      ['Total Debit Memo:', summary.total_count],
      ['Total Nilai Retur:', `Rp ${summary.total_amount.toLocaleString('id-ID')}`],
      ['Rata-rata per Debit Memo:', `Rp ${summary.total_count > 0 ? Math.round(summary.total_amount / summary.total_count).toLocaleString('id-ID') : '0'}`],
      [''],
      ['Breakdown by Return Reason'],
      ['Alasan', 'Jumlah Item', 'Total Nilai', 'Persentase'],
      ...Object.entries(summary.breakdown_by_reason).map(([reason, data]) => [
        reason,
        data.count,
        `Rp ${data.amount.toLocaleString('id-ID')}`,
        `${summary.total_amount > 0 ? ((data.amount / summary.total_amount) * 100).toFixed(1) : '0'}%`
      ])
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    
    // Sheet 2: Detail (Documents)
    const detailData = [
      ['Document Number', 'Date', 'Supplier', 'Purchase Invoice', 'Status', 'Total'],
      ...debitNotes.map(dn => [
        dn.name,
        dn.posting_date,
        dn.supplier_name || dn.supplier,
        dn.return_against,
        dn.status,
        Math.abs(dn.grand_total)
      ])
    ];
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail');
    
    // Sheet 3: Items (Line Items)
    const itemsData = [
      ['Document Number', 'Supplier', 'Item Code', 'Item Name', 'Qty', 'Rate', 'Amount', 'Return Reason', 'Notes'],
      ...debitNotes.flatMap(dn => 
        dn.items.map(item => [
          dn.name,
          dn.supplier_name || dn.supplier,
          item.item_code,
          item.item_name,
          item.qty,
          item.rate,
          Math.abs(item.amount),
          item.custom_return_reason || '',
          item.custom_return_item_notes || ''
        ])
      )
    ];
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');
    
    // Generate filename: Debit_Note_Report_[from_date]_[to_date].xlsx
    const fromDateClean = filters.from_date.replace(/\//g, '');
    const toDateClean = filters.to_date.replace(/\//g, '');
    const filename = `Debit_Note_Report_${fromDateClean}_${toDateClean}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  }, [debitNotes, summary, filters, selectedCompany]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) return <LoadingSpinner message="Memuat laporan Debit Memo..." />;

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
          <h1 className="text-2xl font-bold text-gray-900">Laporan Debit Memo</h1>
          <p className="text-sm text-gray-500">Analisis retur pembelian (Purchase Invoice)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={debitNotes.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={debitNotes.length === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={filters.supplier}
              onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="Nama supplier..."
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
              <option value="supplier">Group by Supplier</option>
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
            <p className="text-sm text-indigo-600 font-medium">Total Debit Memo</p>
            <p className="text-2xl font-bold text-indigo-900">{summary.total_count}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Total Nilai Retur</p>
            <p className="text-2xl font-bold text-red-900">
              Rp {summary.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">Rata-rata per Debit Memo</p>
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
            <h3 className="text-sm font-medium text-gray-900">Detail Debit Memo</h3>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Debit Memo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Invoice Asli</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      group.items.map((dn) => (
                        <tr key={dn.name} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-indigo-600">{dn.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{dn.posting_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{dn.supplier_name || dn.supplier}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{dn.return_against}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              dn.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                              dn.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {dn.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                            Rp {Math.abs(dn.grand_total).toLocaleString('id-ID')}
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
                      Tidak ada data
                    </div>
                  ) : (
                    group.items.map((dn) => (
                      <div key={dn.name} className="px-4 py-4 hover:bg-gray-50">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-indigo-600 truncate">{dn.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">📅 {dn.posting_date}</p>
                            </div>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              dn.status === 'Submitted' ? 'bg-green-100 text-green-800' :
                              dn.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {dn.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-700 truncate" title={dn.supplier_name || dn.supplier}>
                            👤 {dn.supplier_name || dn.supplier}
                          </div>
                          
                          <div className="text-sm text-gray-700 truncate" title={dn.return_against}>
                            📄 {dn.return_against}
                          </div>
                          
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="text-base font-bold text-red-600">
                              Rp {Math.abs(dn.grand_total).toLocaleString('id-ID')}
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
