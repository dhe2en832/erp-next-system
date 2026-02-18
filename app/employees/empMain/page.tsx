import { Suspense } from 'react';
import EmployeeMain from './component';

export default function EmployeeMainPage() {
  return (
    <Suspense fallback={<div className="p-6">Memuat...</div>}>
      <EmployeeMain />
    </Suspense>
  );
}
