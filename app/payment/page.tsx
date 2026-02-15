'use client';

import { useState, useEffect } from 'react';
import PaymentList from './paymentList/component';
import PaymentMain from './paymentMain/component';

export default function PaymentPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editPayment, setEditPayment] = useState<any>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [defaultPaymentType, setDefaultPaymentType] = useState<'Receive' | 'Pay' | undefined>(undefined);

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
    setDefaultPaymentType(undefined);
    setView('form');
  };

  const handleCreate = () => {
    setShowTypeDialog(true);
  };

  const handleSelectType = (type: 'Receive' | 'Pay') => {
    setEditPayment(null);
    setDefaultPaymentType(type);
    setShowTypeDialog(false);
    setView('form');
  };

  const handleBack = () => {
    setEditPayment(null);
    setDefaultPaymentType(undefined);
    setView('list');
  };

  if (!selectedCompany) return null;

  if (view === 'form') {
    return (
      <PaymentMain
        onBack={handleBack}
        selectedCompany={selectedCompany}
        editPayment={editPayment}
        defaultPaymentType={defaultPaymentType}
      />
    );
  }

  return (
    <>
      <PaymentList
        onEdit={handleEdit}
        onCreate={handleCreate}
        selectedCompany={selectedCompany}
      />

      {/* Dialog Pilih Tipe Pembayaran */}
      {showTypeDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowTypeDialog(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 z-10">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Pilih Jenis Transaksi</h2>
                <p className="text-sm text-gray-500 mt-1">Pilih jenis transaksi pembayaran yang ingin Anda buat</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Penerimaan */}
                <button
                  onClick={() => handleSelectType('Receive')}
                  className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0-16l-4 4m4-4l4 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700">Penerimaan</h3>
                  <p className="text-sm text-gray-500 mt-1 text-center">Terima pembayaran dari pelanggan</p>
                </button>

                {/* Pembayaran */}
                <button
                  onClick={() => handleSelectType('Pay')}
                  className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all duration-200"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m0 16l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-700">Pembayaran</h3>
                  <p className="text-sm text-gray-500 mt-1 text-center">Bayar hutang ke pemasok</p>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowTypeDialog(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
