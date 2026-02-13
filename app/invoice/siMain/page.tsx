'use client';

import { Suspense } from 'react';
import SalesInvoiceMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SalesInvoiceMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <SalesInvoiceMain />
    </Suspense>
  );
}
