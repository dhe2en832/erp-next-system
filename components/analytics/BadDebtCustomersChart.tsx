'use client';

/**
 * Bad Debt Customers Chart Component
 * 
 * Displays 10 customers with highest bad debt (>90 days overdue) using vertical bar chart.
 * Fetches data from /api/analytics?type=bad_debt_customers
 * 
 * Requirements: 3.1.1, 3.1.3, 3.1.4, 3.1.6
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { BadDebtCustomer, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency, formatChartNumber, CHART_COLORS } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface BadDebtCustomersChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function BadDebtCustomersChart({ companyFilter }: BadDebtCustomersChartProps) {
  const [data, setData] = useState<BadDebtCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'bad_debt_customers' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch bad debt customers data`);
      }

      const result: AnalyticsResponse<BadDebtCustomer[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load bad debt customers data');
      }
    } catch (err) {
      console.error('[BadDebtCustomersChart] Error fetching data:', err);
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
        message="Tidak ada pelanggan dengan bad debt (overdue >90 hari). Ini adalah kabar baik!"
        icon="users"
      />
    );
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: BadDebtCustomer }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-gray-900">{item.customer_name}</p>
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
              Bad Debt
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Invoice Bad Debt: <span className="font-medium">{formatChartNumber(item.bad_debt_invoices)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Rata-rata Overdue: <span className="font-medium">{formatChartNumber(item.average_overdue_days)} hari</span>
          </p>
          <p className="text-sm text-red-600 font-semibold mt-1">
            Total Bad Debt: {formatChartCurrency(item.bad_debt_amount)}
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
          <AlertTriangle className="w-5 h-5 text-red-700" />
          <h3 className="text-lg font-semibold text-gray-900">
            Top 10 Pelanggan Bad Debt
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Pelanggan dengan piutang macet (overdue &gt;90 hari)
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 200, bottom: 40 }}
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
            width={190}
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }} />
          <Bar
            dataKey="bad_debt_amount"
            fill={CHART_COLORS.redDark}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Sales Invoice dengan overdue lebih dari 90 hari
        </p>
      </div>
    </div>
  );
}
