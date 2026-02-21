'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { AccountingPeriod } from '../../../types/accounting-period';

export default function PeriodDashboard() {
  const router = useRouter();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accounting-period/periods', { 
        credentials: 'include' 
      });
      const data = await response.json();

      if (data.success) {
        setPeriods(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data periode');
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    
    const openPeriods = periods.filter(p => p.status === 'Open');
    const closedPeriods = periods.filter(p => p.status === 'Closed');
    const permanentlyClosedPeriods = periods.filter(p => p.status === 'Permanently Closed');
    
    // Periods that need attention (overdue)
    const overduePeriods = openPeriods.filter(p => {
      const endDate = new Date(p.end_date);
      return endDate < today;
    });
    
    // Periods ending soon (within 7 days)
    const endingSoonPeriods = openPeriods.filter(p => {
      const endDate = new Date(p.end_date);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilEnd > 0 && daysUntilEnd <= 7;
    });

    return {
      total: periods.length,
      open: openPeriods.length,
      closed: closedPeriods.length,
      permanentlyClosed: permanentlyClosedPeriods.length,
      overdue: overduePeriods.length,
      endingSoon: endingSoonPeriods.length,
      overduePeriods,
      endingSoonPeriods
    };
  }, [periods]);

  // Get recent periods (last 5)
  const recentPeriods = useMemo(() => {
    return [...periods]
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 5);
  }, [periods]);

  const getStatusBadge = (status: string) => {
    const badges = {
      'Open': 'bg-green-100 text-green-800 border-green-200',
      'Closed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Permanently Closed': 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'Open': 'Terbuka',
      'Closed': 'Ditutup',
      'Permanently Closed': 'Ditutup Permanen'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getDaysUntilEnd = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return <LoadingSpinner message="Memuat dashboard..." />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Periode Akuntansi</h1>
          <p className="text-sm text-gray-500">Ringkasan status periode akuntansi</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/accounting-period')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Lihat Semua Periode
          </button>
          <button
            onClick={() => router.push('/accounting-period/create')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            + Buat Periode Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Urgent Action Banner */}
      {stats.overdue > 0 && (
        <div className="mb-6 bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Tindakan Segera Diperlukan!</h3>
                <p className="text-red-100 text-sm mt-1">
                  {stats.overdue} periode telah melewati tanggal akhir dan perlu segera ditutup
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const firstOverdue = stats.overduePeriods[0];
                if (firstOverdue) {
                  router.push(`/accounting-period/${encodeURIComponent(firstOverdue.name)}`);
                }
              }}
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors shadow-lg"
            >
              Tutup Periode Sekarang →
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards with Enhanced Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Periode</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/accounting-period?status=Open')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Periode Terbuka</p>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-3xl font-bold text-green-600">{stats.open}</p>
                {stats.open > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Aktif
                  </span>
                )}
              </div>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/accounting-period?status=Closed')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Periode Ditutup</p>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-3xl font-bold text-yellow-600">{stats.closed}</p>
                {stats.closed > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Locked
                  </span>
                )}
              </div>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow relative cursor-pointer" onClick={() => router.push('/accounting-period/notifications')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Perlu Perhatian</p>
              <div className="flex items-baseline space-x-2 mt-2">
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                {stats.overdue > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                    Urgent!
                  </span>
                )}
              </div>
              {stats.endingSoon > 0 && (
                <p className="text-xs text-yellow-600 mt-1 font-medium">
                  +{stats.endingSoon} akan berakhir segera
                </p>
              )}
            </div>
            <div className="bg-red-100 rounded-full p-3 relative">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {(stats.overdue + stats.endingSoon) > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px]">
                  {stats.overdue + stats.endingSoon}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Alerts Section with Badge Counts */}
      {(stats.overdue > 0 || stats.endingSoon > 0) && (
        <div className="mb-6 space-y-4">
          {/* Overdue Periods Alert - Enhanced with Badge */}
          {stats.overdue > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                      {stats.overdue}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-900">
                      Periode Melewati Tanggal Akhir
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                      {stats.overdue} Perlu Ditutup
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    Periode berikut sudah melewati tanggal akhir dan perlu segera ditutup
                  </p>
                  <div className="mt-3 space-y-2">
                    {stats.overduePeriods.map(period => {
                      const daysOverdue = Math.abs(getDaysUntilEnd(period.end_date));
                      return (
                        <div key={period.name} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{period.period_name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {daysOverdue} hari overdue
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Berakhir: {new Date(period.end_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/accounting-period/${encodeURIComponent(period.name)}`)}
                            className="ml-3 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Tutup Sekarang →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ending Soon Alert - Enhanced with Badge */}
          {stats.endingSoon > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <svg className="h-6 w-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-yellow-600 rounded-full min-w-[18px]">
                      {stats.endingSoon}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-yellow-900">
                      Periode Akan Berakhir Segera
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-600 text-white">
                      {stats.endingSoon} Perlu Perhatian
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Periode berikut akan berakhir dalam 7 hari ke depan
                  </p>
                  <div className="mt-3 space-y-2">
                    {stats.endingSoonPeriods.map(period => {
                      const days = getDaysUntilEnd(period.end_date);
                      return (
                        <div key={period.name} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{period.period_name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⏰ {days} hari lagi
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Berakhir: {new Date(period.end_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/accounting-period/${encodeURIComponent(period.name)}`)}
                            className="ml-3 px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            Lihat Detail →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Periods with Enhanced Alert Indicators */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Periode Terbaru</h2>
            {(stats.overdue + stats.endingSoon) > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                {stats.overdue + stats.endingSoon} memerlukan tindakan
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/accounting-period')}
            className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
          >
            Lihat Semua →
          </button>
        </div>
        {recentPeriods.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Belum ada periode akuntansi
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentPeriods.map((period) => {
              const daysUntilEnd = getDaysUntilEnd(period.end_date);
              const isOverdue = period.status === 'Open' && daysUntilEnd < 0;
              const isEndingSoon = period.status === 'Open' && daysUntilEnd > 0 && daysUntilEnd <= 7;

              return (
                <div
                  key={period.name}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' : 
                    isEndingSoon ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                  }`}
                  onClick={() => router.push(`/accounting-period/${encodeURIComponent(period.name)}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 flex-wrap">
                        <h3 className="text-sm font-medium text-gray-900">{period.period_name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(period.status)}`}>
                          {getStatusText(period.status)}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            OVERDUE {Math.abs(daysUntilEnd)} hari
                          </span>
                        )}
                        {isEndingSoon && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-600 text-white">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {daysUntilEnd} hari lagi
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(period.start_date).toLocaleDateString('id-ID')} - {new Date(period.end_date).toLocaleDateString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{period.company}</p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {period.status === 'Open' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/accounting-period/${encodeURIComponent(period.name)}`);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isOverdue 
                              ? 'bg-red-600 text-white hover:bg-red-700' 
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          {isOverdue ? 'Tutup Sekarang' : 'Tutup Periode'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/accounting-period/${encodeURIComponent(period.name)}`);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => router.push('/accounting-period/create')}
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 rounded-full p-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Buat Periode Baru</h3>
              <p className="text-xs text-gray-500 mt-1">Tambah periode akuntansi</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push('/accounting-period')}
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Kelola Periode</h3>
              <p className="text-xs text-gray-500 mt-1">Lihat dan kelola semua periode</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push('/accounting-period/reports')}
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Laporan</h3>
              <p className="text-xs text-gray-500 mt-1">Lihat laporan penutupan</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
