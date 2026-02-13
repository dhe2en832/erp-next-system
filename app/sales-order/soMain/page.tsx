'use client';

import { Suspense } from 'react';
import SalesOrderMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SalesOrderMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SalesOrderMain />
    </Suspense>
  );
}
