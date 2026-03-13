'use client';

/**
 * Supplier Analytics Section Component
 * 
 * Container component that composes supplier analytics:
 * - TopSuppliersByFrequencyChart: Top 10 suppliers by purchase frequency
 * - PaidSuppliersChart: Top 10 suppliers with highest paid amounts
 * - UnpaidSuppliersChart: Top 10 suppliers with highest outstanding amounts
 * 
 * Implements responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * 
 * Requirements: 11.2, 12.1, 12.2, 12.3
 */

import TopSuppliersByFrequencyChart from './TopSuppliersByFrequencyChart';
import PaidSuppliersChart from './PaidSuppliersChart';
import UnpaidSuppliersChart from './UnpaidSuppliersChart';

interface SupplierAnalyticsSectionProps {
  /** Optional company filter to pass to all child charts */
  companyFilter?: string;
}

export default function SupplierAnalyticsSection({ companyFilter }: SupplierAnalyticsSectionProps) {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Supplier
        </h2>
        <p className="text-gray-600">
          Wawasan tentang performa supplier dan status pembayaran
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Suppliers By Frequency Chart */}
        <TopSuppliersByFrequencyChart companyFilter={companyFilter} />

        {/* Paid Suppliers Chart */}
        <PaidSuppliersChart companyFilter={companyFilter} />

        {/* Unpaid Suppliers Chart */}
        <UnpaidSuppliersChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
