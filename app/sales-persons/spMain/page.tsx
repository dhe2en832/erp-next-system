'use client';

import { Suspense } from 'react';
import SalesPersonMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SalesPersonMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SalesPersonMain />
    </Suspense>
  );
}
