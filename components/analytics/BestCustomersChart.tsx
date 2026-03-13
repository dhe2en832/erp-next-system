'use client';

/**
 * Best Customers Chart Component
 * 
 * Displays 10 customers with best payment behavior using vertical bar chart.
 * Fetches data from /api/analytics?type=best_customers
 * 
 * Requirements: 2.1, 2.3, 10.2, 10.5
 */

import { useState, useEffect, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { BestCustomer, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency, formatChartNumber, formatPercentage, CHART_COLORS } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface BestCustomersChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function BestCustomersChart({ companyFilter }: BestCustomersChartProps) {
  const [data, setData] = useState<BestCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'best_customers' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch best customers data`);
      }

      const result: AnalyticsResponse<BestCustomer[]> = await response.json();
      
      if (result.success) {
        console.log('[BestCustomersChart] Data received:', result.data);
        setData(result.data);
      } else {
        throw new Error('Failed to load best customers data');
      }
    } catch (err) {
      console.error('[BestCustomersChart] Error fetching data:', err);
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
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Data"
        message="Tidak ada data pelanggan terbaik untuk ditampilkan. Pastikan ada transaksi penjualan yang sudah disubmit dan dibayar."
        icon="users"
      />
    );
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: BestCustomer }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.customer_name}</p>
          <p className="text-sm text-gray-600">
            Invoice Lunas: <span className="font-medium">{formatChartNumber(item.paid_invoices)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Tepat Waktu: <span className="font-medium">{formatPercentage(item.on_time_percentage)}</span>
          </p>
          <p className="text-sm text-green-600 font-semibold mt-1">
            Total Dibayar: {formatChartCurrency(item.total_paid)}
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
            Top 10 Pelanggan Terbaik
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Pelanggan dengan perilaku pembayaran terbaik
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            tickFormatter={(value) => formatChartCurrency(value)}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="category"
            dataKey="customer_name"
            width={140}
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
          <Bar
            dataKey="total_paid"
            fill={CHART_COLORS.green}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Sales Invoice yang sudah dibayar
        </p>
      </div>
    </div>
  );
}
