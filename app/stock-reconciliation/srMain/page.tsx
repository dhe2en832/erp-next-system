'use client';

import { Suspense } from 'react';
import StockReconciliationMain from './component';

export default function StockReconciliationMainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Memuat...</p></div>}>
      <StockReconciliationMain />
    </Suspense>
  );
}
