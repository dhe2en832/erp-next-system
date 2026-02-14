'use client';

import React from 'react';

interface PrintItem {
  no?: number;
  item_code: string;
  item_name: string;
  qty: number;
  uom?: string;
  rate?: number;
  amount?: number;
}

interface PrintLayoutProps {
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  companyName?: string;
  companyAddress?: string;
  partyLabel: string;
  partyName: string;
  partyAddress?: string;
  items: PrintItem[];
  showPrice?: boolean;
  totalAmount?: number;
  notes?: string;
  salesPerson?: string;
  referenceDoc?: string;
  referenceLabel?: string;
  status?: string;
  watermark?: string;
  copyLabel?: string;
  extraFields?: { label: string; value: string }[];
  terbilang?: string;
}

function numberToTerbilang(n: number): string {
  if (n === 0) return 'nol';
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  if (n < 12) return satuan[n];
  if (n < 20) return satuan[n - 10] + ' belas';
  if (n < 100) return satuan[Math.floor(n / 10)] + ' puluh' + (n % 10 > 0 ? ' ' + satuan[n % 10] : '');
  if (n < 200) return 'seratus' + (n % 100 > 0 ? ' ' + numberToTerbilang(n % 100) : '');
  if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus' + (n % 100 > 0 ? ' ' + numberToTerbilang(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 > 0 ? ' ' + numberToTerbilang(n % 1000) : '');
  if (n < 1000000) return numberToTerbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 > 0 ? ' ' + numberToTerbilang(n % 1000) : '');
  if (n < 1000000000) return numberToTerbilang(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 > 0 ? ' ' + numberToTerbilang(n % 1000000) : '');
  if (n < 1000000000000) return numberToTerbilang(Math.floor(n / 1000000000)) + ' milyar' + (n % 1000000000 > 0 ? ' ' + numberToTerbilang(n % 1000000000) : '');
  return numberToTerbilang(Math.floor(n / 1000000000000)) + ' triliun' + (n % 1000000000000 > 0 ? ' ' + numberToTerbilang(n % 1000000000000) : '');
}

export function getTerbilang(amount: number): string {
  const rounded = Math.round(amount);
  return numberToTerbilang(rounded).replace(/\s+/g, ' ').trim() + ' rupiah';
}

export default function PrintLayout({
  documentTitle,
  documentNumber,
  documentDate,
  companyName,
  companyAddress,
  partyLabel,
  partyName,
  partyAddress,
  items,
  showPrice = true,
  totalAmount,
  notes,
  salesPerson,
  referenceDoc,
  referenceLabel,
  status,
  watermark,
  copyLabel,
  extraFields,
  terbilang,
}: PrintLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  const computedTerbilang = terbilang || (totalAmount ? getTerbilang(totalAmount) : '');

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: 21.5cm 14cm;
            margin: 0.5cm;
          }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-layout { 
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            line-height: 1.3;
            color: #000;
          }
        }
      `}</style>

      <div className="no-print flex justify-center gap-3 py-4 bg-gray-100 sticky top-0 z-50">
        <button onClick={handlePrint} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          🖨️ Cetak
        </button>
        <button onClick={() => window.history.back()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
          Kembali
        </button>
        {copyLabel && <span className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">{copyLabel}</span>}
      </div>

      <div className="print-layout mx-auto bg-white" style={{ width: '21.5cm', minHeight: '14cm', padding: '0.5cm', fontFamily: "'Courier New', Courier, monospace", fontSize: '10px', position: 'relative' }}>
        
        {watermark && (
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '48px', fontWeight: 'bold', color: 'rgba(200,200,200,0.3)', zIndex: 0, pointerEvents: 'none' }}>
            {watermark}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{companyName || 'Perusahaan'}</div>
            {companyAddress && <div style={{ fontSize: '9px' }}>{companyAddress}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{documentTitle}</div>
            <div>No: {documentNumber}</div>
            <div>Tgl: {documentDate}</div>
          </div>
        </div>

        {/* Party Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
          <div>
            <div><strong>{partyLabel}:</strong> {partyName}</div>
            {partyAddress && <div style={{ fontSize: '9px' }}>{partyAddress}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {referenceDoc && <div><strong>{referenceLabel || 'Ref'}:</strong> {referenceDoc}</div>}
            {salesPerson && <div><strong>Sales:</strong> {salesPerson}</div>}
            {status && <div><strong>Status:</strong> {status}</div>}
            {extraFields?.map((f, i) => <div key={i}><strong>{f.label}:</strong> {f.value}</div>)}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '2px 4px', width: '30px' }}>No</th>
              <th style={{ textAlign: 'left', padding: '2px 4px' }}>Kode</th>
              <th style={{ textAlign: 'left', padding: '2px 4px' }}>Nama Barang</th>
              <th style={{ textAlign: 'right', padding: '2px 4px', width: '50px' }}>Qty</th>
              <th style={{ textAlign: 'left', padding: '2px 4px', width: '40px' }}>Sat</th>
              {showPrice && <th style={{ textAlign: 'right', padding: '2px 4px', width: '80px' }}>Harga</th>}
              {showPrice && <th style={{ textAlign: 'right', padding: '2px 4px', width: '90px' }}>Jumlah</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                <td style={{ padding: '1px 4px' }}>{idx + 1}</td>
                <td style={{ padding: '1px 4px' }}>{item.item_code}</td>
                <td style={{ padding: '1px 4px' }}>{item.item_name}</td>
                <td style={{ padding: '1px 4px', textAlign: 'right' }}>{item.qty}</td>
                <td style={{ padding: '1px 4px' }}>{item.uom || 'Nos'}</td>
                {showPrice && <td style={{ padding: '1px 4px', textAlign: 'right' }}>{(item.rate || 0).toLocaleString('id-ID')}</td>}
                {showPrice && <td style={{ padding: '1px 4px', textAlign: 'right' }}>{(item.amount || 0).toLocaleString('id-ID')}</td>}
              </tr>
            ))}
          </tbody>
          {showPrice && totalAmount !== undefined && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #000' }}>
                <td colSpan={showPrice ? 6 : 5} style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>TOTAL:</td>
                <td style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{totalAmount.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Terbilang */}
        {showPrice && computedTerbilang && (
          <div style={{ marginBottom: '4px', fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
            <strong>Terbilang:</strong> {computedTerbilang}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            <strong>Catatan:</strong> {notes}
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '2px' }}></div>
            <div>Dibuat oleh</div>
          </div>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '2px' }}></div>
            <div>Disetujui oleh</div>
          </div>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '2px' }}></div>
            <div>Diterima oleh</div>
          </div>
        </div>
      </div>
    </>
  );
}
