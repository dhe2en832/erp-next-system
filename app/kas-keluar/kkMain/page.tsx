'use client';

import { Suspense } from 'react';
import KasKeluarForm from './component';

export default function KasKeluarFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat...</div>}>
      <KasKeluarForm />
    </Suspense>
  );
}
