'use client';

import { useState, useEffect } from 'react';
import PaymentList from './paymentList/component';
import PaymentMain from './paymentMain/component';

export default function PaymentPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editPayment, setEditPayment] = useState<any>(null);

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      window.location.href = '/select-company';
      return;
    }
    setSelectedCompany(savedCompany);
  }, []);

  const handleEdit = (payment: any) => {
    setEditPayment(payment);
    setView('form');
  };

  const handleCreate = () => {
    setEditPayment(null);
    setView('form');
  };

  const handleBack = () => {
    setEditPayment(null);
    setView('list');
  };

  if (!selectedCompany) return null;

  if (view === 'form') {
    return (
      <PaymentMain
        onBack={handleBack}
        selectedCompany={selectedCompany}
        editPayment={editPayment}
      />
    );
  }

  return (
    <PaymentList
      onEdit={handleEdit}
      onCreate={handleCreate}
      selectedCompany={selectedCompany}
    />
  );
}
