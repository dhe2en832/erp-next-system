'use client';

import React from 'react';

export interface PrintColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface PrintSignature {
  label: string;
  name?: string;
}

interface MetaItem {
  label: string;
  value: string;
}

interface PrintLayoutProps {
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  companyName: string;
  partyLabel: string;
  partyName: string;
  items: Record<string, any>[];
  columns: PrintColumn[];
  showPrice: boolean;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  terbilang?: string;
  notes?: string;
  referenceDoc?: string;
  referenceLabel?: string;
  salesPerson?: string;
  metaRight?: MetaItem[];
  signatures?: PrintSignature[];
  status?: string;
}

function statusBadgeStyle(status?: string): React.CSSProperties {
  const map: Record<string, string> = {
    Submitted: '#16a34a',
    Draft: '#ca8a04',
    Cancelled: '#dc2626',
    'To Deliver': '#2563eb',
    'To Bill': '#7c3aed',
    Paid: '#16a34a',
    Unpaid: '#dc2626',
    'Partly Paid': '#ea580c',
    Completed: '#16a34a',
    Closed: '#6b7280',
  };
  return {
    display: 'inline-block',
    padding: '1px 7px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 700,
    color: '#fff',
    background: status ? (map[status] || '#6b7280') : '#6b7280',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };
}

export default function PrintLayout({
  documentTitle,
  documentNumber,
  documentDate,
  companyName,
  partyLabel,
  partyName,
  items,
  columns,
  showPrice,
  subtotal,
  taxAmount,
  totalAmount,
  terbilang,
  notes,
  referenceDoc,
  referenceLabel,
  salesPerson,
  metaRight,
  signatures,
  status,
}: PrintLayoutProps) {
  const hasFooterTotals = showPrice && totalAmount !== undefined;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .print-page {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          color: #111;
          background: #fff;
          max-width: 794px;
          margin: 0 auto;
          padding: 14px 20px 16px;
          box-sizing: border-box;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #111;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .print-company {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .print-title-block {
          text-align: right;
        }
        .print-title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .print-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          gap: 16px;
        }
        .print-meta-left, .print-meta-right {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .print-meta-row {
          display: flex;
          gap: 4px;
          font-size: 10px;
        }
        .print-meta-label {
          color: #555;
          min-width: 90px;
        }
        .print-meta-value {
          font-weight: 600;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 10px;
        }
        .print-table th {
          background: #1e293b;
          color: #fff;
          padding: 4px 5px;
          font-weight: 600;
          border: 1px solid #334155;
        }
        .print-table td {
          padding: 3px 5px;
          border: 1px solid #d1d5db;
          vertical-align: top;
        }
        .print-table tr:nth-child(even) td {
          background: #f8fafc;
        }
        .print-totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
          margin-bottom: 8px;
        }
        .print-totals-table {
          font-size: 10px;
          border-collapse: collapse;
          min-width: 220px;
        }
        .print-totals-table td {
          padding: 2px 6px;
        }
        .print-totals-table .total-row td {
          font-weight: 700;
          font-size: 11px;
          border-top: 1.5px solid #111;
          padding-top: 4px;
        }
        .print-terbilang {
          font-size: 9px;
          font-style: italic;
          color: #374151;
          margin-bottom: 8px;
          border-left: 3px solid #d1d5db;
          padding-left: 6px;
        }
        .print-notes {
          font-size: 9px;
          color: #374151;
          margin-bottom: 10px;
          white-space: pre-wrap;
        }
        .print-signatures {
          display: flex;
          gap: 0;
          margin-top: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .print-sig-box {
          flex: 1;
          text-align: center;
          border-top: 1px solid #9ca3af;
          padding-top: 4px;
          margin-right: 12px;
          font-size: 9px;
          color: #374151;
        }
        .print-sig-box:last-child { margin-right: 0; }
        .print-sig-space { height: 32px; }
        .print-footer {
          margin-top: 8px;
          border-top: 1px solid #d1d5db;
          padding-top: 4px;
          font-size: 8px;
          color: #9ca3af;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      <div className="print-page">
        {/* Header */}
        <div className="print-header">
          <div>
            <div className="print-company">{companyName}</div>
          </div>
          <div className="print-title-block">
            <div className="print-title">{documentTitle}</div>
            {status && <span style={statusBadgeStyle(status)}>{status}</span>}
          </div>
        </div>

        {/* Meta */}
        <div className="print-meta">
          <div className="print-meta-left">
            <div className="print-meta-row">
              <span className="print-meta-label">No. Dokumen</span>
              <span>:</span>
              <span className="print-meta-value">{documentNumber}</span>
            </div>
            <div className="print-meta-row">
              <span className="print-meta-label">Tanggal</span>
              <span>:</span>
              <span className="print-meta-value">{documentDate}</span>
            </div>
            <div className="print-meta-row">
              <span className="print-meta-label">{partyLabel}</span>
              <span>:</span>
              <span className="print-meta-value">{partyName}</span>
            </div>
            {referenceDoc && (
              <div className="print-meta-row">
                <span className="print-meta-label">{referenceLabel || 'Referensi'}</span>
                <span>:</span>
                <span className="print-meta-value">{referenceDoc}</span>
              </div>
            )}
            {salesPerson && (
              <div className="print-meta-row">
                <span className="print-meta-label">Sales</span>
                <span>:</span>
                <span className="print-meta-value">{salesPerson}</span>
              </div>
            )}
          </div>
          {metaRight && metaRight.length > 0 && (
            <div className="print-meta-right">
              {metaRight.map((m, i) => (
                <div className="print-meta-row" key={i}>
                  <span className="print-meta-label">{m.label}</span>
                  <span>:</span>
                  <span className="print-meta-value">{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="print-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align || 'left', width: col.width }}
                  >
                    {col.format ? col.format(item[col.key]) : (item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        {hasFooterTotals && (
          <div className="print-totals">
            <table className="print-totals-table">
              <tbody>
                {subtotal !== undefined && (
                  <tr>
                    <td style={{ color: '#555' }}>Subtotal</td>
                    <td style={{ textAlign: 'right' }}>
                      Rp {subtotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                )}
                {taxAmount !== undefined && (
                  <tr>
                    <td style={{ color: '#555' }}>Pajak</td>
                    <td style={{ textAlign: 'right' }}>
                      Rp {taxAmount.toLocaleString('id-ID')}
                    </td>
                  </tr>
                )}
                <tr className="total-row">
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>
                    Rp {(totalAmount || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Terbilang */}
        {terbilang && (
          <div className="print-terbilang">
            Terbilang: <em>{terbilang}</em>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="print-notes">
            <strong>Catatan:</strong> {notes}
          </div>
        )}

        {/* Signatures */}
        {signatures && signatures.length > 0 && (
          <div className="print-signatures">
            {signatures.map((sig, i) => (
              <div className="print-sig-box" key={i}>
                <div className="print-sig-space" />
                <div>{sig.label}</div>
                {sig.name && <div style={{ fontWeight: 600 }}>{sig.name}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="print-footer">
          Dicetak oleh sistem &mdash; {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}
