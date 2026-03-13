'use client';

/**
 * Outstanding Commission Card Component
 * 
 * Displays total unpaid commission with alert banner and breakdown per sales person.
 * Fetches data from /api/analytics?type=outstanding_commission
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 */

import { useState, useEffect } from 'react';
import { AlertCircle, DollarSign } from 'lucide-react';
import type { OutstandingCommission, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency } from '@/lib/chart-utils';
import CardLoadingSkeleton from './CardLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface OutstandingCommissionCardProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function OutstandingCommissionCard({ companyFilter }: OutstandingCommissionCardProps) {
  const [data, setData] = useState<OutstandingCommission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'outstanding_commission' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch outstanding commission data`);
      }

      const result: AnalyticsResponse<OutstandingCommission> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load outstanding commission data');
      }
    } catch (err) {
      console.error('[OutstandingCommissionCard] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
     
  }, [companyFilter]);

  // Loading state
  if (loading) {
    return <CardLoadingSkeleton showStats={true} statCount={3} />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchData}
      />
    );
  }

  // Empty state
  if (!data || (data.total_outstanding === 0 && data.sales_count === 0)) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              Komisi Belum Dibayar
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Total komisi yang belum dibayarkan ke sales
          </p>
        </div>

        {/* No Data State */}
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Tidak Ada Komisi Outstanding
          </h4>
          <p className="text-gray-600 mb-4">
            Semua komisi sudah dibayarkan atau belum ada data komisi yang tercatat.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              💡 <strong>Tips:</strong> Pastikan Sales Invoice sudah memiliki Sales Team dengan komisi yang ditetapkan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasOutstanding = data.total_outstanding > 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Komisi Belum Dibayar
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Total komisi yang belum dibayarkan ke sales
        </p>
      </div>

      {/* Alert Banner - shown when outstanding > 0 */}
      {hasOutstanding && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Perhatian: Ada komisi yang belum dibayar
            </p>
            <p className="text-xs text-red-700 mt-1">
              Segera lakukan pembayaran komisi untuk menjaga motivasi tim sales
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">
            {formatChartCurrency(data.total_outstanding)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Jumlah Sales</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.sales_count}
          </p>
        </div>
      </div>

      {/* Breakdown Table */}
      {data.breakdown && data.breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Breakdown per Sales
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Person
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.breakdown.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.sales_person}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {formatChartCurrency(item.outstanding_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari komisi yang belum dibayarkan
        </p>
      </div>
    </div>
  );
}
