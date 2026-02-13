'use client';

import { Suspense } from 'react';
import ItemMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ItemMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <ItemMain />
    </Suspense>
  );
}
