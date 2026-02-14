'use client';

import { useRouter } from 'next/navigation';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  documentName: string;
  documentLabel?: string;
}

const printRouteMap: Record<string, string> = {
  'Sales Order': '/print/sales-order',
  'Delivery Note': '/print/delivery-note',
  'Sales Invoice': '/print/sales-invoice',
  'Purchase Order': '/print/purchase-order',
  'Purchase Receipt': '/print/purchase-receipt',
  'Purchase Invoice': '/print/purchase-invoice',
};

export default function PrintDialog({ isOpen, onClose, documentType, documentName, documentLabel }: PrintDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const printRoute = printRouteMap[documentType];
  const label = documentLabel || documentType;

  const handlePrint = () => {
    if (printRoute && documentName) {
      window.open(`${printRoute}?name=${encodeURIComponent(documentName)}`, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Dokumen Berhasil Disimpan</h3>
            <p className="text-sm text-gray-500">{label}: {documentName}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-6">Apakah Anda ingin mencetak dokumen ini sekarang?</p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
          >
            Tidak, Terima Kasih
          </button>
          {printRoute ? (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Dokumen
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded-md text-sm cursor-not-allowed"
              disabled
            >
              Cetak Tidak Tersedia
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
