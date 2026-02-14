'use client';

import { Suspense } from 'react';
import CommissionPaymentMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CommissionPaymentMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <CommissionPaymentMain />
    </Suspense>
  );
}
