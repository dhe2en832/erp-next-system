'use client';

/**
 * Unpaid Suppliers Chart Component
 * 
 * Displays 10 suppliers with highest outstanding amounts using bar chart.
 * Shows alert banner when outstanding amounts exist.
 * Fetches data from /api/analytics?type=unpaid_suppliers
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.6
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle } from 'lucide-react';
import type { UnpaidSupplier, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartCurrency, formatChartNumber, CHART_COLORS, truncateLabel } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface UnpaidSuppliersChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function UnpaidSuppliersChart({ companyFilter }: UnpaidSuppliersChartProps) {
  const [data, setData] = useState<UnpaidSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'unpaid_suppliers' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch unpaid suppliers data`);
      }

      const result: AnalyticsResponse<UnpaidSupplier[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load unpaid suppliers data');
      }
    } catch (err) {
      console.error('[UnpaidSuppliersChart] Error fetching data:', err);
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
        message="Tidak ada hutang supplier yang belum dibayar."
        icon="users"
      />
    );
  }

  // Calculate total outstanding
  const totalOutstanding = data.reduce((sum, item) => sum + item.outstanding_amount, 0);
  const hasOutstanding = totalOutstanding > 0;

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
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: UnpaidSupplier }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.supplier_name}</p>
          <p className="text-sm text-gray-600">
            Jumlah Invoice: <span className="font-medium">{formatChartNumber(item.outstanding_invoices_count)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Jatuh Tempo Tertua: <span className="font-medium">{formatDate(item.oldest_due_date)}</span>
          </p>
          <p className="text-sm text-red-600 font-semibold mt-1">
            Total Hutang: {formatChartCurrency(item.outstanding_amount)}
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
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Supplier Belum Dibayar
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          10 supplier dengan hutang terbesar yang belum dibayar
        </p>
      </div>

      {/* Alert Banner - shown when outstanding > 0 */}
      {hasOutstanding && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">
              Perhatian: Ada hutang supplier yang belum dibayar
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Total: {formatChartCurrency(totalOutstanding)} - Segera lakukan pembayaran untuk menjaga hubungan baik dengan supplier
            </p>
          </div>
        </div>
      )}

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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }} />
          <Bar
            dataKey="outstanding_amount"
            fill={CHART_COLORS.red}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Purchase Invoice yang belum lunas
        </p>
      </div>
    </div>
  );
}
