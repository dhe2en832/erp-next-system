'use client';

/**
 * Sales Performance Section Component
 * 
 * Container component that composes three sales performance analytics charts:
 * - TopSalesByRevenueChart: Top 10 sales by total revenue
 * - TopSalesByCommissionChart: Top 10 sales by commission earned
 * - WorstSalesByCommissionChart: Bottom 10 sales by commission
 * 
 * Implements responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * 
 * Requirements: 11.2, 12.1, 12.2, 12.3
 */

import TopSalesByRevenueChart from './TopSalesByRevenueChart';
import TopSalesByCommissionChart from './TopSalesByCommissionChart';
import WorstSalesByCommissionChart from './WorstSalesByCommissionChart';

interface SalesPerformanceSectionProps {
  /** Optional company filter to pass to all child charts */
  companyFilter?: string;
}

export default function SalesPerformanceSection({ companyFilter }: SalesPerformanceSectionProps) {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Performa Sales
        </h2>
        <p className="text-gray-600">
          Wawasan tentang performa tim sales berdasarkan revenue dan komisi
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Sales By Revenue Chart */}
        <TopSalesByRevenueChart companyFilter={companyFilter} />

        {/* Top Sales By Commission Chart */}
        <TopSalesByCommissionChart companyFilter={companyFilter} />

        {/* Worst Sales By Commission Chart */}
        <WorstSalesByCommissionChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
