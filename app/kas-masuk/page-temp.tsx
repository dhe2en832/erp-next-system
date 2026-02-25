'use client';

import { Suspense } from 'react';
import KasMasukForm from './kmMain/component';

export default function KasMasukPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat...</div>}>
      <KasMasukForm />
    </Suspense>
  );
}
