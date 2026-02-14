'use client';

import { Suspense } from 'react';
import PaymentTermsMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PaymentTermsMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PaymentTermsMain />
    </Suspense>
  );
}
