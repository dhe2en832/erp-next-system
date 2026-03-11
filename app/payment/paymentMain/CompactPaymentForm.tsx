'use client';

import PaymentMainOptimized from './component-optimized';

interface CompactPaymentFormProps {
  onBack: () => void;
  selectedCompany: string;
  editPayment?: any;
  defaultPaymentType?: 'Receive' | 'Pay';
}

/**
 * CompactPaymentForm - Wrapper component
 * 
 * Currently uses component-optimized as the base.
 * This is a placeholder for future modular refactor.
 * 
 * To use the full modular version with InvoiceAllocationTable
 * and PreviewAccordion, uncomment the code below and implement
 * the full logic from component-optimized.
 */
export default function CompactPaymentForm({
  onBack,
  selectedCompany,
  editPayment,
  defaultPaymentType,
}: CompactPaymentFormProps) {
  return (
    <div>
      {/* Version Indicator - COMPACT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">COMPACT (Wrapper)</span>
            <span className="text-xs text-green-600">Saat ini menggunakan Optimized sebagai base - Placeholder untuk future modular refactor</span>
          </div>
        </div>
      </div>
      
      <PaymentMainOptimized
        onBack={onBack}
        selectedCompany={selectedCompany}
        editPayment={editPayment}
        defaultPaymentType={defaultPaymentType}
      />
    </div>
  );
}
