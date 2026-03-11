'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentMain from './component-original';
// import PaymentMain from './component-optimized';
// import PaymentMain from './CompactPaymentForm';

import LoadingSpinner from '../../components/LoadingSpinner';

export const dynamic = 'force-dynamic';

function PaymentMainInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get('type'); // 'receive' or 'pay'
  const [selectedCompany] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_company') || '';
    }
    return '';
  });

  useEffect(() => {
    if (!selectedCompany && typeof window !== 'undefined') {
      const saved = localStorage.getItem('selected_company');
      if (!saved) {
        router.push('/select-company');
      }
    }
  }, [router, selectedCompany]);

  if (!selectedCompany) return <LoadingSpinner message="Memuat..." />;

  return (
    <PaymentMain
      onBack={() => router.push('/payment')}
      selectedCompany={selectedCompany}
      defaultPaymentType={typeParam === 'pay' ? 'Pay' : typeParam === 'receive' ? 'Receive' : undefined}
    />
  );
}

export default function PaymentMainPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <PaymentMainInner />
    </Suspense>
  );
}
