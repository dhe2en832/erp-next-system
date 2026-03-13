'use client';

/**
 * Paid Suppliers Chart Component
 * 
 * Displays 10 suppliers with highest paid amounts using bar chart.
 * Fetches data from /api/analytics?type=paid_suppliers
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.5
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle } from 'lucide-react';
import type { PaidSupplier, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency, formatChartNumber, CHART_COLORS, truncateLabel } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface PaidSuppliersChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function PaidSuppliersChart({ companyFilter }: PaidSuppliersChartProps) {
  const [data, setData] = useState<PaidSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'paid_suppliers' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch paid suppliers data`);
      }

      const result: AnalyticsResponse<PaidSupplier[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load paid suppliers data');
      }
    } catch (err) {
      console.error('[PaidSuppliersChart] Error fetching data:', err);
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
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Data"
        message="Tidak ada data pembayaran supplier untuk ditampilkan."
        icon="users"
      />
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: PaidSupplier }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.supplier_name}</p>
          <p className="text-sm text-gray-600">
            Jumlah Invoice: <span className="font-medium">{formatChartNumber(item.paid_invoices_count)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Pembayaran Terakhir: <span className="font-medium">{formatDate(item.last_payment_date)}</span>
          </p>
          <p className="text-sm text-green-600 font-semibold mt-1">
            Total Dibayar: {formatChartCurrency(item.total_paid_amount)}
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
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Supplier Sudah Dibayar
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          10 supplier dengan pembayaran terbesar yang sudah lunas
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
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
            dataKey="supplier_name"
            width={70}
            tickFormatter={(value) => truncateLabel(value, 12)}
            stroke="#6b7280"
            style={{ fontSize: '10px' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
          <Bar
            dataKey="total_paid_amount"
            fill={CHART_COLORS.green}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Purchase Invoice yang sudah lunas
        </p>
      </div>
    </div>
  );
}
