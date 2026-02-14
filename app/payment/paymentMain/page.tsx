'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentMain from './component';
import LoadingSpinner from '../../components/LoadingSpinner';

function PaymentMainInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get('type'); // 'receive' or 'pay'
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selected_company');
    if (saved) setSelectedCompany(saved);
  }, []);

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
