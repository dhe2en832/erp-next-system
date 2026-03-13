'use client';

/**
 * Paid Commission Trend Chart Component
 * 
 * Displays trend of paid commissions over time using line chart.
 * Fetches data from /api/analytics?type=paid_commission
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.5, 10.4
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { PaidCommission, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency, CHART_COLORS } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface PaidCommissionTrendChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function PaidCommissionTrendChart({ companyFilter }: PaidCommissionTrendChartProps) {
  const [data, setData] = useState<PaidCommission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'paid_commission' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch paid commission data`);
      }

      const result: AnalyticsResponse<PaidCommission> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load paid commission data');
      }
    } catch (err) {
      console.error('[PaidCommissionTrendChart] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilter]);

  // Loading state
  if (loading) {
    return <ChartLoadingSkeleton height={300} showTitle={true} />;
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
  if (!data || !data.monthly_trend || data.monthly_trend.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Data"
        message="Tidak ada data pembayaran komisi untuk ditampilkan."
        icon="trending"
      />
    );
  }

  // Format month for display (YYYY-MM -> MMM YYYY)
  const formatMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { month: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">
            {formatMonth(item.payload.month)}
          </p>
          <p className="text-sm text-indigo-600 font-semibold">
            Total: {formatChartCurrency(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Trend Pembayaran Komisi
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Komisi yang sudah dibayarkan per bulan
        </p>
      </div>

      {/* Summary Card */}
      <div className="mb-4 bg-green-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-1">Total Dibayar ({data.period})</p>
        <p className="text-2xl font-bold text-green-600">
          {formatChartCurrency(data.total_paid)}
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data.monthly_trend}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            tickFormatter={(value) => formatChartCurrency(value)}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke={CHART_COLORS.indigo}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.indigo, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari komisi yang sudah dibayarkan
        </p>
      </div>
    </div>
  );
}
