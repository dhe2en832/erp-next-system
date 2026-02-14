'use client';

import { Suspense } from 'react';
import SupplierMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SupplierMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SupplierMain />
    </Suspense>
  );
}
