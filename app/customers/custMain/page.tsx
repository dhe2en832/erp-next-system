'use client';

import { Suspense } from 'react';
import CustomerMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <CustomerMain />
    </Suspense>
  );
}
