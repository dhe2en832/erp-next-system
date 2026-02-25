'use client';

import { Suspense } from 'react';
import KasKeluarList from './kkList/component';

export default function KasKeluarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat...</div>}>
      <KasKeluarList />
    </Suspense>
  );
}
