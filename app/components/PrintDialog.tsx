'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import PrintPreviewModal from '../../components/print/PrintPreviewModal';
import SalesOrderPrint from '../../components/print/SalesOrderPrint';
import DeliveryNotePrint from '../../components/print/DeliveryNotePrint';
import SalesInvoicePrint from '../../components/print/SalesInvoicePrint';
import PurchaseOrderPrint from '../../components/print/PurchaseOrderPrint';
import PurchaseReceiptPrint from '../../components/print/PurchaseReceiptPrint';
import PurchaseInvoicePrint from '../../components/print/PurchaseInvoicePrint';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  documentName: string;
  documentLabel?: string;
}

export default function PrintDialog({ isOpen, onClose, documentType, documentName, documentLabel }: PrintDialogProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [documentData, setDocumentData] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCompany = localStorage.getItem('selected_company');
    if (savedCompany) setCompanyName(savedCompany);
  }, []);

  if (!isOpen) return null;

  const label = documentLabel || documentType;

  const handlePrint = async () => {
    setLoading(true);
    try {
      // Fetch document data based on type
      let apiUrl = '';
      switch (documentType) {
        case 'Sales Order':
          apiUrl = `/api/sales/orders/${encodeURIComponent(documentName)}`;
          break;
        case 'Delivery Note':
          apiUrl = `/api/sales/delivery-notes/${encodeURIComponent(documentName)}`;
          break;
        case 'Sales Invoice':
          apiUrl = `/api/sales/invoices/${encodeURIComponent(documentName)}`;
          break;
        case 'Purchase Order':
          apiUrl = `/api/purchase/orders/${encodeURIComponent(documentName)}`;
          break;
        case 'Purchase Receipt':
          apiUrl = `/api/purchase/receipts/${encodeURIComponent(documentName)}`;
          break;
        case 'Purchase Invoice':
          apiUrl = `/api/purchase/invoices/${encodeURIComponent(documentName)}`;
          break;
        default:
          console.error('Unknown document type:', documentType);
          onClose();
          return;
      }

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.success && result.data) {
        setDocumentData(result.data);
        setShowPreview(true);
      } else {
        console.error('Failed to fetch document data:', result);
        onClose();
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const renderPrintComponent = () => {
    if (!documentData) return null;

    switch (documentType) {
      case 'Sales Order':
        return (
          <SalesOrderPrint
            data={documentData}
            companyName={companyName}
          />
        );
      case 'Delivery Note':
        return (
          <DeliveryNotePrint
            data={documentData}
            companyName={companyName}
          />
        );
      case 'Sales Invoice':
        return (
          <SalesInvoicePrint
            data={documentData}
            companyName={companyName}
          />
        );
      case 'Purchase Order':
        return (
          <PurchaseOrderPrint
            data={documentData}
            companyName={companyName}
          />
        );
      case 'Purchase Receipt':
        return (
          <PurchaseReceiptPrint
            data={documentData}
            companyName={companyName}
          />
        );
      case 'Purchase Invoice':
        return (
          <PurchaseInvoicePrint
            data={documentData}
            companyName={companyName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Confirmation Dialog */}
      {!showPreview && (
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
              <button
                onClick={handlePrint}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Memuat...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Cetak Dokumen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPreview && documentData && (
        <PrintPreviewModal
          title={`${label} - ${documentName}`}
          onClose={() => {
            setShowPreview(false);
            setDocumentData(null);
            onClose();
          }}
          paperMode="continuous"
        >
          {renderPrintComponent()}
        </PrintPreviewModal>
      )}
    </>
  );
}
