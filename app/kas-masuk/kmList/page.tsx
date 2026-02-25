'use client';

import { Suspense } from 'react';
import KasMasukList from './component';

export default function KasMasukListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat...</div>}>
      <KasMasukList />
    </Suspense>
  );
}
