import { Suspense } from 'react';
import WarehouseMain from './component';

export default function WarehouseMainPage() {
  return (
    <Suspense fallback={<div className="p-6">Memuat...</div>}>
      <WarehouseMain />
    </Suspense>
  );
}
