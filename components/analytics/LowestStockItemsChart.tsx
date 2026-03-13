'use client';

/**
 * Lowest Stock Items Chart Component
 * 
 * Displays 10 items with lowest stock levels using horizontal bar chart.
 * Shows "Reorder" badge when stock is below reorder level.
 * Fetches data from /api/analytics?type=lowest_stock_items
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.5
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { LowestStockItem, AnalyticsResponse } from '@/types/dashboard-analytics';
import { formatChartNumber, CHART_COLORS, truncateLabel } from '@/lib/chart-utils';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface LowestStockItemsChartProps {
  /** Optional company filter */
  companyFilter?: string;
}

export default function LowestStockItemsChart({ companyFilter }: LowestStockItemsChartProps) {
  const [data, setData] = useState<LowestStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'lowest_stock_items' });
      if (companyFilter) {
        params.append('company', companyFilter);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch lowest stock items data`);
      }

      const result: AnalyticsResponse<LowestStockItem[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load lowest stock items data');
      }
    } catch (err) {
      console.error('[LowestStockItemsChart] Error fetching data:', err);
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

  // Check if item needs reorder
  const needsReorder = (item: LowestStockItem) => {
    return item.reorder_level > 0 && item.total_stock < item.reorder_level;
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: LowestStockItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const reorder = needsReorder(item);
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
            Reorder Level: <span className="font-medium">{formatChartNumber(item.reorder_level)}</span>
          </p>
          {reorder && (
            <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
              ⚠️ Perlu Reorder
            </div>
          )}
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
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Item dengan Stok Terendah
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          10 item dengan total stok terendah (tidak termasuk stok 0)
        </p>
      </div>

      {/* Warning Banner if any items need reorder */}
      {data.some(needsReorder) && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">
              Perhatian: Ada item yang perlu di-reorder
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Beberapa item memiliki stok di bawah reorder level
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }} />
          <Bar
            dataKey="total_stock"
            radius={[0, 4, 4, 0]}
            minPointSize={5}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={needsReorder(entry) ? CHART_COLORS.red : CHART_COLORS.orange} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data diambil dari Bin (stok gudang). Item dengan stok 0 tidak ditampilkan.
        </p>
      </div>
    </div>
  );
}
