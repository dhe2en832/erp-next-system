'use client';

/**
 * Commission Tracker Section Component
 * 
 * Container component that composes commission tracking analytics:
 * - OutstandingCommissionCard: Total unpaid commission with breakdown
 * - PaidCommissionTrendChart: Trend of paid commissions over time
 * 
 * Implements responsive grid layout (1 col mobile, 2 col desktop)
 * 
 * Requirements: 11.2, 12.1, 12.2, 12.3
 */

import OutstandingCommissionCard from './OutstandingCommissionCard';
import PaidCommissionTrendChart from './PaidCommissionTrendChart';

interface CommissionTrackerSectionProps {
  /** Optional company filter to pass to all child charts */
  companyFilter?: string;
}

export default function CommissionTrackerSection({ companyFilter }: CommissionTrackerSectionProps) {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tracking Komisi Sales
        </h2>
        <p className="text-gray-600">
          Monitoring komisi yang sudah dan belum dibayarkan kepada tim sales
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Commission Card */}
        <OutstandingCommissionCard companyFilter={companyFilter} />

        {/* Paid Commission Trend Chart */}
        <PaidCommissionTrendChart companyFilter={companyFilter} />
      </div>
    </section>
  );
}
