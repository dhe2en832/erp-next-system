'use client';

import React from 'react';

export interface PrintColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  format?: (val: any, row: any) => string;
}

export interface PrintSignature {
  label: string;
}

export interface PrintItem {
  no?: number;
  item_code: string;
  item_name: string;
  qty: number;
  uom?: string;
  rate?: number;
  discount_percentage?: number;
  amount?: number;
  [key: string]: any;
}

interface PrintLayoutProps {
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  partyLabel: string;
  partyName: string;
  partyAddress?: string;
  items: PrintItem[];
  columns?: PrintColumn[];
  showPrice?: boolean;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
  salesPerson?: string;
  referenceDoc?: string;
  referenceLabel?: string;
  status?: string;
  watermark?: string;
  copyLabel?: string;
  extraFields?: { label: string; value: string }[];
  metaLeft?: { label: string; value: string }[];
  metaRight?: { label: string; value: string }[];
  signatures?: PrintSignature[];
  terbilang?: string;
  footerNote?: string;
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

function fmtIDR(n: number) {
  return (n || 0).toLocaleString('id-ID');
}

const DEFAULT_COLUMNS: PrintColumn[] = [
  { key: 'no', label: 'No', width: '28px', align: 'center' },
  { key: 'item_code', label: 'Kode', width: '80px' },
  { key: 'item_name', label: 'Nama Barang' },
  { key: 'qty', label: 'Qty', width: '45px', align: 'right' },
  { key: 'uom', label: 'Sat', width: '35px' },
  { key: 'rate', label: 'Harga', width: '85px', align: 'right', format: (v) => fmtIDR(v) },
  { key: 'amount', label: 'Jumlah', width: '90px', align: 'right', format: (v) => fmtIDR(v) },
];

const MAX_ROWS = 10;

const CSS = `
@page {
  size: 21.5cm 14cm;
  margin: 0.4cm 0.5cm;
}
@media print {
  html, body { width: 21.5cm; height: 14cm; margin: 0; padding: 0; }
  .no-print { display: none !important; }
  body { background: #fff !important; }
}
@media screen {
  body { background: #e5e7eb; }
}
.print-wrapper {
  font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 10px;
  line-height: 1.35;
  color: #111;
  width: 21.5cm;
  height: 14cm;
  box-sizing: border-box;
  overflow: hidden;
  background: #fff;
  padding: 0.4cm 0.5cm;
  position: relative;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}
.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #1e293b;
  padding-bottom: 5px;
  margin-bottom: 5px;
  flex-shrink: 0;
}
.company-name { font-size: 13px; font-weight: 700; color: #1e293b; letter-spacing: 0.3px; }
.company-sub { font-size: 8.5px; color: #475569; margin-top: 1px; }
.doc-title-block { text-align: right; }
.doc-title { font-size: 14px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; }
.doc-meta-line { font-size: 9px; color: #374151; margin-top: 1px; }
.doc-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 4px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.meta-row { display: flex; gap: 4px; font-size: 9px; line-height: 1.5; }
.meta-label { color: #64748b; white-space: nowrap; min-width: 70px; }
.meta-value { color: #111; font-weight: 600; }
.table-container { flex: 1; overflow: hidden; margin-bottom: 4px; }
.items-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.items-table thead tr { background: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
.items-table th { padding: 3px 4px; font-weight: 700; color: #334155; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
.items-table td { padding: 2px 4px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
.items-table tbody tr:nth-child(even) td { background: #f8fafc; }
.hidden-rows-note { font-size: 8px; color: #64748b; font-style: italic; padding: 1px 4px; }
.doc-footer {
  flex-shrink: 0;
  border-top: 1px solid #cbd5e1;
  padding-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.footer-left { flex: 1; font-size: 8.5px; color: #374151; }
.footer-right { min-width: 160px; font-size: 9px; }
.total-row { display: flex; justify-content: space-between; padding: 1px 0; }
.total-row.grand { font-weight: 700; font-size: 10px; border-top: 1px solid #334155; margin-top: 2px; padding-top: 2px; }
.terbilang-text { font-size: 8px; font-style: italic; color: #475569; margin-top: 2px; }
.signatures { display: flex; justify-content: space-between; margin-top: 4px; gap: 8px; }
.sig-box { flex: 1; text-align: center; font-size: 8.5px; color: #374151; }
.sig-line { border-bottom: 1px solid #334155; height: 28px; margin-bottom: 2px; }
.watermark {
  position: absolute; top: 45%; left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 52px; font-weight: 900;
  color: rgba(180,180,180,0.18);
  pointer-events: none; z-index: 0; white-space: nowrap;
}
.no-print { display: none !important; }
.btn-print { padding: 6px 20px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; }
.btn-back { padding: 6px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
`;

export default function PrintLayout({
  documentTitle,
  documentNumber,
  documentDate,
  companyName,
  companyAddress,
  companyPhone,
  partyLabel,
  partyName,
  partyAddress,
  items,
  columns,
  showPrice = true,
  subtotal,
  taxAmount,
  totalAmount,
  notes,
  salesPerson,
  referenceDoc,
  referenceLabel,
  status,
  watermark,
  copyLabel,
  extraFields,
  metaLeft,
  metaRight,
  signatures,
  terbilang,
  footerNote,
}: PrintLayoutProps) {
  const cols = columns || DEFAULT_COLUMNS;
  const displayItems = items.slice(0, MAX_ROWS);
  const hiddenCount = items.length - displayItems.length;
  const computedTerbilang = terbilang || (totalAmount ? getTerbilang(totalAmount) : '');

  const defaultSigs: PrintSignature[] = [
    { label: 'Dibuat oleh' },
    { label: 'Disetujui oleh' },
    { label: 'Diterima oleh' },
  ];
  const sigs = signatures || defaultSigs;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="no-print">
        <button className="btn-print" onClick={() => window.print()}>Cetak Dokumen</button>
        <button className="btn-back" onClick={() => window.history.back()}>Kembali</button>
        {copyLabel && <span style={{ padding: '6px 12px', background: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{copyLabel}</span>}
      </div>

      <div className="print-wrapper">
        {watermark && <div className="watermark">{watermark}</div>}

        {/* ZONE 1: HEADER */}
        <div className="doc-header">
          <div>
            <div className="company-name">{companyName || 'Perusahaan'}</div>
            {companyAddress && <div className="company-sub">{companyAddress}</div>}
            {companyPhone && <div className="company-sub">Telp: {companyPhone}</div>}
          </div>
          <div className="doc-title-block">
            <div className="doc-title">{documentTitle}</div>
            <div className="doc-meta-line">No: <strong>{documentNumber}</strong></div>
            <div className="doc-meta-line">Tanggal: <strong>{documentDate}</strong></div>
            {status && <div className="doc-meta-line">Status: <strong>{status}</strong></div>}
          </div>
        </div>

        {/* ZONE 2: META INFO */}
        <div className="doc-meta">
          <div>
            <div className="meta-row">
              <span className="meta-label">{partyLabel}</span>
              <span className="meta-value">{partyName || '-'}</span>
            </div>
            {partyAddress && (
              <div className="meta-row">
                <span className="meta-label">Alamat</span>
                <span className="meta-value">{partyAddress}</span>
              </div>
            )}
            {metaLeft?.map((f, i) => (
              <div key={i} className="meta-row">
                <span className="meta-label">{f.label}</span>
                <span className="meta-value">{f.value || '-'}</span>
              </div>
            ))}
          </div>
          <div>
            {referenceDoc && (
              <div className="meta-row">
                <span className="meta-label">{referenceLabel || 'Ref'}</span>
                <span className="meta-value">{referenceDoc}</span>
              </div>
            )}
            {salesPerson && (
              <div className="meta-row">
                <span className="meta-label">Sales</span>
                <span className="meta-value">{salesPerson}</span>
              </div>
            )}
            {extraFields?.map((f, i) => (
              <div key={i} className="meta-row">
                <span className="meta-label">{f.label}</span>
                <span className="meta-value">{f.value || '-'}</span>
              </div>
            ))}
            {metaRight?.map((f, i) => (
              <div key={i} className="meta-row">
                <span className="meta-label">{f.label}</span>
                <span className="meta-value">{f.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE 3: ITEMS TABLE */}
        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                {cols.map((col, i) => (
                  <th key={i} style={{ textAlign: col.align || 'left', width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx}>
                  {cols.map((col, ci) => {
                    let val: any;
                    if (col.key === 'no') val = idx + 1;
                    else val = item[col.key];
                    const display = col.format ? col.format(val, item) : (val ?? '-');
                    return (
                      <td key={ci} style={{ textAlign: col.align || 'left' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {hiddenCount > 0 && (
            <div className="hidden-rows-note">... dan {hiddenCount} item lainnya (tidak ditampilkan)</div>
          )}
        </div>

        {/* ZONE 4: FOOTER */}
        <div className="doc-footer">
          <div className="footer-left">
            {notes && <div><strong>Catatan:</strong> {notes}</div>}
            {footerNote && <div style={{ marginTop: '2px', color: '#dc2626', fontWeight: 700 }}>{footerNote}</div>}
            {computedTerbilang && showPrice && (
              <div className="terbilang-text"><em>Terbilang: {computedTerbilang}</em></div>
            )}
            <div className="signatures">
              {sigs.map((sig, i) => (
                <div key={i} className="sig-box">
                  <div className="sig-line"></div>
                  <div>{sig.label}</div>
                </div>
              ))}
            </div>
          </div>
          {showPrice && (
            <div className="footer-right">
              {subtotal !== undefined && (
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>Rp {fmtIDR(subtotal)}</span>
                </div>
              )}
              {taxAmount !== undefined && (
                <div className="total-row">
                  <span>PPN</span>
                  <span>Rp {fmtIDR(taxAmount)}</span>
                </div>
              )}
              {totalAmount !== undefined && (
                <div className="total-row grand">
                  <span>TOTAL</span>
                  <span>Rp {fmtIDR(totalAmount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
