'use client';

/**
 * Highest Stock Items Chart Component
 * 
 * Displays 10 items with highest stock levels using horizontal bar chart.
 * Fetches data from /api/analytics?type=highest_stock_items
 * 
 * Requirements: 16.1, 16.2, 16.3
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';
import type { HighestStockItem, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartNumber, CHART_COLORS, truncateLabel } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface HighestStockItemsChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function HighestStockItemsChart({ companyFilter }: HighestStockItemsChartProps) {
  const [data, setData] = useState<HighestStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'highest_stock_items' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch highest stock items data`);
      }

      const result: AnalyticsResponse<HighestStockItem[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load highest stock items data');
      }
    } catch (err) {
      console.error('[HighestStockItemsChart] Error fetching data:', err);
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
        message="Tidak ada data stok item untuk ditampilkan."
        icon="package"
      />
    );
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: HighestStockItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.item_name}</p>
          <p className="text-sm text-gray-600">
            Kode: <span className="font-medium">{item.item_code}</span>
          </p>
          <p className="text-sm text-gray-600">
            Total Stok: <span className="font-medium">{formatChartNumber(item.total_stock)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Jumlah Gudang: <span className="font-medium">{item.warehouse_count}</span>
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
          <Package className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Item dengan Stok Terbanyak
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          10 item dengan total stok tertinggi
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }} />
          <Bar
            dataKey="total_stock"
            fill={CHART_COLORS.indigo}
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Bin (stok gudang)
        </p>
      </div>
    </div>
  );
}
