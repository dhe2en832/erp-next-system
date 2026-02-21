'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import type { PeriodClosingLog } from '../../../types/accounting-period';

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<PeriodClosingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Snapshot viewer
  const [selectedLog, setSelectedLog] = useState<PeriodClosingLog | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (periodFilter) params.set('period_name', periodFilter);
      if (actionTypeFilter) params.set('action_type', actionTypeFilter);
      if (userFilter) params.set('action_by', userFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      params.set('limit', PAGE_SIZE.toString());
      params.set('start', ((currentPage - 1) * PAGE_SIZE).toString());

      const response = await fetch(`/api/accounting-period/audit-log?${params}`, { 
        credentials: 'include' 
      });
      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
        setTotalCount(data.total_count || 0);
      } else {
        setError(data.message || 'Gagal memuat audit log');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [periodFilter, actionTypeFilter, userFilter, fromDate, toDate, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, actionTypeFilter, userFilter, fromDate, toDate]);

  // Frontend search filter
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    
    const term = searchTerm.toLowerCase();
    return logs.filter(log => 
      log.accounting_period?.toLowerCase().includes(term) ||
      log.action_by?.toLowerCase().includes(term) ||
      log.reason?.toLowerCase().includes(term) ||
      log.affected_transaction?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const handleClearFilters = useCallback(() => {
    setPeriodFilter('');
    setActionTypeFilter('');
    setUserFilter('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleExportCSV = useCallback(() => {
    // Create CSV content
    const headers = ['Tanggal', 'Periode', 'Tipe Aksi', 'User', 'Alasan', 'Transaksi Terkait', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.action_date).toLocaleString('id-ID'),
      log.accounting_period,
      log.action_type,
      log.action_by,
      log.reason || '-',
      log.affected_transaction || '-',
      log.ip_address || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredLogs]);

  const handleViewSnapshot = (log: PeriodClosingLog) => {
    setSelectedLog(log);
    setShowSnapshotModal(true);
  };

  // Action type badge styling
  const getActionTypeBadge = (actionType: string) => {
    const badges = {
      'Created': 'bg-blue-100 text-blue-800 border-blue-200',
      'Closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Reopened': 'bg-green-100 text-green-800 border-green-200',
      'Permanently Closed': 'bg-red-100 text-red-800 border-red-200',
      'Transaction Modified': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return badges[actionType as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatActionType = (actionType: string) => {
    const translations = {
      'Created': 'Dibuat',
      'Closed': 'Ditutup',
      'Reopened': 'Dibuka Kembali',
      'Permanently Closed': 'Ditutup Permanen',
      'Transaction Modified': 'Transaksi Dimodifikasi'
    };
    return translations[actionType as keyof typeof translations] || actionType;
  };

  if (loading && logs.length === 0) {
    return <LoadingSpinner message="Memuat audit log..." />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">Riwayat aktivitas penutupan periode akuntansi</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input 
              type="text" 
              placeholder="Periode, user, alasan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
            <input 
              type="text" 
              placeholder="Nama periode..." 
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Aksi</label>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Semua Tipe</option>
              <option value="Created">Dibuat</option>
              <option value="Closed">Ditutup</option>
              <option value="Reopened">Dibuka Kembali</option>
              <option value="Permanently Closed">Ditutup Permanen</option>
              <option value="Transaction Modified">Transaksi Dimodifikasi</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <input 
              type="text" 
              placeholder="Email user..." 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <button 
            onClick={handleClearFilters}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors text-sm"
          >
            Hapus Filter
          </button>
          <button 
            onClick={fetchLogs}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-600 font-medium">Total Log Entries</p>
        <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal & Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe Aksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <LoadingSpinner message="Memuat data..." />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || periodFilter || actionTypeFilter || userFilter || fromDate || toDate
                      ? 'Tidak ada log yang cocok dengan filter' 
                      : 'Belum ada audit log'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(log.action_date).toLocaleDateString('id-ID')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.action_date).toLocaleTimeString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.accounting_period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionTypeBadge(log.action_type)}`}>
                        {formatActionType(log.action_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{log.action_by}</div>
                      {log.ip_address && (
                        <div className="text-xs text-gray-500">IP: {log.ip_address}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.reason && (
                        <div className="mb-1">
                          <span className="font-medium">Alasan:</span> {log.reason}
                        </div>
                      )}
                      {log.affected_transaction && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Transaksi:</span> {log.transaction_doctype} - {log.affected_transaction}
                        </div>
                      )}
                      {!log.reason && !log.affected_transaction && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(log.before_snapshot || log.after_snapshot) && (
                        <button
                          onClick={() => handleViewSnapshot(log)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Lihat Snapshot
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / PAGE_SIZE)}
          totalRecords={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Snapshot Modal */}
      {showSnapshotModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Snapshot Data</h2>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Periode:</span> {selectedLog.accounting_period}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Aksi:</span> {formatActionType(selectedLog.action_type)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tanggal:</span> {new Date(selectedLog.action_date).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Snapshot */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sebelum</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96">
                    {selectedLog.before_snapshot ? (
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedLog.before_snapshot), null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-400 text-sm">Tidak ada data</p>
                    )}
                  </div>
                </div>

                {/* After Snapshot */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sesudah</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96">
                    {selectedLog.after_snapshot ? (
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedLog.after_snapshot), null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-400 text-sm">Tidak ada data</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
