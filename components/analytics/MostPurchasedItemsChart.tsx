'use client';

/**
 * Most Purchased Items Chart Component
 * 
 * Displays 10 items with highest purchase frequency using horizontal bar chart.
 * Fetches data from /api/analytics?type=most_purchased_items
 * 
 * Requirements: 18.1, 18.2, 18.4, 18.5
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShoppingCart } from 'lucide-react';
import type { MostPurchasedItem, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartNumber, CHART_COLORS, truncateLabel } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface MostPurchasedItemsChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function MostPurchasedItemsChart({ companyFilter }: MostPurchasedItemsChartProps) {
  const [data, setData] = useState<MostPurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'most_purchased_items' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch most purchased items data`);
      }

      const result: AnalyticsResponse<MostPurchasedItem[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load most purchased items data');
      }
    } catch (err) {
      console.error('[MostPurchasedItemsChart] Error fetching data:', err);
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
        message="Tidak ada data pembelian item untuk ditampilkan."
        icon="package"
      />
    );
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: MostPurchasedItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.item_name}</p>
          <p className="text-sm text-gray-600">
            Kode: <span className="font-medium">{item.item_code}</span>
          </p>
          <p className="text-sm text-gray-600">
            Frekuensi Pembelian: <span className="font-medium">{formatChartNumber(item.purchase_frequency)} PO</span>
          </p>
          <p className="text-sm text-green-600 font-semibold mt-1">
            Total Qty: {formatChartNumber(item.total_purchased_qty)}
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
          <ShoppingCart className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Item Paling Sering Dibeli
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          10 item dengan frekuensi pembelian tertinggi
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
            tickFormatter={(value) => formatChartNumber(value)}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="category"
            dataKey="item_name"
            width={70}
            tickFormatter={(value) => truncateLabel(value, 12)}
            stroke="#6b7280"
            style={{ fontSize: '10px' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
          <Bar
            dataKey="purchase_frequency"
            fill={CHART_COLORS.green}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Purchase Order yang sudah disubmit
        </p>
      </div>
    </div>
  );
}
