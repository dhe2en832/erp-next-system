'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import JournalMain from './component';

export default function JournalMainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    const company = localStorage.getItem('selected_company');
    if (company) {
      setSelectedCompany(company);
    } else {
      router.push('/select-company');
    }
  }, [router]);

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
