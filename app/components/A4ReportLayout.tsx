'use client';

import React from 'react';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  format?: (val: any, row: any) => React.ReactNode;
  highlight?: (val: any, row: any) => string;
}

export interface ReportSummaryCard {
  label: string;
  value: string | number;
  color?: string;
}

interface A4ReportLayoutProps {
  reportTitle: string;
  reportSubtitle?: string;
  companyName?: string;
  periodLabel?: string;
  columns: ReportColumn[];
  data: any[];
  summaryCards?: ReportSummaryCard[];
  footerTotals?: { label: string; value: string }[];
  terbilang?: string;
  printedBy?: string;
  children?: React.ReactNode;
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

export function fmtIDR(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID');
}

export function fmtDate(d: string) {
  if (!d) return '-';
  const parts = d.split('-');
  if (parts.length === 3) {
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  return d;
}

const CSS = `
@page { size: A4; margin: 15mm; }
@media print {
  html, body { width: 210mm; margin: 0; padding: 0; }
  .no-print { display: none !important; }
  body { background: #fff !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
}
@media screen {
  body { background: #e5e7eb; }
  .report-wrapper { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
}
* { box-sizing: border-box; }
.report-wrapper {
  font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: #111;
  width: 210mm;
  background: #fff;
  padding: 0;
  margin: 0 auto;
}
.report-header {
  border-bottom: 3px solid #1e293b;
  padding: 16px 20px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.company-block .company-name { font-size: 16px; font-weight: 800; color: #1e293b; }
.company-block .company-sub { font-size: 10px; color: #475569; margin-top: 2px; }
.title-block { text-align: right; }
.title-block .report-title { font-size: 18px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; }
.title-block .report-period { font-size: 11px; color: #475569; margin-top: 3px; }
.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.summary-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}
.summary-card .card-label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
.summary-card .card-value { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
.table-section { padding: 0 20px; }
.report-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
.report-table thead tr { background: #1e293b; color: #fff; }
.report-table th { padding: 6px 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #334155; }
.report-table td { padding: 4px 6px; border: 1px solid #e2e8f0; color: #1e293b; }
.report-table tbody tr:nth-child(even) td { background: #f8fafc; }
.report-table tbody tr:hover td { background: #f1f5f9; }
.report-table tfoot tr td { background: #f1f5f9; font-weight: 700; border-top: 2px solid #334155; }
.report-footer {
  padding: 12px 20px;
  border-top: 2px solid #e2e8f0;
  margin-top: 8px;
}
.footer-totals { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.footer-total-row { display: flex; gap: 16px; font-size: 11px; }
.footer-total-row.grand { font-weight: 700; font-size: 13px; border-top: 1px solid #334155; padding-top: 4px; margin-top: 2px; }
.terbilang-section { font-size: 10px; font-style: italic; color: #475569; margin-top: 6px; padding: 6px 10px; background: #f8fafc; border-left: 3px solid #94a3b8; }
.print-info { font-size: 9px; color: #94a3b8; margin-top: 8px; }
.no-print {
  display: flex; justify-content: center; gap: 10px;
  padding: 10px; background: #f3f4f6;
  position: sticky; top: 0; z-index: 100;
}
.btn-print { padding: 6px 20px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; }
.btn-back { padding: 6px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
.overdue-cell { color: #dc2626 !important; font-weight: 600; }
.section-divider { font-size: 11px; font-weight: 700; background: #e2e8f0; padding: 5px 6px; border: 1px solid #cbd5e1; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
`;

export default function A4ReportLayout({
  reportTitle,
  reportSubtitle,
  companyName,
  periodLabel,
  columns,
  data,
  summaryCards,
  footerTotals,
  terbilang,
  printedBy,
  children,
}: A4ReportLayoutProps) {
  const now = new Date().toLocaleString('id-ID');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="no-print">
        <button className="btn-print" onClick={() => window.print()}>Cetak Laporan</button>
        <button className="btn-back" onClick={() => window.history.back()}>Kembali</button>
      </div>

      <div className="report-wrapper">
        {/* HEADER */}
        <div className="report-header">
          <div className="company-block">
            <div className="company-name">{companyName || 'Perusahaan'}</div>
            {reportSubtitle && <div className="company-sub">{reportSubtitle}</div>}
          </div>
          <div className="title-block">
            <div className="report-title">{reportTitle}</div>
            {periodLabel && <div className="report-period">{periodLabel}</div>}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        {summaryCards && summaryCards.length > 0 && (
          <div className="summary-section">
            {summaryCards.map((card, i) => (
              <div key={i} className="summary-card">
                <div className="card-label">{card.label}</div>
                <div className="card-value" style={card.color ? { color: card.color } : {}}>
                  {typeof card.value === 'number' ? card.value.toLocaleString('id-ID') : card.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOM CHILDREN (for special layouts like cashflow sections) */}
        {children ? (
          <div className="table-section">{children}</div>
        ) : (
          /* MAIN TABLE */
          <div className="table-section">
            <table className="report-table">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} style={{ textAlign: col.align || 'left', width: col.width }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  data.map((row, ri) => (
                    <tr key={ri}>
                      {columns.map((col, ci) => {
                        const val = row[col.key];
                        const display = col.format ? col.format(val, row) : (val ?? '-');
                        const cls = col.highlight ? col.highlight(val, row) : '';
                        return (
                          <td key={ci} style={{ textAlign: col.align || 'left' }} className={cls}>
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {footerTotals && footerTotals.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={columns.length - footerTotals.length} style={{ textAlign: 'right', fontWeight: 700 }}>
                      TOTAL
                    </td>
                    {footerTotals.map((ft, i) => (
                      <td key={i} style={{ textAlign: 'right', fontWeight: 700 }}>{ft.value}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* FOOTER */}
        <div className="report-footer">
          {footerTotals && footerTotals.length > 0 && !children && (
            <div className="footer-totals">
              {footerTotals.map((ft, i) => (
                <div key={i} className={`footer-total-row${i === footerTotals.length - 1 ? ' grand' : ''}`}>
                  <span style={{ minWidth: '120px' }}>{ft.label}</span>
                  <span>{ft.value}</span>
                </div>
              ))}
            </div>
          )}
          {terbilang && (
            <div className="terbilang-section">
              <strong>Terbilang:</strong> {terbilang}
            </div>
          )}
          <div className="print-info">
            Dicetak: {now}{printedBy ? ` oleh ${printedBy}` : ''}
          </div>
        </div>
      </div>
    </>
  );
}
