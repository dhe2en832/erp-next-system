'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import JournalMain from './component';

export const dynamic = 'force-dynamic';

export default function JournalMainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCompany] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_company') || '';
    }
    return '';
  });

  useEffect(() => {
    if (!selectedCompany && typeof window !== 'undefined') {
      router.push('/select-company');
    }
  }, [router, selectedCompany]);

  const handleBack = () => {
    router.push('/journal');
  };

  if (!selectedCompany) {
    return null;
  }

  return (
    <JournalMain
      onBack={handleBack}
      selectedCompany={selectedCompany}
      journalName={searchParams.get('name') || undefined}
    />
  );
}
