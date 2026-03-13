'use client';

/**
 * Customer Behavior Section Component
 * 
 * Container component that composes three customer behavior analytics charts:
 * - BestCustomersChart: Top 10 customers with best payment behavior
 * - WorstCustomersChart: Top 10 customers with worst payment behavior
 * - BadDebtCustomersChart: Top 10 customers with bad debt (>90 days overdue)
 * 
 * Implements responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * 
 * Requirements: 11.2, 12.1, 12.2, 12.3
 */

import BestCustomersChart from './BestCustomersChart';
import WorstCustomersChart from './WorstCustomersChart';
import BadDebtCustomersChart from './BadDebtCustomersChart';

interface CustomerBehaviorSectionProps {
  /** Optional company filter to pass to all child charts */
  companyFilter?: string;
}

export default function CustomerBehaviorSection({ companyFilter }: CustomerBehaviorSectionProps) {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Perilaku Pelanggan
        </h2>
        <p className="text-gray-600">
          Wawasan tentang perilaku pembayaran pelanggan untuk evaluasi kredit dan strategi penagihan
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Best Customers Chart */}
        <BestCustomersChart companyFilter={companyFilter} />

        {/* Worst Customers Chart */}
        <WorstCustomersChart companyFilter={companyFilter} />

        {/* Bad Debt Customers Chart */}
        <BadDebtCustomersChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
