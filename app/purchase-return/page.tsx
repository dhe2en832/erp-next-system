/**
 * Purchase Return Page (Retur Pembelian)
 * 
 * Main page for Purchase Return management
 * Conditionally renders list or form based on query parameters
 * 
 * Requirements: 1.1, 11.1
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PurchaseReturnList from './prList/component';
import PurchaseReturnMain from './prMain/component';
import LoadingSpinner from '@/components/LoadingSpinner';

function PurchaseReturnPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const name = searchParams.get('name');

  // Show form if mode=create or name is provided
  if (mode === 'create' || name) {
    return <PurchaseReturnMain />;
  }

  // Default: show list
  return <PurchaseReturnList />;
}

export default function PurchaseReturnPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PurchaseReturnPageContent />
    </Suspense>
  );
}
