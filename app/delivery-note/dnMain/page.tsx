'use client';

import { Suspense } from 'react';
import DeliveryNoteMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DeliveryNoteMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <DeliveryNoteMain />
    </Suspense>
  );
}
