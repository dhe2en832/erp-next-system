'use client';

/**
 * Inventory Analytics Section Component
 * 
 * Container component that composes inventory analytics:
 * - HighestStockItemsChart: Top 10 items with highest stock levels
 * - LowestStockItemsChart: Top 10 items with lowest stock levels
 * - MostPurchasedItemsChart: Top 10 items with highest purchase frequency
 * 
 * Implements responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * 
 * Requirements: 11.2, 12.1, 12.2, 12.3
 */

import HighestStockItemsChart from './HighestStockItemsChart';
import LowestStockItemsChart from './LowestStockItemsChart';
import MostPurchasedItemsChart from './MostPurchasedItemsChart';

interface InventoryAnalyticsSectionProps {
  /** Optional company filter to pass to all child charts */
  companyFilter?: string;
}

export default function InventoryAnalyticsSection({ companyFilter }: InventoryAnalyticsSectionProps) {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Inventory
        </h2>
        <p className="text-gray-600">
          Wawasan tentang stok barang dan pola pembelian
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Highest Stock Items Chart */}
        <HighestStockItemsChart companyFilter={companyFilter} />

        {/* Lowest Stock Items Chart */}
        <LowestStockItemsChart companyFilter={companyFilter} />

        {/* Most Purchased Items Chart */}
        <MostPurchasedItemsChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
